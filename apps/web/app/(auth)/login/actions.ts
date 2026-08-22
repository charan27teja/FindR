"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";

export type LoginState = { email?: string; error?: string; sent?: boolean };

export async function sendOtp(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const register = form.get("mode") === "register";
  const name = String(form.get("name") ?? "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { email, error: "Enter a valid email address." };
  if (register && !name) return { email, error: "Enter your name so desks know who to hand the item to." };

  const supabase = await db();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Only registration may create the account, so signing in with a typo
    // fails loudly instead of silently opening a second empty one.
    options: { shouldCreateUser: register, data: register ? { full_name: name } : undefined },
  });

  if (error) {
    // Supabase phrases "this email has no account" as a signup error.
    const unknown = /signup|not allowed|not found/i.test(error.message);
    return {
      email,
      error: !register && unknown ? "No account found for that email. Create one instead." : error.message,
    };
  }
  return { email, sent: true };
}

/**
 * Where Supabase should send the browser back to.
 *
 * Taken from the request, not from a constant, so testing on a phone over the
 * LAN comes back to the phone rather than to the developer's laptop. `origin`
 * is present on a server action POST; the host header is the fallback for the
 * cases where it is stripped. The hardcoded default is last and is only ever
 * hit if both are missing.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "http");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000";
}

export async function signInWithGoogle(next: string = "/") {
  const supabase = await db();
  const origin = await requestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (data?.url) {
    redirect(data.url);
  }

  if (error) {
    throw new Error(error.message);
  }
}

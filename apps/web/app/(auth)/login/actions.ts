"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

export type LoginState = { email?: string; error?: string; sent?: boolean };

export async function sendOtp(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { email, error: "Enter a valid email address." };

  const supabase = await db();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) return { email, error: error.message };
  return { email, sent: true };
}

export async function verifyOtp(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const token = String(form.get("token") ?? "").trim();
  const next = String(form.get("next") ?? "/") || "/";

  const supabase = await db();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { email, sent: true, error: "That code did not work. Check it and try again." };
  redirect(next);
}

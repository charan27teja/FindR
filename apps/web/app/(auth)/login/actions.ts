"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";

export async function signInWithGoogle(next: string = "/") {
  const supabase = await db();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

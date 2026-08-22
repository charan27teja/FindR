"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";

export async function submitLostItem(formData: FormData) {
  const user = await requireUser();
  const orgId = String(formData.get("org_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!description) {
    redirect(`/search/${orgId}?error=${encodeURIComponent("Please describe what you lost.")}`);
  }

  // For now, store the description and redirect to a confirmation.
  // This will later integrate with the AI vision matching pipeline.
  const supabase = await db();

  // TODO: insert into items table once the schema is finalised.
  // For now, redirect back to the home page with a success state.
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";

/**
 * A SEEKER membership is what RLS checks (INV-4), so joining is a prerequisite
 * for seeing anything at all in an org. PUBLIC and SEMI_PUBLIC orgs open on
 * request; PRIVATE and TEMPORARY need a matching email domain or join code.
 */
export async function joinOrg(form: FormData) {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");
  const code = String(form.get("join_code") ?? "").trim().toUpperCase();
  const intent = String(form.get("intent") ?? "search");
  const back = (msg: string) =>
    redirect(`/orgs?intent=${intent}&error=${encodeURIComponent(msg)}`);

  const supabase = await db();
  const { data: org } = await supabase
    .from("orgs")
    .select("id,type,email_domain,join_code")
    .eq("id", orgId)
    .single();
  if (!org) return back("That organisation no longer exists.");

  const open = org.type === "PUBLIC" || org.type === "SEMI_PUBLIC";
  const domainMatch =
    !!org.email_domain && (user.email ?? "").toLowerCase().endsWith(`@${org.email_domain}`);
  const codeMatch = !!org.join_code && code === org.join_code;

  if (!open && !domainMatch && !codeMatch) {
    return back("That join code did not match. Ask at the desk.");
  }

  const { error } = await supabase
    .from("memberships")
    .insert({ user_id: user.id, org_id: org.id, role: "SEEKER" });
  // A duplicate simply means they already joined.
  if (error && error.code !== "23505") return back(error.message);

  revalidatePath("/orgs");
  redirect(intent === "report" ? `/search/${org.id}?report=1` : `/search/${org.id}`);
}

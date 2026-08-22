import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

export type Role = "SEEKER" | "INTAKE_STAFF" | "VERIFIER" | "ORG_ADMIN" | "PLATFORM_ADMIN";
export const STAFF_ROLES: Role[] = ["INTAKE_STAFF", "VERIFIER", "ORG_ADMIN"];

export async function requireUser() {
  const supabase = await db();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

export async function rolesIn(orgId: string): Promise<Role[]> {
  const user = await requireUser();
  const supabase = await db();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as Role);
}

/** Throws rather than rendering a partial page — authorisation fails closed. */
export async function requireRole(orgId: string, allowed: Role[]): Promise<Role[]> {
  const held = await rolesIn(orgId);
  if (!held.some((r) => allowed.includes(r))) redirect("/");
  return held;
}

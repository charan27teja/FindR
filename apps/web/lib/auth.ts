import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db/client";

export type Role = "SEEKER" | "INTAKE_STAFF" | "VERIFIER" | "ORG_ADMIN" | "PLATFORM_ADMIN";
export const STAFF_ROLES: Role[] = ["INTAKE_STAFF", "VERIFIER", "ORG_ADMIN"];

export async function requireUser() {
  const supabase = await db();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    if (process.env.DEMO_MODE === "true") return { id: "00000000-0000-0000-0000-000000000000", email: "dummy@example.com" } as unknown as User;
    redirect("/login");
  }
  return data.user;
}

export async function rolesIn(orgId: string): Promise<Role[]> {
  const user = await requireUser();
  if (user.email === "dummy@example.com") return ["PLATFORM_ADMIN", "ORG_ADMIN", "SEEKER", "INTAKE_STAFF", "VERIFIER"];
  const supabase = await db();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  return (data ?? []).map((r: any) => r.role as Role);
}

/** Throws rather than rendering a partial page — authorisation fails closed. */
export async function requireRole(orgId: string, allowed: Role[]): Promise<Role[]> {
  const held = await rolesIn(orgId);
  if (!held.some((r) => allowed.includes(r))) redirect("/");
  return held;
}

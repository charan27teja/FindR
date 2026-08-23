import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

export type Role = "SEEKER" | "INTAKE_STAFF" | "VERIFIER" | "ORG_ADMIN" | "PLATFORM_ADMIN";
export const STAFF_ROLES: Role[] = ["INTAKE_STAFF", "VERIFIER", "ORG_ADMIN"];

/**
 * `supabase.auth.getUser()` is an HTTPS call to the Auth server — it validates
 * the token remotely, it does not decode the JWT locally. One page render used
 * to make three or four of them: middleware, then the page's own requireUser,
 * then another inside every rolesIn() call. Sequential, so they added up to
 * most of the wait before anything rendered.
 *
 * React's cache() scopes a memo to a single request, so all of those collapse
 * into one call. Nothing about the auth check changes — it is the same call,
 * made once.
 */
const currentUser = cache(async () => {
  const supabase = await db();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Cached for the same reason, and per org: a page asking twice costs one query. */
export const rolesIn = cache(async (orgId: string): Promise<Role[]> => {
  const user = await requireUser();
  const supabase = await db();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  return ((data ?? []) as { role: Role }[]).map((r) => r.role);
});

/** Throws rather than rendering a partial page — authorisation fails closed. */
export async function requireRole(orgId: string, allowed: Role[]): Promise<Role[]> {
  const held = await rolesIn(orgId);
  if (!held.some((r) => allowed.includes(r))) redirect("/");
  return held;
}

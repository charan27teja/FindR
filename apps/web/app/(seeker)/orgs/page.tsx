import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { joinOrg } from "./actions";
import OrgListClient from "./OrgListClient";

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; q?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { intent = "search", q = "", error } = await searchParams;

  const supabase = await db();
  const [{ data: orgs }, { data: mine }] = await Promise.all([
    supabase
      .from("orgs")
      .select("id,name,slug,type,join_code")
      .order("name")
      .limit(50),
    supabase.from("memberships").select("org_id").eq("user_id", user.id),
  ]);

  const joined = new Set((mine ?? []).map((m: any) => m.org_id));

  const orgList = (orgs ?? []).map((o: any) => ({
    id: o.id as string,
    name: o.name as string,
    slug: o.slug as string,
    type: o.type as string,
    joinCode: o.join_code as string | null,
    isJoined: joined.has(o.id),
  }));

  return (
    <OrgListClient
      orgs={orgList}
      intent={intent}
      initialQuery={q}
      error={error}
    />
  );
}

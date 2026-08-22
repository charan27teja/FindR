import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import OrgListClient from "./OrgListClient";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
};

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; q?: string; error?: string }>;
}) {
  // Called for the side effect: it redirects a signed-out visitor to /login.
  await requireUser();
  const { intent = "search", q = "", error } = await searchParams;

  const supabase = await db();
  const orgColumns = "id,name,slug,type";

  // Matching an event name has to pull in its organisation too — you may know
  // the fest by name without knowing which campus runs it.
  const [{ data: orgsByName }, { data: matchedEvents }] = await Promise.all([
    supabase.from("orgs").select(orgColumns).ilike("name", `%${q}%`).order("name").limit(20),
    q
      ? supabase.from("events").select("id,org_id").ilike("name", `%${q}%`).limit(50)
      : Promise.resolve({ data: [] as { id: string; org_id: string }[] }),
  ]);

  // The demo mock client is untyped, so pin the shape once here.
  const found = new Map<string, OrgRow>();
  for (const o of (orgsByName ?? []) as OrgRow[]) found.set(o.id, o);

  // Two queries and a merge rather than one .or() filter: `q` is user input,
  // and PostgREST's or() takes a comma-separated string a query could break
  // out of. .ilike() and .in() send it as a parameter instead.
  const matchedOrgIds = ((matchedEvents ?? []) as { org_id: string }[]).map((e) => e.org_id);
  const extraOrgIds = [...new Set(matchedOrgIds)].filter((id) => !found.has(id));
  if (extraOrgIds.length) {
    const { data: orgsByEvent } = await supabase.from("orgs").select(orgColumns).in("id", extraOrgIds);
    for (const o of (orgsByEvent ?? []) as OrgRow[]) found.set(o.id, o);
  }
  const orgs = [...found.values()].sort((a, b) => a.name.localeCompare(b.name));

  const orgList = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    type: o.type,
    joinCode: null,
    isJoined: false, // removed in main
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

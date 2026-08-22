import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { joinOrg } from "./actions";
import { eventWhen } from "./[orgId]/when";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  join_code: string | null;
};

type EventRow = {
  id: string;
  org_id: string;
  name: string;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
};

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; q?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { intent = "search", q = "", error } = await searchParams;

  const supabase = await db();
  const orgColumns = "id,name,slug,type,join_code";

  // Matching an event name has to pull in its organisation too — you may know
  // the fest by name without knowing which campus runs it.
  const [{ data: orgsByName }, { data: matchedEvents }, { data: mine }] = await Promise.all([
    supabase.from("orgs").select(orgColumns).ilike("name", `%${q}%`).order("name").limit(20),
    q
      ? supabase.from("events").select("id,org_id").ilike("name", `%${q}%`).limit(50)
      : Promise.resolve({ data: [] as { id: string; org_id: string }[] }),
    supabase.from("memberships").select("org_id").eq("user_id", user.id),
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

  // Every event of every org that surfaced, not just the ones that matched.
  const { data: shownEvents } = orgs.length
    ? await supabase
        .from("events")
        .select("id,org_id,name,event_date,end_date,starts_at,ends_at")
        .in("org_id", orgs.map((o) => o.id))
        .order("event_date")
    : { data: [] as EventRow[] };
  const eventsOf = (orgId: string) => ((shownEvents ?? []) as EventRow[]).filter((e) => e.org_id === orgId);

  const joined = new Set(((mine ?? []) as { org_id: string }[]).map((m) => m.org_id));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-sm text-neutral-500">
        ← Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {intent === "report" ? "Where did you lose it?" : "Where are you looking?"}
      </h1>

      <form className="contents">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search stations, campuses, events"
          className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 outline-none focus:border-foreground"
        />
        <input type="hidden" name="intent" value={intent} />
      </form>
 
      {error && <p className="text-sm text-accent">{error}</p>}
 
      {orgs.length ? (
        <ul className="flex flex-col gap-2">
          {orgs.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-foreground/10 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{o.name}</span>
                {joined.has(o.id) && (
                  <span className="text-xs uppercase tracking-wide text-accent">joined</span>
                )}
              </div>
              {eventsOf(o.id).length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 border-l-2 border-foreground/15 pl-3">
                  {eventsOf(o.id).map((e) => (
                    <li key={e.id}>
                      <Link href={`/orgs/${o.id}/events/${e.id}`} className="block py-1">
                        <span className="block truncate text-sm">{e.name}</span>
                        <span className="block text-xs text-neutral-500">{eventWhen(e)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <form action={joinOrg} className="mt-2 flex gap-2">
                <input type="hidden" name="org_id" value={o.id} />
                <input type="hidden" name="intent" value={intent} />
                {!joined.has(o.id) && o.type !== "PUBLIC" && o.type !== "SEMI_PUBLIC" && (
                  <input
                    name="join_code"
                    placeholder="Join code"
                    className="min-w-0 flex-1 rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm focus:border-foreground"
                  />
                )}
                <button className="ml-auto rounded bg-accent px-4 py-2 text-sm text-background">
                  {joined.has(o.id) ? "Continue" : "Join"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-foreground/20 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing here yet. Organisations appear once their lost-and-found desk signs up.
        </p>
      )}
    </main>
  );
}

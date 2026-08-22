import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { joinOrg } from "./actions";

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
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(20),
    supabase.from("memberships").select("org_id").eq("user_id", user.id),
  ]);

  const joined = new Set((mine ?? []).map((m) => m.org_id));

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
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
        />
        <input type="hidden" name="intent" value={intent} />
      </form>

      {error && <p className="text-sm text-accent">{error}</p>}

      {orgs?.length ? (
        <ul className="flex flex-col gap-2">
          {orgs.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{o.name}</span>
                {joined.has(o.id) && (
                  <span className="text-xs uppercase tracking-wide text-accent">joined</span>
                )}
              </div>
              <form action={joinOrg} className="mt-2 flex gap-2">
                <input type="hidden" name="org_id" value={o.id} />
                <input type="hidden" name="intent" value={intent} />
                {!joined.has(o.id) && o.type !== "PUBLIC" && o.type !== "SEMI_PUBLIC" && (
                  <input
                    name="join_code"
                    placeholder="Join code"
                    className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
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
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Nothing here yet. Organisations appear once their lost-and-found desk signs up.
        </p>
      )}
    </main>
  );
}

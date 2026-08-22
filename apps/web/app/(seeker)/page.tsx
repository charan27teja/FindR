import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const q = (await searchParams).q?.trim() ?? "";

  // §12 — the home search bar searches ORGANISATIONS, not items.
  const supabase = await db();
  const { data: orgs } = q
    ? await supabase.from("orgs").select("id,name,slug,type").ilike("name", `%${q}%`).limit(8)
    : { data: null };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Findr</h1>

      <form className="flex flex-col gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search stations, campuses, events"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
        />
      </form>

      {orgs !== null && (
        <ul className="flex flex-col gap-2">
          {orgs?.length ? (
            orgs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/search/${o.id}`}
                  className="block rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="block text-xs uppercase tracking-wide text-neutral-500">
                    {o.type.toLowerCase().replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
              No organisation matches “{q}”. Ask the desk for their join code.
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/orgs?intent=search"
          className="rounded-xl bg-accent px-5 py-4 text-white"
        >
          <span className="block text-lg font-medium">I lost something</span>
          <span className="block text-sm opacity-80">
            Check if it has already been handed in.
          </span>
        </Link>
        <Link
          href="/orgs?intent=report"
          className="rounded-xl border border-neutral-300 px-5 py-4 dark:border-neutral-700"
        >
          <span className="block text-lg font-medium">Report a lost item</span>
          <span className="block text-sm text-neutral-500">
            Tell us what you lost and we will notify you when it turns up.
          </span>
        </Link>
      </div>
    </main>
  );
}

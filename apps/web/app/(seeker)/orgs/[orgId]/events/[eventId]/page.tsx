import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import EventForm, { type EventDraft } from "../../EventForm";
import { markClaimCollected } from "../../actions";
import { eventWhen } from "../../when";

export default async function EventPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>;
}) {
  const { orgId, eventId } = await params;

  const supabase = await db();
  const [{ data: event, error: eventError }, { data: org }] = await Promise.all([
    supabase
      .from("events")
      .select("id,name,description,event_date,end_date,starts_at,ends_at,capacity,price_inr")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .single(),
    supabase.from("orgs").select("id,name").eq("id", orgId).single(),
  ]);
  // PGRST116 is "no rows matched" — a real 404. Anything else means the query
  // itself failed, most often a column that an unapplied migration was meant to
  // add. Reporting that as "not found" sends you hunting for a missing event
  // instead of a missing migration.
  if (eventError && eventError.code !== "PGRST116") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-6 py-10">
        <Link href={`/orgs/${orgId}`} className="text-sm text-neutral-500">
          ← Back
        </Link>
        <p role="alert" className="rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Could not load this event: {eventError.message}
        </p>
      </main>
    );
  }
  if (!event || !org) notFound();

  // Reached only from the organisation console, which is already admin-only.
  await requireRole(orgId, ["ORG_ADMIN"]);
  const e = event as EventDraft & { price_inr: number };

  // A claim belongs to an item, and an item belongs to an event — so the
  // event's claims are the claims on everything logged at it.
  const { data: eventItems } = await supabase
    .from("items")
    .select("id,short_code,public_description,category,colour")
    .eq("event_id", eventId);
  const items = (eventItems ?? []) as {
    id: string;
    short_code: string;
    public_description: string | null;
    category: string | null;
    colour: string | null;
  }[];
  const itemById = new Map(items.map((i) => [i.id, i]));

  const { data: claimRows } = items.length
    ? await supabase
        .from("claims")
        .select("id,item_id,user_id,status,created_at")
        .in("item_id", items.map((i) => i.id))
        .order("created_at", { ascending: false })
    : { data: [] };
  const claims = (claimRows ?? []) as {
    id: string;
    item_id: string;
    user_id: string;
    status: string;
    created_at: string;
  }[];

  // profiles_claimant_read is what makes this readable, and only for people
  // who have actually claimed something here.
  const claimantIds = [...new Set(claims.map((c) => c.user_id))];
  const { data: profileRows } = claimantIds.length
    ? await supabase.from("profiles").select("id,email,phone").in("id", claimantIds)
    : { data: [] };
  const profileById = new Map(
    ((profileRows ?? []) as { id: string; email: string | null; phone: string | null }[]).map((p) => [
      p.id,
      p,
    ]),
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-16">
      <header className="rise flex items-center gap-3 py-5">
        <Link
          href={`/orgs/${orgId}`}
          aria-label="Back to the organisation"
          className="rounded-full p-2 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{e.name}</h1>
          <p className="truncate text-sm text-neutral-500">{org.name as string}</p>
        </div>
      </header>

      <dl className="rise mb-6 flex flex-col gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800" style={{ animationDelay: "60ms" }}>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">When</dt>
          <dd className="text-right">{eventWhen(e)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Item capacity</dt>
          <dd className="text-right tabular-nums">room for {e.capacity} items</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Paid</dt>
          <dd className="text-right font-mono tabular-nums">{formatInr(e.price_inr)}</dd>
        </div>
      </dl>

      {e.description ? (
        <section className="rise mb-8" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">About</h2>
          {/* whitespace-pre-line so the paragraph breaks an organiser typed survive. */}
          <p className="whitespace-pre-line text-sm">{e.description}</p>
        </section>
      ) : null}

      <section className="rise mb-8" style={{ animationDelay: "150ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Claims{claims.length > 0 ? ` (${claims.length})` : ""}
        </h2>
        {claims.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {claims.map((c) => {
              const item = itemById.get(c.item_id);
              const who = profileById.get(c.user_id);
              const collected = c.status === "COLLECTED";
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border px-4 py-3 ${collected ? "border-neutral-200 opacity-60 dark:border-neutral-800" : "border-neutral-300 dark:border-neutral-700"}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {item?.public_description ?? item?.category ?? "Item"}
                    </span>
                    <span className="shrink-0 font-mono text-xs tracking-wider text-neutral-500">
                      {item?.short_code}
                    </span>
                  </div>
                  <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                    <div className="flex gap-2">
                      <dt>Claimed by</dt>
                      <dd className="text-foreground">{who?.email ?? "Unknown"}</dd>
                    </div>
                    {who?.phone ? (
                      <div className="flex gap-2">
                        <dt>Phone</dt>
                        <dd className="text-foreground">{who.phone}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <dt>Filed</dt>
                      <dd>{new Date(c.created_at).toLocaleString()}</dd>
                    </div>
                  </dl>

                  {collected ? (
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Picked up
                    </p>
                  ) : (
                    <form action={markClaimCollected} className="mt-3">
                      <input type="hidden" name="org_id" value={orgId} />
                      <input type="hidden" name="event_id" value={eventId} />
                      <input type="hidden" name="claim_id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
                      >
                        Mark as picked up
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No claims on this event&rsquo;s items yet.
          </p>
        )}
      </section>

      <section className="rise" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Edit event
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Raising the item capacity buys more room for this event and reprices it.
        </p>
        <EventForm orgId={orgId} event={e} />
      </section>
    </main>
  );
}

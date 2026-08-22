import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import EventForm, { type EventDraft } from "../../EventForm";
import ClaimsSection from "../../ClaimsSection";
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

      <ClaimsSection orgId={orgId} eventId={eventId} />

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

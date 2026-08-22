import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import EventForm from "./EventForm";
import { deleteEvent } from "./actions";
import { eventWhen } from "./when";

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_inr: number;
};

export default async function OrgPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const supabase = await db();
  const { data: org } = await supabase
    .from("orgs")
    .select("id,name,slug,type,location")
    .eq("id", orgId)
    .single();
  if (!org) notFound();

  // This is the organiser's console, not a public profile. Nobody joins an
  // organisation any more, so the only people with a role here are the ones
  // who created it — everyone else is sent home rather than shown a stripped
  // version of a page that is entirely management.
  await requireRole(orgId, ["ORG_ADMIN"]);

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id,name,event_date,end_date,starts_at,ends_at,capacity,price_inr")
    .eq("org_id", orgId)
    .order("event_date");
  const eventList = (events ?? []) as EventRow[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-16">
      <header className="rise flex items-center gap-3 py-5">
        <Link
          href="/"
          aria-label="Back"
          className="rounded-full p-2 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{org.name as string}</h1>
          {org.location ? (
            <p className="truncate text-sm text-neutral-500">{org.location as string}</p>
          ) : null}
        </div>
      </header>

      <section className="rise" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Events</h2>
        {eventList.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {eventList.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 transition-colors duration-150 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <Link href={`/orgs/${orgId}/events/${e.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block text-xs text-neutral-500">
                    {eventWhen(e)} · room for {e.capacity} items
                  </span>
                </Link>
                <span className="shrink-0 font-mono text-sm tabular-nums">{formatInr(e.price_inr)}</span>
                <form action={deleteEvent} className="shrink-0">
                  <input type="hidden" name="org_id" value={orgId} />
                  <input type="hidden" name="event_id" value={e.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${e.name}`}
                    className="rounded-full p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : eventsError ? (
          <p role="alert" className="rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Could not load events: {eventsError.message}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No events yet.
          </p>
        )}
      </section>

      <section className="rise mt-8" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">New event</h2>
        <EventForm orgId={orgId} />
      </section>
    </main>
  );
}

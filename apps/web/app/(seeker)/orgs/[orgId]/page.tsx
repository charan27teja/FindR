import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInr } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import EventForm from "./EventForm";
import ClaimsSection from "./ClaimsSection";
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

  // What people have said they are bringing in but nobody has logged yet.
  const { data: notices } = await supabase
    .from("found_notices")
    .select("id,description,contact,created_at,event_id")
    .eq("org_id", orgId)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(20);
  const noticeList = (notices ?? []) as {
    id: string;
    description: string;
    contact: string | null;
    created_at: string;
  }[];

  // A public venue's desk is open all year and runs no events, so there is
  // nothing to schedule and nothing to list.
  const isPublic = org.type === "PUBLIC";

  const { data: events, error: eventsError } = isPublic
    ? { data: [], error: null }
    : await supabase
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

      {noticeList.length > 0 ? (
        <section className="rise mb-8" style={{ animationDelay: "90ms" }}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Being brought in ({noticeList.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {noticeList.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
              >
                <span className="min-w-0">
                  <span className="block text-sm">{n.description}</span>
                  <span className="block text-xs text-neutral-500">
                    {new Date(n.created_at).toLocaleString()}
                    {n.contact ? ` · ${n.contact}` : ""}
                  </span>
                </span>
                {/* Logging it is the same screen the desk always uses; this is
                    just the shortcut from the notice to that screen. */}
                <Link
                  href={`/search/${orgId}?report=1`}
                  className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700"
                >
                  Log it
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isPublic ? <ClaimsSection orgId={orgId} /> : null}

      {isPublic ? null : (
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
      )}

      {isPublic ? null : (
      <section className="rise mt-8" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">New event</h2>
        <EventForm orgId={orgId} />
      </section>
      )}
    </main>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser, rolesIn, STAFF_ROLES } from "@/lib/auth";
import { eventWhen } from "../../orgs/[orgId]/when";
import DescribeItemClient from "./DescribeItemClient";
import LogFoundItemClient from "./LogFoundItemClient";
import HandInNoticeClient from "./HandInNoticeClient";
import EventPicker from "./EventPicker";

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
};

export default async function SearchOrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ report?: string; event?: string; error?: string }>;
}) {
  await requireUser();
  const { orgId } = await params;
  const { report, event: eventId, error } = await searchParams;
  const isReport = report === "1";

  const supabase = await db();

  // All three were awaited one after another, and none of them needs another's
  // answer — three serial round trips to Supabase where one wall-clock wait
  // does. `events` is fetched even for a public venue, which has none: an
  // unused query running in parallel is cheaper than a round trip taken in
  // series, and `needsEvent` still decides whether the result is used.
  const [
    { data: org, error: orgError },
    { data: place },
    { data: events },
  ] = await Promise.all([
    supabase.from("orgs").select("id,name,slug,type").eq("id", orgId).single(),
    // Asked for separately, and allowed to fail. These columns arrive with a
    // migration; folding them into the query above meant that until it was
    // applied the whole page 404'd for a map it could perfectly well do without.
    supabase.from("orgs").select("location,latitude,longitude").eq("id", orgId).single(),
    supabase
      .from("events")
      .select("id,name,description,event_date,end_date,starts_at,ends_at")
      .eq("org_id", orgId)
      .order("event_date"),
  ]);

  // PGRST116 is "no rows" — a real 404. Anything else is the query failing,
  // and reporting that as a missing organisation sends you looking in
  // completely the wrong place.
  if (orgError && orgError.code !== "PGRST116") {
    return (
      <div className="mx-auto min-h-dvh max-w-md bg-black px-6 py-10 text-white">
        <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-300">
          Could not load this organisation: {orgError.message}
        </p>
      </div>
    );
  }
  if (!org) notFound();

  // A public venue has no event to pick — a station's desk is open all year.
  // Anything else runs events, and which one an item turned up at is the
  // difference between a findable item and a lost one.
  const needsEvent = org.type !== "PUBLIC";
  const eventList = needsEvent ? ((events ?? []) as EventRow[]) : [];

  const chosen = eventId ? eventList.find((e) => e.id === eventId) : undefined;

  // Ask only when there is something to ask: an org with no events scheduled
  // would otherwise be a dead end with an empty list and no way past it.
  if (needsEvent && eventList.length > 0 && !chosen) {
    return (
      <EventPicker
        orgId={org.id as string}
        orgName={org.name as string}
        isReport={isReport}
        events={eventList.map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          when: eventWhen(e),
        }))}
      />
    );
  }

  const chosenEventContext = chosen
    ? {
        id: chosen.id,
        name: chosen.name,
        description: chosen.description,
        when: eventWhen(chosen),
      }
    : null;

  // "I lost something": one box to describe it in, matches listed above it.
  if (!isReport) {
    return (
      <DescribeItemClient
        orgId={org.id as string}
        orgName={org.name as string}
        event={chosenEventContext}
        isReport={false}
        error={error}
      />
    );
  }

  // "Report a lost item" means one you have found. Who you are decides what
  // happens next: the desk logs it, everyone else carries it to the desk.
  const isStaff = (await rolesIn(orgId)).some((r) => STAFF_ROLES.includes(r));

  return isStaff ? (
    <LogFoundItemClient
      orgId={org.id as string}
      orgName={org.name as string}
      event={chosenEventContext}
      error={error}
    />
  ) : (
    <HandInNoticeClient
      orgId={org.id as string}
      orgName={org.name as string}
      orgType={org.type as string}
      address={(place?.location as string | null) ?? null}
      latitude={(place?.latitude as number | null) ?? null}
      longitude={(place?.longitude as number | null) ?? null}
      event={chosenEventContext}
    />
  );
}

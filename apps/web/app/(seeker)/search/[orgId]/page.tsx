import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { eventWhen } from "../../orgs/[orgId]/when";
import DescribeItemClient from "./DescribeItemClient";
import ReportItemClient from "./ReportItemClient";
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
  const { data: org } = await supabase
    .from("orgs")
    .select("id,name,slug,type")
    .eq("id", orgId)
    .single();
  if (!org) notFound();

  // A public venue has no event to pick — a station's desk is open all year.
  // Anything else runs events, and which one an item turned up at is the
  // difference between a findable item and a lost one.
  const needsEvent = org.type !== "PUBLIC";

  const { data: events } = needsEvent
    ? await supabase
        .from("events")
        .select("id,name,description,event_date,end_date,starts_at,ends_at")
        .eq("org_id", orgId)
        .order("event_date")
    : { data: [] as EventRow[] };
  const eventList = (events ?? []) as EventRow[];

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

  return (
    <ReportItemClient
      orgId={org.id as string}
      orgName={org.name as string}
      event={chosenEventContext}
      error={error}
    />
  );
}

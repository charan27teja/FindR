"use server";

import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { transcribeSpeech } from "@/lib/ai/vision";
import { nearbyPlaces } from "@/lib/nearby";
import type { ClaimNotice } from "@/components/ClaimsBell";

/**
 * Claims the signed-in person has to act on.
 *
 * The queue is "claims at organisations you run", scoped by your own staff
 * memberships. RLS already returns two overlapping sets — claims_verifier
 * gives you every claim in an org you staff, claims_own gives you your own
 * anywhere — so the org filter is what separates work to do from a claim you
 * happen to have filed at someone else's desk.
 *
 * It deliberately does NOT exclude claims you filed yourself. Someone still
 * has to hand that item over, and at a one-person organisation excluding them
 * emptied the queue entirely.
 *
 * Called on the server for the first render and by the bell's poll after that,
 * so both go through exactly the same query.
 */
export async function fetchClaimNotices(): Promise<ClaimNotice[]> {
  const user = await requireUser();
  const supabase = await db();

  // Which organisations is this person actually on the desk for?
  const { data: staffRows } = await supabase
    .from("memberships")
    .select("org_id,role")
    .eq("user_id", user.id)
    .in("role", ["ORG_ADMIN", "VERIFIER", "INTAKE_STAFF"]);
  const staffOrgIds = [
    ...new Set(((staffRows ?? []) as { org_id: string }[]).map((m) => m.org_id)),
  ];
  if (staffOrgIds.length === 0) return [];

  const { data: claimRows } = await supabase
    .from("claims")
    .select("id,item_id,org_id,user_id,status,created_at")
    .in("org_id", staffOrgIds)
    .neq("status", "COLLECTED")
    .neq("status", "REJECTED")
    .order("created_at", { ascending: false })
    .limit(20);

  const openClaims = (claimRows ?? []) as {
    id: string;
    item_id: string;
    org_id: string;
    created_at: string;
  }[];
  if (openClaims.length === 0) return [];

  const [{ data: claimItems }, { data: claimOrgs }] = await Promise.all([
    supabase
      .from("items")
      .select("id,short_code,public_description,category,event_id")
      .in("id", openClaims.map((c) => c.item_id)),
    supabase.from("orgs").select("id,name").in("id", [...new Set(openClaims.map((c) => c.org_id))]),
  ]);

  const itemById = new Map(
    ((claimItems ?? []) as Record<string, string | null>[]).map((i) => [String(i.id), i]),
  );
  const orgNameById = new Map(
    ((claimOrgs ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]),
  );

  const eventIds = [
    ...new Set(
      [...itemById.values()].map((i) => i?.event_id).filter((id): id is string => !!id),
    ),
  ];
  const { data: eventRows } = eventIds.length
    ? await supabase.from("events").select("id,name").in("id", eventIds)
    : { data: [] };
  const eventNameById = new Map(
    ((eventRows ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]),
  );

  return openClaims.map((c) => {
    const item = itemById.get(c.item_id);
    const eventId = item?.event_id ?? null;
    return {
      id: c.id,
      itemLabel: item?.public_description ?? item?.category ?? "Item",
      shortCode: item?.short_code ?? "",
      orgName: orgNameById.get(c.org_id) ?? "",
      eventName: eventId ? eventNameById.get(eventId) ?? null : null,
      // An item logged at a public venue has no event, so the org console is
      // the closest place that can act on it.
      href: eventId ? `/orgs/${c.org_id}/events/${eventId}` : `/orgs/${c.org_id}`,
      createdAt: c.created_at,
    };
  });
}

/** Used only when the browser's own speech recognition cannot reach its service. */
export async function transcribeVoiceSearch(audioB64: string): Promise<{ text?: string; error?: string }> {
  await requireUser();
  if (!audioB64) return { error: "No audio was recorded." };

  const text = await transcribeSpeech(audioB64, "audio/wav");
  return text ? { text } : { error: "Could not make out any speech." };
}

/**
 * Public venues around the seeker, discovering the city's own if we have never
 * seen it before. Sign-in gated: the discovery path hits two external APIs, and
 * an open endpoint would let anyone drive that traffic.
 */
export async function fetchNearbyPlaces(latitude: number, longitude: number) {
  await requireUser();
  return nearbyPlaces(latitude, longitude);
}

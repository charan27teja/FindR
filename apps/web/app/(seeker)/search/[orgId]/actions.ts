"use server";

import { redirect } from "next/navigation";
import { FoundItemFields } from "@findr/shared";
import { db } from "@/lib/db/client";
import { serviceDb, SIGNED_URL_TTL_SECONDS } from "@/lib/db/service";
import { requireUser, rolesIn, STAFF_ROLES } from "@/lib/auth";
import { extractFoundItem, type FoundItemDraft } from "@/lib/ai/vision";
import { assertNoPrivateFields, serialiseItemsForSeeker } from "@/lib/serializers/item";
import {
  claimNotificationEmail,
  sendEmail,
  type ClaimedItemSummary,
  type Contact,
} from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

export type LostReportState = {
  error?: string;
  reported?: boolean;
  matches?: MatchItem[];
};

export async function submitLostItem(
  _prev: LostReportState,
  form: FormData,
): Promise<LostReportState> {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");
  const eventId = String(form.get("event_id") ?? "") || null;
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "").trim() || null;
  const colour = String(form.get("colour") ?? "").trim() || null;
  const photo = String(form.get("photo") ?? "");

  if (!description) {
    return { error: "Please describe what you lost." };
  }

  const supabase = await db();

  // Upload the photo if one was provided.
  let imagePath: string | null = null;
  const parts = splitDataUrl(photo);
  if (parts) {
    const admin = serviceDb();
    const extension = parts.mimeType === "image/png" ? "png" : "jpg";
    imagePath = `loss-reports/${orgId}/${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(parts.b64, "base64");
    const { error: uploadError } = await admin.storage
      .from("items")
      .upload(imagePath, bytes, { contentType: parts.mimeType, upsert: false });
    if (uploadError) {
      return { error: `Could not save the photo: ${uploadError.message}` };
    }
  }

  const { error } = await supabase.from("loss_reports").insert({
    org_id: orgId,
    user_id: user.id,
    description,
    category,
    colour,
    image_path: imagePath,
    event_id: eventId,
    status: "OPEN",
  });

  if (error) return { error: error.message };

  // Immediately run keyword matching so the user sees potential hits.
  const matchResult = await findMatches(orgId, eventId, description);
  if (matchResult.status === "ok") {
    return { reported: true, matches: matchResult.items };
  }

  return { reported: true, matches: [] };
}

/** A data URL is what the <img> preview already holds; the API wants the tail. */
function splitDataUrl(dataUrl: string): { mimeType: string; b64: string } | null {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  return m ? { mimeType: m[1], b64: m[2] } : null;
}

export type AnalyseState =
  | { status: "ok"; fields: FoundItemDraft; note?: string }
  | { status: "empty"; message: string };

/** Which of the three required fields the model left blank, in reading order. */
function blanks(fields: FoundItemDraft): string[] {
  return (
    [
      ["description", fields.description],
      ["category", fields.category],
      ["colour", fields.colour],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([name]) => name);
}

/**
 * Reads the photo and hands back the four fields for the review screen.
 *
 * Never throws and never blocks the hand-in: when the model is unavailable the
 * review screen opens with blank fields and the person types them, which is
 * strictly better than losing the wallet they are standing there holding.
 *
 * A partial read is a success, not a failure. Whatever the model could see is
 * filled in and anything it could not is named in `note` — "could not read the
 * photo" is reserved for a photo that genuinely produced nothing and for the
 * API being unreachable, which is what it used to say either way.
 */
export async function analyseFoundItem(
  photoDataUrl: string,
  context: { orgName?: string; eventName?: string },
): Promise<AnalyseState> {
  await requireUser();

  const parts = splitDataUrl(photoDataUrl);
  if (!parts) return { status: "empty", message: "That photo could not be read. Try taking it again." };

  const fields = await extractFoundItem(parts.b64, context, parts.mimeType);
  if (!fields) {
    return { status: "empty", message: "Could not read the photo automatically — fill these in yourself." };
  }

  const missing = blanks(fields);
  return {
    status: "ok",
    fields,
    note: missing.length
      ? `Could not make out the ${missing.join(" or ")} — add ${missing.length > 1 ? "those" : "that"} yourself.`
      : undefined,
  };
}

export type SubmitState = { error?: string; shortCode?: string };

/** Readable over a desk: no O/0, no I/1. */
function shortCode(slug: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tail = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${slug.slice(0, 8).toUpperCase()}-${tail}`;
}

/**
 * Saves the item.
 *
 * Service role, deliberately: *_rls.sql does `revoke all on items from
 * authenticated` and grants back a select-only column allowlist, so there is no
 * insert privilege to hang an RLS policy on. Privileged writes going through
 * server-only service-role code is the pattern the file itself documents. The
 * authorisation done here instead is: you are signed in, and the org and event
 * you named actually go together.
 */
export async function submitFoundItem(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");

  // Only the desk logs an item. A member of the public who finds something
  // brings it in and files a notice; the organisers photograph and log it,
  // which keeps one chain of custody instead of two.
  if (!(await rolesIn(orgId)).some((r) => STAFF_ROLES.includes(r))) {
    return { error: "Only the organisation's staff can log a found item." };
  }
  const eventId = String(form.get("event_id") ?? "") || null;
  const photo = String(form.get("photo") ?? "");

  const parsed = FoundItemFields.safeParse({
    description: String(form.get("description") ?? ""),
    category: String(form.get("category") ?? ""),
    colour: String(form.get("colour") ?? ""),
    details: String(form.get("details") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields and try again." };
  }

  const parts = splitDataUrl(photo);
  if (!parts) return { error: "The photo is missing. Take it again." };

  const supabase = await db();
  const { data: org } = await supabase.from("orgs").select("id,slug").eq("id", orgId).single();
  if (!org) return { error: "That organisation no longer exists." };

  // An event id from the form is not trusted to belong to this org.
  if (eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .single();
    if (!event) return { error: "That event does not belong to this organisation." };
  }

  const admin = serviceDb();

  // items.logged_by points at profiles; a user who has never been through the
  // auth callback has no row there yet.
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const bytes = Buffer.from(parts.b64, "base64");
  const extension = parts.mimeType === "image/png" ? "png" : "jpg";
  const imagePath = `${orgId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from("items")
    .upload(imagePath, bytes, { contentType: parts.mimeType, upsert: false });
  if (uploadError) return { error: `Could not save the photo: ${uploadError.message}` };

  // short_code is unique per org, so a collision is a retry rather than a failure.
  let lastError = "Could not save the item.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = shortCode(String(org.slug ?? "item"));
    const { error } = await admin.from("items").insert({
      org_id: orgId,
      event_id: eventId,
      short_code: code,
      state: "LISTED",
      category: parsed.data.category,
      colour: parsed.data.colour,
      condition: parsed.data.details,
      public_description: parsed.data.description,
      image_full_path: imagePath,
      enrichment_status: "DONE",
      logged_by: user.id,
    });
    if (!error) return { shortCode: code };
    if (error.code !== "23505") return { error: error.message };
    lastError = error.message;
  }
  return { error: lastError };
}


// --- Matching a described loss against what has been handed in -------------

/** What a match row carries to the browser. A subset of SEEKER_ITEM_FIELDS. */
export type MatchItem = {
  id: string;
  short_code: string;
  category: string | null;
  colour: string | null;
  condition: string | null;
  public_description: string | null;
  found_at: string | null;
  /** Short-lived signed URL, or null when the item has no usable photo. */
  imageUrl: string | null;
};

export type MatchState =
  | { status: "ok"; items: MatchItem[] }
  | { status: "error"; message: string };

/**
 * Words too common to tell two objects apart. Without this, "I lost my black
 * bag" matches every item whose description contains "my".
 */
const STOPWORDS = new Set([
  "the", "a", "an", "my", "our", "i", "it", "is", "was", "in", "on", "at", "of",
  "and", "or", "with", "to", "for", "from", "this", "that", "lost", "left",
  "somewhere", "near", "have", "had", "has", "there", "here", "some", "been",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tokenise(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )];
}

/**
 * Keyword overlap, not vector similarity.
 *
 * ponytail: `items` carries embed_description/embed_image for exactly this job,
 * but nothing populates them yet — there is no embedding step in the intake
 * path. Scoring token overlap against the text columns needs no pipeline and is
 * good enough to surface a black umbrella among twenty items. Swap in a
 * pgvector nearest-neighbour query once something writes the embeddings.
 */
export async function findMatches(
  orgId: string,
  eventId: string | null,
  description: string,
): Promise<MatchState> {
  await requireUser();

  const tokens = tokenise(description);
  if (tokens.length === 0) return { status: "ok", items: [] };

  const supabase = await db();
  let query = supabase
    .from("items")
    .select("id,short_code,category,colour,condition,public_description,found_at,event_id")
    .eq("org_id", orgId)
    .eq("state", "LISTED")
    .order("found_at", { ascending: false })
    .limit(200);

  // An event narrows it, but an item logged at the venue outside any event is
  // still a plausible match, so those are kept rather than filtered away.
  //
  // or() takes a comma-separated string that a crafted value could break out
  // of, and eventId arrives in the URL — so it is interpolated only after it
  // is proven to be a plain UUID.
  if (eventId && UUID.test(eventId)) {
    query = query.or(`event_id.eq.${eventId},event_id.is.null`);
  }

  const { data, error } = await query;
  if (error) return { status: "error", message: error.message };

  const rows = (data ?? []) as Record<string, unknown>[];
  const scored = rows
    .map((row) => {
      const haystack = ["category", "colour", "condition", "public_description"]
        .map((f) => String(row[f] ?? ""))
        .join(" ")
        .toLowerCase();
      return { row, score: tokens.filter((t) => haystack.includes(t)).length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // INV-1: everything reaching a seeker goes through the allowlist serialiser,
  // and the tripwire runs on the result rather than trusting me to have used it.
  const safe = serialiseItemsForSeeker(scored.map((s) => s.row));
  assertNoPrivateFields(safe);

  // Thumbnails. The paths are private columns the RLS client above cannot
  // read, so they are fetched with the service role and turned into signed
  // URLs — the paths themselves never leave this function. One batched call
  // rather than one per row, and a failure costs the pictures, not the search.
  const matchIds = safe.map((i) => String(i.id));
  const urlByItem = await signedThumbnails(matchIds);

  return {
    status: "ok",
    items: safe.map((i) => ({
      id: String(i.id),
      short_code: String(i.short_code ?? ""),
      category: (i.category as string) ?? null,
      colour: (i.colour as string) ?? null,
      condition: (i.condition as string) ?? null,
      public_description: (i.public_description as string) ?? null,
      found_at: (i.found_at as string) ?? null,
      imageUrl: urlByItem.get(String(i.id)) ?? null,
    })),
  };
}

/** item id -> signed thumbnail URL, for whichever ids have a usable photo. */
async function signedThumbnails(itemIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (itemIds.length === 0) return out;

  try {
    const admin = serviceDb();
    const { data: media } = await admin
      .from("items")
      .select("id,image_redacted_path,image_full_path")
      .in("id", itemIds);

    // Prefer the redacted crop where one exists; nothing produces them yet.
    const pathByItem = new Map<string, string>();
    for (const row of (media ?? []) as Record<string, string | null>[]) {
      const path = row.image_redacted_path ?? row.image_full_path;
      if (row.id && path) pathByItem.set(String(row.id), path);
    }
    if (pathByItem.size === 0) return out;

    const paths = [...pathByItem.values()];
    const { data: signed } = await admin.storage
      .from("items")
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    const urlByPath = new Map(
      ((signed ?? []) as { path: string | null; signedUrl: string | null }[])
        .filter((r) => r.path && r.signedUrl)
        .map((r) => [r.path as string, r.signedUrl as string]),
    );
    for (const [itemId, path] of pathByItem) {
      const url = urlByPath.get(path);
      if (url) out.set(itemId, url);
    }
  } catch {
    // No thumbnails is a worse-looking list, not a broken one.
  }
  return out;
}

export type ClaimState = { error?: string; claimed?: boolean };

/**
 * Opens a claim. The verifier queue takes it from here — this only records
 * that you say it is yours, which is why it needs no evidence at this point.
 */
export async function submitClaim(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const user = await requireUser();
  const itemId = String(form.get("item_id") ?? "");

  const supabase = await db();
  // org_id comes off the item, never off the form: a claim must be filed
  // against the org that actually holds the thing.
  const { data: itemRow } = await supabase
    .from("items")
    .select("id,org_id,short_code,category,colour,public_description,logged_by")
    .eq("id", itemId)
    .single();
  if (!itemRow) return { error: "That item is no longer listed." };
  const item = itemRow as ClaimedItem;

  // claims.user_id references profiles, and the phone the person typed on
  // /profile only ever reached auth metadata. Copying it across is what puts a
  // contact next to the claim — both in the desk's queue and in the mail below.
  const phone = metaString(user.user_metadata?.phone) ?? user.phone ?? null;
  await serviceDb()
    .from("profiles")
    .upsert({ id: user.id, email: user.email, ...(phone ? { phone } : {}) }, { onConflict: "id" });

  const { error } = await supabase
    .from("claims")
    .insert({ item_id: itemId, user_id: user.id, org_id: item.org_id });
  // A duplicate simply means they already claimed it — and that the organiser
  // was mailed the first time, so this returns before mailing them again.
  if (error) {
    return error.code === "23505" ? { claimed: true } : { error: error.message };
  }

  await notifyOrganiserOfClaim(item, {
    name: metaString(user.user_metadata?.full_name) ?? metaString(user.user_metadata?.name),
    email: user.email ?? null,
    phone,
  });

  return { claimed: true };
}

type ClaimedItem = ClaimedItemSummary & { logged_by: string | null };

/** user_metadata is `any`-shaped; only strings with something in them count. */
function metaString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Emails whoever logged the item that someone has claimed it.
 *
 * Best-effort on purpose. The claim is already committed and visible in the
 * desk's queue by the time this runs, so a missing address or a mail server
 * having a bad day is worth a server log and nothing more — it must never
 * surface as "your claim failed" to the person who filed it.
 *
 * ponytail: only the logger is mailed, not every ORG_ADMIN. Every item logged
 * through submitFoundItem carries logged_by; widen this to a membership query
 * if items ever arrive by some other route.
 */
async function notifyOrganiserOfClaim(item: ClaimedItem, claimant: Contact): Promise<void> {
  try {
    if (!item.logged_by) return;

    // profiles is readable to a seeker only for their own row, so the
    // organiser's address needs the service role.
    const { data: organiser } = await serviceDb()
      .from("profiles")
      .select("email")
      .eq("id", item.logged_by)
      .single();
    const to = (organiser as { email: string | null } | null)?.email;
    if (!to) return;

    await sendEmail({ to, ...claimNotificationEmail(item, claimant, await requestOrigin()) });
  } catch (cause) {
    console.error("Could not notify the organiser of a claim:", cause);
  }
}


// --- A finder telling the desk they have something --------------------------

export type NoticeState = { error?: string; sent?: boolean };

/**
 * Records that someone is bringing an item in.
 *
 * Deliberately not an `items` row: nothing has been handed over yet, and a
 * DRAFT item with no photograph would sit in the same table as real stock and
 * have to be filtered out of every query. A notice is a different thing with a
 * different lifetime — it is closed when the item arrives, or when it does not.
 */
export async function notifyFound(_prev: NoticeState, form: FormData): Promise<NoticeState> {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");
  const eventId = String(form.get("event_id") ?? "") || null;
  const description = String(form.get("description") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim() || null;

  if (description.length < 3) return { error: "Say briefly what you found." };

  const supabase = await db();
  const { error } = await supabase.from("found_notices").insert({
    org_id: orgId,
    event_id: eventId,
    reported_by: user.id,
    description,
    contact,
  });
  if (error) return { error: error.message };

  return { sent: true };
}

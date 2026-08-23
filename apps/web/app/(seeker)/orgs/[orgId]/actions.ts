"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NewEvent, eventPrice } from "@findr/shared";
import { db } from "@/lib/db/client";
import { serviceDb } from "@/lib/db/service";
import { requireUser, rolesIn } from "@/lib/auth";
import { organiserAddedEmail, sendEmail } from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

export type EventFormState = { error?: string; created?: string; saved?: string };

/** The create and edit forms post the same fields, so they parse the same way. */
function readEventForm(form: FormData) {
  return NewEvent.safeParse({
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    event_date: String(form.get("event_date") ?? ""),
    end_date: String(form.get("end_date") ?? ""),
    starts_at: String(form.get("starts_at") ?? ""),
    ends_at: String(form.get("ends_at") ?? ""),
    capacity: String(form.get("capacity") ?? ""),
  });
}

export async function createEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");

  // Belt to the RLS braces: events_admin_write would reject this anyway, but
  // failing here gives the admin a sentence instead of a policy error.
  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) {
    return { error: "Only an organisation admin can schedule an event." };
  }

  const parsed = readEventForm(form);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await db();
  const { error } = await supabase.from("events").insert({
    org_id: orgId,
    ...parsed.data,
    // Recomputed here, never taken from the form: the browser's figure is a
    // preview and anything posted alongside it is ignored.
    price_inr: eventPrice(parsed.data.capacity),
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/orgs/${orgId}`);
  return { created: parsed.data.name };
}

/**
 * Plain form action, so there is no state channel to report a refusal on —
 * events_admin_write would reject a non-admin anyway; this guard just stops
 * the round trip earlier.
 */
export async function deleteEvent(form: FormData) {
  const orgId = String(form.get("org_id") ?? "");
  const eventId = String(form.get("event_id") ?? "");
  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) return;

  const supabase = await db();
  await supabase.from("events").delete().eq("id", eventId).eq("org_id", orgId);
  revalidatePath(`/orgs/${orgId}`);
}

export async function updateEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const orgId = String(form.get("org_id") ?? "");
  const eventId = String(form.get("event_id") ?? "");

  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) {
    return { error: "Only an organisation admin can edit an event." };
  }

  const parsed = readEventForm(form);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await db();
  const { error } = await supabase
    .from("events")
    .update({
      ...parsed.data,
      // Capacity is the thing an organiser comes back to raise, so the price
      // has to follow it. Recomputed here for the same reason as on create:
      // whatever the browser previewed is not trusted.
      price_inr: eventPrice(parsed.data.capacity),
    })
    .eq("id", eventId)
    .eq("org_id", orgId);
  if (error) return { error: error.message };

  revalidatePath(`/orgs/${orgId}`);
  revalidatePath(`/orgs/${orgId}/events/${eventId}`);
  return { saved: parsed.data.name };
}

/**
 * The item is back with its owner. COLLECTED is the end of the claim's life —
 * it already exists in the claim_status enum, so this closes the loop the
 * schema always anticipated rather than inventing a status beside it.
 */
export async function markClaimCollected(form: FormData) {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");
  const eventId = String(form.get("event_id") ?? "");
  const claimId = String(form.get("claim_id") ?? "");

  const held = await rolesIn(orgId);
  if (!held.includes("ORG_ADMIN") && !held.includes("VERIFIER")) return;

  const supabase = await db();
  // The item leaves the shelf with its owner, so it leaves the listing too —
  // findMatches and the item page both key off state = 'LISTED', so a
  // collected item that stayed LISTED keeps coming back as a match for the
  // next person describing something similar. That now happens in the
  // claims_collected_returns_item trigger, in the same transaction as this
  // update, rather than as a second write here that could quietly not happen.
  const { error, count } = await supabase
    .from("claims")
    .update({ status: "COLLECTED", reviewed_by: user.id }, { count: "exact" })
    .eq("id", claimId)
    .eq("org_id", orgId);

  // No state channel on a plain form action, so a refusal can only be logged.
  // Worth logging loudly: zero rows means the claim is still open and the item
  // is still listed, and the page will re-render showing the button again.
  if (error || count === 0) {
    console.error(`Could not mark claim ${claimId} collected:`, error?.message ?? "no rows updated");
  }

  // A public venue settles claims on the org console; a private one on the
  // event page. Refresh whichever the button was pressed on, and the home
  // page either way, because the bell count changes.
  if (eventId) revalidatePath(`/orgs/${orgId}/events/${eventId}`);
  revalidatePath(`/orgs/${orgId}`);
  revalidatePath("/");
}


// --- Who else runs this organisation ---------------------------------------

export type OrganiserState = { error?: string; added?: string };

/**
 * Grants someone ORG_ADMIN on this organisation, found by email address.
 *
 * Service role throughout, for the same reason createOrg needs it: dropping
 * memberships_self_join left no insert policy on memberships at all, so every
 * grant is server-only code that has authorised the caller itself. The check
 * above is that authorisation — there is no RLS behind it to fall back on.
 */
export async function addOrganiser(
  _prev: OrganiserState,
  form: FormData,
): Promise<OrganiserState> {
  const orgId = String(form.get("org_id") ?? "");
  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) {
    return { error: "Only an organisation admin can add an organiser." };
  }

  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email("That email address does not look right.")
    .safeParse(form.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter an email address." };
  }
  const email = parsed.data;

  const account = await organiserAccount(email);
  if ("error" in account) return { error: account.error };

  const admin = serviceDb();
  const { error } = await admin
    .from("memberships")
    .insert({ user_id: account.id, org_id: orgId, role: "ORG_ADMIN" });
  if (error) {
    return error.code === "23505"
      ? { error: `${email} is already an organiser here.` }
      : { error: error.message };
  }

  await notifyNewOrganiser(email, orgId);

  revalidatePath(`/orgs/${orgId}`);
  return { added: email };
}

/**
 * The profiles row to hang the membership on, creating the account if this is
 * someone who has never used FindR.
 *
 * memberships.user_id references profiles, which references auth.users, so
 * there is no such thing as a membership for an address with no account —
 * which would otherwise make "add my colleague" fail for exactly the people an
 * admin most wants to add. Creating the account grants a mistyped stranger
 * nothing on its own: sign-in is a one-time code sent to that address, so only
 * whoever reads that inbox can ever use it.
 */
async function organiserAccount(email: string): Promise<{ id: string } | { error: string }> {
  const admin = serviceDb();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { id: (existing as { id: string }).id };

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !created?.user) {
    // The one case worth translating: an auth user exists but never completed
    // a sign-in, so no profiles row was written and the lookup above missed it.
    return /already|registered|exists/i.test(error?.message ?? "")
      ? { error: `${email} has an account but has never signed in. Ask them to sign in once, then add them.` }
      : { error: error?.message ?? "Could not set up an account for that address." };
  }

  await admin.from("profiles").upsert({ id: created.user.id, email }, { onConflict: "id" });
  return { id: created.user.id };
}

/** Best-effort, exactly like the claim notice: the grant is already committed. */
async function notifyNewOrganiser(email: string, orgId: string): Promise<void> {
  try {
    const { data: org } = await serviceDb().from("orgs").select("name").eq("id", orgId).single();
    const name = (org as { name: string } | null)?.name;
    if (!name) return;
    await sendEmail({ to: email, ...organiserAddedEmail(name, orgId, await requestOrigin()) });
  } catch (cause) {
    console.error("Could not tell the new organiser they were added:", cause);
  }
}

/**
 * Takes the role away again — the safety valve on adding by typed email.
 *
 * Removing yourself is refused rather than confirmed: an organisation whose
 * last admin walked out of it has no way back in, and "I meant to remove the
 * other one" is the mistake this is here to survive.
 */
export async function removeOrganiser(form: FormData) {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");
  const userId = String(form.get("user_id") ?? "");

  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) return;
  if (userId === user.id) return;

  await serviceDb().from("memberships").delete().eq("org_id", orgId).eq("user_id", userId);
  revalidatePath(`/orgs/${orgId}`);
}

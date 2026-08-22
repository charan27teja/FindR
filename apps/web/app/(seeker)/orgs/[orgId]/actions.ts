"use server";

import { revalidatePath } from "next/cache";
import { NewEvent, eventPrice } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireUser, rolesIn } from "@/lib/auth";

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

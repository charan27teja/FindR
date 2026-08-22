"use server";

import { revalidatePath } from "next/cache";
import { NewEvent, eventPrice } from "@findr/shared";
import { db } from "@/lib/db/client";
import { requireUser, rolesIn } from "@/lib/auth";

export type EventFormState = { error?: string; created?: string };

export async function createEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const user = await requireUser();
  const orgId = String(form.get("org_id") ?? "");

  // Belt to the RLS braces: events_admin_write would reject this anyway, but
  // failing here gives the admin a sentence instead of a policy error.
  if (!(await rolesIn(orgId)).includes("ORG_ADMIN")) {
    return { error: "Only an organisation admin can schedule an event." };
  }

  const parsed = NewEvent.safeParse({
    name: String(form.get("name") ?? ""),
    event_date: String(form.get("event_date") ?? ""),
    starts_at: String(form.get("starts_at") ?? ""),
    ends_at: String(form.get("ends_at") ?? ""),
    capacity: String(form.get("capacity") ?? ""),
  });
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

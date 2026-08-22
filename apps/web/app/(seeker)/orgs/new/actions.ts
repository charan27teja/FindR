"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MAX_ORG_CONTACTS, NewOrg, slugify } from "@findr/shared";
import { serviceDb } from "@/lib/db/service";
import { requireUser } from "@/lib/auth";

export type OrgFormState = { error?: string };

/** Short, unambiguous to read aloud at a desk: no O/0, no I/1. */
function joinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function createOrg(_prev: OrgFormState, form: FormData): Promise<OrgFormState> {
  const user = await requireUser();

  const contacts = Array.from({ length: MAX_ORG_CONTACTS }, (_, i) => ({
    email: String(form.get(`email_${i}`) ?? ""),
    phone: String(form.get(`phone_${i}`) ?? ""),
  })).filter((c) => c.email.trim() || c.phone.trim());

  const parsed = NewOrg.safeParse({
    name: String(form.get("name") ?? ""),
    location: String(form.get("location") ?? ""),
    contacts,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { name, location, contacts: people } = parsed.data;

  // Service role: `orgs_create` would let the user insert the org, but no
  // policy lets anyone write their own membership — the creator could not make
  // themselves ORG_ADMIN, so the org would be unmanageable.
  const admin = serviceDb();

  // memberships.user_id and events.created_by both point at profiles; a user
  // who has never been through the auth callback has no row yet.
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  let orgId: string | null = null;
  let lastError = "Could not create the organisation.";
  for (let attempt = 0; attempt < 3 && !orgId; attempt++) {
    const slug = attempt === 0 ? slugify(name) : `${slugify(name)}-${joinCode().slice(0, 4).toLowerCase()}`;
    const { data, error } = await admin
      .from("orgs")
      .insert({ name, slug, location, type: "PRIVATE", join_code: joinCode(), config: {} })
      .select("id")
      .single();
    if (data) orgId = (data as { id: string }).id;
    // 23505 is a unique violation — the slug or join code collided, so retry
    // with a suffixed slug and a fresh code rather than failing the submit.
    else if (error && error.code !== "23505") return { error: error.message };
    else if (error) lastError = error.message;
  }
  if (!orgId) return { error: lastError };

  const { error: contactError } = await admin
    .from("org_contacts")
    .insert(people.map((c) => ({ org_id: orgId, email: c.email, phone: c.phone })));
  if (contactError) return { error: contactError.message };

  const { error: roleError } = await admin
    .from("memberships")
    .insert({ user_id: user.id, org_id: orgId, role: "ORG_ADMIN" });
  if (roleError && roleError.code !== "23505") return { error: roleError.message };

  revalidatePath("/");
  revalidatePath("/orgs");
  redirect(`/orgs/${orgId}`);
}

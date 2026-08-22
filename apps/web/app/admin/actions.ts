'use server';

import { serviceDb } from '@/lib/db/service';
import { revalidatePath } from 'next/cache';

export async function createPublicOrg(prevState: unknown, formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  if (!name || !slug) {
    return { error: 'Name and slug are required' };
  }

  const db = serviceDb();
  
  const { error } = await db.from('orgs').insert({
    name,
    slug,
    type: 'PUBLIC'
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/'); // update home page search list
  
  return { success: true };
}

export async function deletePublicOrg(id: string) {
  const db = serviceDb();
  
  const { error } = await db.from('orgs').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export async function updatePublicOrg(id: string, name: string, slug: string) {
  if (!name || !slug) {
    return { error: 'Name and slug are required' };
  }

  const db = serviceDb();
  
  const { error } = await db.from('orgs').update({
    name,
    slug,
  }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}

export type OrganiserState = { error?: string; added?: string };

/**
 * Gives someone the keys to a public venue's console.
 *
 * An ORG_ADMIN membership is the whole mechanism: requireRole on the console
 * checks for exactly that, so this row is what turns an ordinary account into
 * the person who runs that desk.
 *
 * Matched on the profile's email, which means they must have signed in at
 * least once — there is no profiles row before that, and inviting an address
 * that has never been seen would create a membership pointing at nobody.
 */
export async function addPublicOrgAdmin(
  _prev: OrganiserState,
  formData: FormData,
): Promise<OrganiserState> {
  const orgId = String(formData.get('org_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!orgId || !email) return { error: 'Pick an organisation and give an email address.' };

  const db = serviceDb();

  const { data: profile } = await db
    .from('profiles')
    .select('id,email')
    .ilike('email', email)
    .maybeSingle();

  if (!profile) {
    return { error: `No account for ${email} yet — ask them to sign in once, then add them.` };
  }

  const { error } = await db
    .from('memberships')
    .insert({ user_id: profile.id, org_id: orgId, role: 'ORG_ADMIN' });
  // A duplicate simply means they already run it.
  if (error && error.code !== '23505') return { error: error.message };

  revalidatePath('/admin');
  revalidatePath(`/orgs/${orgId}`);
  return { added: email };
}

export async function removePublicOrgAdmin(orgId: string, userId: string) {
  const db = serviceDb();
  const { error } = await db
    .from('memberships')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('role', 'ORG_ADMIN');

  if (error) return { error: error.message };

  revalidatePath('/admin');
  revalidatePath(`/orgs/${orgId}`);
  return { success: true };
}

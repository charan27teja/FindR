'use server';

import { serviceDb } from '@/lib/db/service';
import { revalidatePath } from 'next/cache';

export async function createPublicOrg(prevState: any, formData: FormData) {
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

import React from 'react';
import { serviceDb } from '@/lib/db/service';
import { AdminClientPage } from './AdminClientPage.tsx';

export const metadata = {
  title: 'Admin Dashboard - Findr',
};

export default async function AdminPage() {
  const db = serviceDb();

  // Fetch only public organisations
  const { data: orgs, error } = await db
    .from('orgs')
    .select('*')
    .eq('type', 'PUBLIC')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error loading public organisations: {error.message}
      </div>
    );
  }

  // Who currently runs each of these desks. Two queries and a join in JS:
  // memberships has no foreign-key relationship PostgREST can embed profiles
  // through in one call here.
  const orgIds = (orgs ?? []).map((o) => o.id);
  const { data: memberships } = orgIds.length
    ? await db
        .from('memberships')
        .select('user_id,org_id')
        .eq('role', 'ORG_ADMIN')
        .in('org_id', orgIds)
    : { data: [] };

  const adminIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  const { data: profiles } = adminIds.length
    ? await db.from('profiles').select('id,email').in('id', adminIds)
    : { data: [] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email as string | null]));

  const organisersByOrg: Record<string, { userId: string; email: string }[]> = {};
  for (const m of memberships ?? []) {
    (organisersByOrg[m.org_id] ??= []).push({
      userId: m.user_id,
      email: emailById.get(m.user_id) ?? m.user_id,
    });
  }

  return <AdminClientPage initialOrgs={orgs || []} organisersByOrg={organisersByOrg} />;
}

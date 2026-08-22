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

  return <AdminClientPage initialOrgs={orgs || []} />;
}

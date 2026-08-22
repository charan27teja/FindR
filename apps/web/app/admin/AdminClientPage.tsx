'use client';

import React, { useActionState, useState } from 'react';
import { createPublicOrg, deletePublicOrg } from './actions';
import { OrgIcon } from '@/components/OrgIcon';

export interface Org {
  id: string;
  name: string;
  slug: string;
  type: string;
  created_at: string;
}

export function AdminClientPage({ initialOrgs }: { initialOrgs: Org[] }) {
  const [state, formAction, isPending] = useActionState(createPublicOrg, null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this organisation?')) return;
    setIsDeleting(id);
    await deletePublicOrg(id);
    setIsDeleting(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Public Organisations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage public places like Railway Stations, Metro Stations, Tourist Places, etc.
        </p>
      </div>

      {/* Add New Org Form */}
      <div className="bg-white dark:bg-[#111] shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 border border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white mb-4">Add New Public Place</h2>
        
        <form action={formAction} className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 w-full">
            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-300">
              Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white sm:text-sm sm:leading-6 bg-transparent px-3"
                placeholder="e.g. Central Station"
              />
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <label htmlFor="slug" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-300">
              Slug (URL friendly)
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="slug"
                id="slug"
                required
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black dark:focus:ring-white sm:text-sm sm:leading-6 bg-transparent px-3"
                placeholder="e.g. central-station"
              />
            </div>
          </div>

          <div className="sm:self-end mt-4 sm:mt-0 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto rounded-md bg-black dark:bg-white px-3 py-2 text-sm font-semibold text-white dark:text-black shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Adding...' : 'Add Place'}
            </button>
          </div>
        </form>
        {state?.error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
      </div>

      {/* Orgs List */}
      <div className="bg-white dark:bg-[#111] shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-800">
          {initialOrgs.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No public places found. Add one above.
            </li>
          ) : (
            initialOrgs.map((org) => (
              <li key={org.id} className="flex items-center justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] sm:px-6 transition-colors">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <OrgIcon name={org.name} className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start gap-x-3">
                      <p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">{org.name}</p>
                      <p className="rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset text-green-700 bg-green-50 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
                        Public
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      <p className="truncate">Slug: {org.slug}</p>
                      <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                        <circle cx={1} cy={1} r={1} />
                      </svg>
                      <p className="truncate">Created {new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  <button
                    onClick={() => handleDelete(org.id)}
                    disabled={isDeleting === org.id}
                    className="block rounded-md bg-white dark:bg-[#222] px-3 py-2 text-center text-sm font-semibold text-red-600 dark:text-red-400 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-[#333] disabled:opacity-50 transition-colors"
                  >
                    {isDeleting === org.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

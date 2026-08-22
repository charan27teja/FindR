import React from 'react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black">
      {/* Admin Header */}
      <header className="bg-white dark:bg-[#111] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity">
              Findr Admin
            </Link>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
              Global Platform
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Public Site
            </Link>
            
            <form action={async () => {
              'use server';
              const { cookies } = await import('next/headers');
              (await cookies()).delete('admin_session');
              const { redirect } = await import('next/navigation');
              redirect('/admin/login');
            }}>
              <button 
                type="submit" 
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

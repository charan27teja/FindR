import React from 'react';

export function OrgIcon({ name, className = "w-4 h-4 text-neutral-400" }: { name: string; className?: string }) {
  const n = name?.toLowerCase() || '';
  const isTrain = n.includes('metro') || n.includes('rail') || n.includes('station') || n.includes('train');
  
  if (isTrain) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="16" height="16" x="4" y="3" rx="2" />
        <path d="M4 11h16" />
        <path d="M12 3v8" />
        <path d="m8 19-2 3" />
        <path d="m18 22-2-3" />
        <path d="M8 15h0" />
        <path d="M16 15h0" />
      </svg>
    );
  }
  
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

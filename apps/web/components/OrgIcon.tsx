import React from 'react';

export function OrgIcon({ name, className = "w-4 h-4 text-neutral-400" }: { name: string; className?: string }) {
  const n = name?.toLowerCase() || '';
  
  const isBus = n.includes('bus');
  const isTrain = (n.includes('metro') || n.includes('rail') || n.includes('train') || n.includes('station')) && !isBus;
  const isTourist = n.includes('tourist') || n.includes('monument') || n.includes('museum') || n.includes('park') || n.includes('historic') || n.includes('landmark');
  
  if (isBus) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 6 5.03 2.91A2 2 0 0 1 6.93 1.5h10.14a2 2 0 0 1 1.9 1.41L20 6"/>
        <rect width="16" height="12" x="4" y="6" rx="2"/>
        <path d="M8 6v5"/>
        <path d="M16 6v5"/>
        <path d="M4 12h16"/>
        <path d="M7 22v-4"/>
        <path d="M17 22v-4"/>
        <circle cx="8" cy="15" r="1"/>
        <circle cx="16" cy="15" r="1"/>
      </svg>
    );
  }
  
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
  
  if (isTourist) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" x2="21" y1="22" y2="22" />
        <line x1="6" x2="6" y1="18" y2="11" />
        <line x1="10" x2="10" y1="18" y2="11" />
        <line x1="14" x2="14" y1="18" y2="11" />
        <line x1="18" x2="18" y1="18" y2="11" />
        <polygon points="12 2 20 7 4 7" />
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

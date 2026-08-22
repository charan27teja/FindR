"use client";

import { useEffect, useState } from "react";

const ICONS = [
  {
    name: "image",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    name: "bag",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    name: "phone",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    name: "wallet",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
    ),
  },
];

export default function ScanningImagePlaceholder({ label = "No image" }: { label?: string }) {
  const [iconIdx, setIconIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIdx((prev) => (prev + 1) % ICONS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] max-h-[40vh] rounded-2xl bg-[#141414] border border-dashed border-white/20 flex flex-col items-center justify-center p-6 text-[#AAAAAA] overflow-hidden">
      {/* Animated scanner line */}
      <div className="scan-line" />

      {/* Silhouette icon with fade transition */}
      <div className="text-white/60 mb-3 transition-all duration-500 transform hover:scale-105">
        {ICONS[iconIdx]?.svg}
      </div>

      <span className="text-sm font-medium tracking-wide text-neutral-300">{label}</span>
      <span className="text-xs text-neutral-500 mt-1">Tap camera below to attach photo</span>
    </div>
  );
}

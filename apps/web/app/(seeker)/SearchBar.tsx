"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Org = { id: string; name: string; slug: string; type: string };

export default function SearchBar({ orgs }: { orgs: Org[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.trim()
    ? orgs.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : orgs;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search stations, campuses, events"
          className="w-full rounded-lg border border-neutral-300 bg-transparent py-2.5 pl-9 pr-4 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
        />
      </div>

      {open && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-background shadow-lg dark:border-neutral-800">
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/search/${o.id}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="block text-xs uppercase tracking-wide text-neutral-500">
                    {o.type.toLowerCase().replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-neutral-500">
              {query.trim()
                ? `No organisation matches "${query}". Ask the desk for their join code.`
                : "No tenants found. Join an organisation to get started."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

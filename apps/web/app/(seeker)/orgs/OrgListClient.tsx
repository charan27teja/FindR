"use client";

import { useState } from "react";
import Link from "next/link";

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  events: { id: string; name: string; when: string }[];
}

interface OrgListClientProps {
  orgs: OrgItem[];
  intent: string;
  initialQuery: string;
  error?: string;
}

export default function OrgListClient({
  orgs,
  intent,
  initialQuery,
  error,
}: OrgListClientProps) {
  const [query, setQuery] = useState(initialQuery);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.events.some((e) => e.name.toLowerCase().includes(q)),
      )
    : orgs;

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
      {/* Fixed top header */}
      <div className="sticky top-0 z-10 bg-black px-6 pt-8 pb-4">
        {/* Back button & title */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/"
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">
            {intent === "report"
              ? "Where did you lose it?"
              : "Select Organisation"}
          </h1>
        </div>

        {/* Pill-shaped search bar */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organisation"
            className="w-full rounded-full bg-[#1A1A1A] py-3.5 pl-12 pr-5 text-sm text-white placeholder-[#AAAAAA] outline-none border-0"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mb-2 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Organisation list */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {filtered.length > 0 ? (
          <ul className="flex flex-col">
            {filtered.map((o) => (
              <li key={o.id}>
                <Link
                  href={intent === "report" ? `/search/${o.id}?report=1` : `/search/${o.id}`}
                  className="flex w-full items-center gap-4 border-b border-white/10 py-4 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                >
                  {/* Circular icon placeholder */}
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-bold text-white">
                    {o.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Org name */}
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-white">
                      {o.name}
                    </span>
                    <span className="block text-xs text-[#AAAAAA]">
                      {o.type.toLowerCase().replace("_", " ")}
                    </span>
                  </div>

                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 text-white/40"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
                {/* Context for the choice, not links: selecting the
                    organisation is the action, and an event's own page belongs
                    to the organiser who scheduled it. */}
                {o.events.length > 0 && (
                  <ul className="-mt-2 mb-3 ml-[3.75rem] flex flex-col gap-1 border-l border-white/10 pl-3">
                    {o.events.map((e) => (
                      <li key={e.id}>
                        <span className="block truncate text-[13px] text-white/80">{e.name}</span>
                        <span className="block text-[11px] text-[#AAAAAA]">{e.when}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 text-[#AAAAAA]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-sm text-[#AAAAAA]">
              {query.trim()
                ? `No organisations match "${query}"`
                : "No organisations found yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

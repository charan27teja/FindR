"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OrgIcon } from "@/components/OrgIcon";
import SearchingAnimation from "@/components/SearchingAnimation";

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
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const PLACEHOLDERS = [
    "Search for a lost item",
    "Lost your phone? Search here",
    "Search by organisation or location",
    "Search by item name or category",
  ];

  useEffect(() => {
    if (isFocused || query) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3400);

    return () => clearInterval(interval);
  }, [isFocused, query, PLACEHOLDERS.length]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.events.some((e) => e.name.toLowerCase().includes(q)),
      )
    : orgs;

  const publicOrgs = filtered.filter((o) => o.type === "PUBLIC");
  const privateOrgs = filtered.filter((o) => o.type !== "PUBLIC");

  const renderOrgList = (orgList: OrgItem[]) => (
    <ul className="flex flex-col">
      {orgList.map((o) => (
        <li key={o.id} className="border-b border-white/10 last:border-b-0 pb-4 mb-2">
          <Link
            href={intent === "report" ? `/search/${o.id}?report=1` : `/search/${o.id}?report=0`}
            className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/5 active:bg-white/10 rounded-xl px-2 -mx-2"
          >
            {/* Icon */}
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-white">
              <OrgIcon name={o.name} className="w-5 h-5 text-neutral-400" />
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
          {/* Clickable Event List */}
          {o.events.length > 0 && (
            <ul className="mt-1 ml-[3.75rem] flex flex-col gap-1 border-l border-white/10 pl-3">
              {o.events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={intent === "report" ? `/search/${o.id}?report=1&event=${e.id}` : `/search/${o.id}?report=0&event=${e.id}`}
                    className="block py-2 text-left transition-colors hover:bg-white/5 active:bg-white/10 rounded-md px-2 -mx-2"
                  >
                    <span className="block truncate text-[13px] text-white/80">{e.name}</span>
                    <span className="block text-[11px] text-[#AAAAAA]">{e.when}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );

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
              ? "Where did you find it?"
              : "Select Organisation"}
          </h1>
        </div>

        {/* Pill-shaped search bar */}
        <div className="relative flex items-center rounded-full bg-[#1A1A1A] border border-white/10 focus-within:border-white/30 transition-colors">
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

          {/* Smooth vertical slide-up placeholder ticker */}
          {!query && !isFocused && (
            <div className="pointer-events-none absolute left-12 right-5 top-1/2 -translate-y-1/2 overflow-hidden h-6 text-[14px] text-[#AAAAAA] select-none flex items-center">
              <span
                key={placeholderIndex}
                className="block truncate animate-placeholder-slide"
              >
                {PLACEHOLDERS[placeholderIndex]}
              </span>
            </div>
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full rounded-full bg-transparent py-3.5 pl-12 pr-5 text-sm text-white outline-none border-0"
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
          <div className="flex flex-col gap-8">
            {publicOrgs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#777777] mb-3 px-1">
                  Public Places
                </h2>
                {renderOrgList(publicOrgs)}
              </div>
            )}
            {privateOrgs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#777777] mb-3 px-1">
                  Private Events & Organisations
                </h2>
                {renderOrgList(privateOrgs)}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12">
            <SearchingAnimation text={query.trim() ? `Searching matches for "${query}"…` : "No organisations found"} />
          </div>
        )}
      </div>
    </div>
  );
}

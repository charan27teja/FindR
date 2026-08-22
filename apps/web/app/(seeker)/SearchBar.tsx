"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { eventWhen } from "./orgs/[orgId]/when";
import { OrgIcon } from "@/components/OrgIcon";

type Org = { id: string; name: string; slug: string; type: string };
export type EventLite = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
};

export default function SearchBar({ orgs, events = [] }: { orgs: Org[]; events?: EventLite[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Picking an event does not navigate: it opens a popup that states what the
  // event is and asks which of the two things you are here to do.
  const [chosen, setChosen] = useState<EventLite | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  // showModal() rather than an `open` attribute: that is what buys the focus
  // trap, Escape and the inert page behind, none of which we want to rebuild.
  useEffect(() => {
    if (chosen) dialogRef.current?.showModal();
  }, [chosen]);

  const q = query.trim().toLowerCase();

  const eventsOf = (orgId: string) => events.filter((e) => e.org_id === orgId);
  const hostOf = (orgId: string) => orgs.find((o) => o.id === orgId)?.name;

  // An org earns its place by its own name or by one of its events — either
  // way the whole organisation is the result, and every event it runs is
  // listed under it. Searching "Techfusion" should show you the rest of that
  // campus's schedule too, not just the one event you happened to name.
  const filtered = q
    ? orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          eventsOf(o.id).some((e) => e.name.toLowerCase().includes(q)),
      )
    : orgs;

  // A public venue's desk is open all year and runs no events; a private
  // organisation's items live under one. That is a real difference in how you
  // reach the thing you lost, so the list says so rather than mixing them.
  const publicOrgs = filtered.filter((o) => o.type === "PUBLIC");
  const privateOrgs = filtered.filter((o) => o.type !== "PUBLIC");

  /** Expanded by hover (CSS below), or by tapping the chevron, which is the
   *  same affordance on a phone where there is no hover at all. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (orgId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(orgId)) next.add(orgId);
      return next;
    });

  function orgRow(org: Org) {
    const orgEvents = eventsOf(org.id);
    const hasTree = org.type !== "PUBLIC" && orgEvents.length > 0;
    // An org that surfaced because one of its events matched should show the
    // reason without being poked.
    const matchedByEvent = !!q && orgEvents.some((e) => e.name.toLowerCase().includes(q));
    // Named apart from the dropdown's own `open` — this is just this row's tree.
    const treeOpen = expanded.has(org.id) || matchedByEvent;

    return (
      <li key={org.id} className="group">
        <div className="flex items-center">
          <Link
            href={`/search/${org.id}`}
            onClick={() => setOpen(false)}
            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground">
              <OrgIcon name={org.name} className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium">{org.name}</span>
              <span className="block text-xs uppercase tracking-wide text-neutral-500">
                {org.type.toLowerCase().replace("_", " ")}
                {hasTree ? ` · ${orgEvents.length} event${orgEvents.length === 1 ? "" : "s"}` : ""}
              </span>
            </div>
          </Link>
          {hasTree && (
            <button
              type="button"
              onClick={() => toggle(org.id)}
              aria-expanded={treeOpen}
              aria-label={`${treeOpen ? "Hide" : "Show"} events at ${org.name}`}
              className="mr-2 rounded-full p-2 text-neutral-400 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 ${treeOpen ? "rotate-90" : ""} group-hover:rotate-90`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* The tree. Hover reveals it on a pointer; group-focus-within keeps it
            reachable by keyboard; the chevron covers touch, where hover never
            fires at all. */}
        {hasTree && (
          <ul
            className={`${treeOpen ? "block" : "hidden group-hover:block group-focus-within:block"} ml-6 border-l border-foreground/15`}
          >
            {orgEvents.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setChosen(e);
                  }}
                  className="flex w-full items-baseline gap-2 py-2 pl-3 pr-4 text-left transition-colors hover:bg-foreground/5"
                >
                  <span aria-hidden className="text-neutral-400">└</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{e.name}</span>
                    <span className="block text-xs text-neutral-500">{eventWhen(e)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div ref={wrapperRef} className="relative z-50">
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
          className="w-full rounded-lg border border-foreground/20 bg-transparent py-2.5 pl-9 pr-4 text-sm outline-none focus:border-foreground"
        />
      </div>

      {open && (
        <ul className="search-dropdown absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-foreground/15 bg-[var(--background)] py-1.5 shadow-xl">
          {filtered.length > 0 ? (
            <>
              {publicOrgs.length > 0 && (
                <li className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Public places
                </li>
              )}
              {publicOrgs.map(orgRow)}

              {privateOrgs.length > 0 && (
                <li className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Organisations
                </li>
              )}
              {privateOrgs.map(orgRow)}
            </>
          ) : (
            <li className="px-4 py-6 text-center text-sm text-neutral-500">
              {query.trim()
                ? `Nothing matches "${query}".`
                : "No organisations yet."}
            </li>
          )}
        </ul>
      )}

      {/* Clicking the backdrop is not the browser's job — the click lands on
          the dialog element itself, so compare against its box. */}
      <dialog
        ref={dialogRef}
        aria-label={chosen ? chosen.name : "Event"}
        className="modal"
        onClose={() => setChosen(null)}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const outside =
            e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
          if (outside) e.currentTarget.close();
        }}
      >
        {chosen && (
          <div className="flex flex-col gap-4 p-5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">{chosen.name}</h2>
                <p className="text-sm text-neutral-500">
                  {hostOf(chosen.org_id) ?? "Unknown organiser"}
                </p>
                <p className="text-xs text-neutral-500">{eventWhen(chosen)}</p>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-full p-1.5 transition-colors duration-150 hover:bg-foreground/5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            {/* whitespace-pre-line so the paragraph breaks an organiser typed survive. */}
            <p className="whitespace-pre-line text-sm text-neutral-500">
              {chosen.description || "No description yet."}
            </p>

            {/* Both land on the organisation running this event; ?report=1 is
                the flag /search/[orgId] reads to open in report mode. */}
            <div className="flex flex-row gap-2">
              <Link
                href={`/search/${chosen.org_id}`}
                onClick={() => dialogRef.current?.close()}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-background"
              >
                I lost something
              </Link>
              <Link
                href={`/search/${chosen.org_id}?report=1`}
                onClick={() => dialogRef.current?.close()}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-center text-sm font-medium dark:border-neutral-700"
              >
                Report a lost item
              </Link>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { eventWhen } from "./orgs/[orgId]/when";

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
            filtered.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/search/${o.id}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition-colors hover:bg-foreground/5"
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="block text-xs uppercase tracking-wide text-neutral-500">
                    {o.type.toLowerCase().replace("_", " ")}
                  </span>
                </Link>
                {/* Only while searching: with an empty box the dropdown is a
                    plain list of every org, and nesting every schedule under
                    it would bury them. */}
                {q
                  ? eventsOf(o.id).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setChosen(e);
                        }}
                        className="block w-full border-l-2 border-foreground/15 py-2 pl-6 pr-4 text-left transition-colors hover:bg-foreground/5"
                      >
                        <span className="block truncate text-sm">{e.name}</span>
                        <span className="block text-xs text-neutral-500">{eventWhen(e)}</span>
                      </button>
                    ))
                  : null}
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-neutral-500">
              {query.trim()
                ? `Nothing matches "${query}". Ask the desk for their join code.`
                : "No tenants found. Join an organisation to get started."}
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

            {/* ponytail: the two buttons are deliberately inert — the pages
                behind them are being built elsewhere, and wiring hrefs now
                would collide with that work. Give each a route when those
                pages land. */}
            <div className="flex flex-row gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background"
              >
                I lost something
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
              >
                Report a lost item
              </button>
            </div>
            <p className="-mt-2 text-center text-xs text-neutral-500">
              These open once the item pages are ready.
            </p>
          </div>
        )}
      </dialog>
    </div>
  );
}

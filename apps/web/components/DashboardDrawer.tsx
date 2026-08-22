"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

type Org = { id: string; name: string; slug: string; type: string };
export type Workspace = { org: Org; roles: string[] };

/** Typing in one of these means Tab is doing its normal job — leave it alone. */
function isTyping(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function DashboardDrawer({ workspaces }: { workspaces: Workspace[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      // Shift+Tab is left alone on purpose: it stays a normal backwards tab, so
      // a keyboard user is never trapped without a way to reach the page itself.
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      const dialog = dialogRef.current;
      if (!dialog || dialog.open || isTyping(document.activeElement)) return;
      e.preventDefault();
      dialog.showModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Open dashboard"
        className="-ml-1.5 flex shrink-0 items-center justify-center rounded-full p-2 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </svg>
      </button>

      {/* Native modal dialog: focus trap, Escape, and background inerting are
          the browser's job, not ours. Clicking the backdrop is not — the click
          lands on the dialog element itself, so compare against its box. */}
      <dialog
        ref={dialogRef}
        aria-label="Dashboard"
        className="drawer"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const outside =
            e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
          if (outside) close();
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close dashboard"
              className="rounded-full p-1.5 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Your organisations
              </h3>
              {workspaces.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {workspaces.map(({ org, roles }) => (
                    <li key={org.id}>
                      <Link
                        href={`/orgs?intent=search&q=${encodeURIComponent(org.name)}`}
                        onClick={close}
                        className="chip flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{org.name}</span>
                          <span className="block text-xs uppercase tracking-wide text-neutral-500">
                            {roles.map((r) => r.toLowerCase().replace("_", " ")).join(" · ")}
                          </span>
                        </span>
                        <span aria-hidden className="text-neutral-400">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
                  You have not joined any organisation yet.
                </p>
              )}
              <Link
                href="/orgs"
                onClick={close}
                className="mt-3 block text-sm text-neutral-500 underline underline-offset-4 hover:text-foreground"
              >
                Browse all organisations
              </Link>
            </section>
          </div>

          <footer className="border-t border-foreground/10 px-5 py-3 text-xs text-neutral-500">
            Press <kbd className="kbd">Tab</kbd> to open, <kbd className="kbd">Esc</kbd> to close
          </footer>
        </div>
      </dialog>
    </>
  );
}

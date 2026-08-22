"use client";

import { useRef } from "react";
import Link from "next/link";

export type ClaimNotice = {
  id: string;
  itemLabel: string;
  shortCode: string;
  orgName: string;
  eventName: string | null;
  /** Where the organiser goes to deal with it. */
  href: string;
  createdAt: string;
};

/**
 * Only rendered for people who staff an organisation — a seeker has no queue
 * to watch. The bell is a pointer, not a workbench: it says something is
 * waiting and takes you to the event page, which is where claims are handled.
 */
export default function ClaimsBell({ claims }: { claims: ClaimNotice[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * A modal dialog is in the top layer, so the browser centres it and no
   * amount of parent positioning moves it. Placing it against the button's own
   * rect is what keeps the popup attached to the bell — right edges aligned,
   * just below it, clamped so it never hangs off a narrow screen.
   */
  function openAnchored() {
    const dialog = dialogRef.current;
    const button = buttonRef.current;
    if (!dialog || !button) return;
    const r = button.getBoundingClientRect();
    dialog.style.top = `${r.bottom + 8}px`;
    dialog.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
    dialog.style.left = "auto";
    dialog.showModal();
  }

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={openAnchored}
        aria-label={
          claims.length > 0
            ? `Notifications, ${claims.length} waiting`
            : "Notifications"
        }
        className="relative flex shrink-0 items-center justify-center rounded-full p-2 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {claims.length > 0 && (
          /* The one piece of colour in a monochrome theme, on purpose: `accent`
             is just the foreground here, so a badge painted with it reads as
             decoration rather than something waiting. The ring cuts it out from
             the bell behind it so the digit stays legible in both themes. */
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--background)]"
          >
            {claims.length > 9 ? "9+" : claims.length}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Notifications"
        className="popover"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const outside =
            e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
          if (outside) e.currentTarget.close();
        }}
      >
        <div className="flex flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">
              Notifications{claims.length > 0 ? ` (${claims.length})` : ""}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="-mr-1 rounded-full p-1.5 transition-colors duration-150 hover:bg-foreground/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          {claims.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {claims.map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    onClick={() => dialogRef.current?.close()}
                    className="block border-b border-foreground/10 px-5 py-3 transition-colors hover:bg-foreground/5"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium">{c.itemLabel}</span>
                      <span className="shrink-0 font-mono text-xs tracking-wider text-neutral-500">
                        {c.shortCode}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {c.eventName ? `${c.eventName} · ` : ""}
                      {c.orgName} · {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">
              Nothing new. Claims on your items appear here.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MAX_ORG_CONTACTS } from "@findr/shared";
import { createOrg, type OrgFormState } from "./actions";

const field =
  "w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground";

export default function NewOrgPage() {
  const [state, action, pending] = useActionState<OrgFormState, FormData>(createOrg, {});

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-16">
      <header className="rise flex items-center gap-3 py-5">
        <Link
          href="/"
          aria-label="Back"
          className="rounded-full p-2 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New organisation</h1>
      </header>

      <p className="rise mb-6 text-sm leading-relaxed text-neutral-500" style={{ animationDelay: "60ms" }}>
        You will be its admin, and the only one who can manage it. Anyone
        searching can select it to report or claim items at its desks.
      </p>

      <form action={action} className="flex flex-col gap-6">
        <div className="rise flex flex-col gap-1.5" style={{ animationDelay: "120ms" }}>
          <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Name
          </label>
          <input id="name" name="name" required maxLength={120} placeholder="Sreenidhi Institute" className={field} />
        </div>

        <div className="rise flex flex-col gap-1.5" style={{ animationDelay: "160ms" }}>
          <label htmlFor="location" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Location
          </label>
          <input
            id="location"
            name="location"
            required
            maxLength={200}
            placeholder="Yamnampet, Ghatkesar, Hyderabad"
            className={field}
          />
        </div>

        <fieldset className="rise flex flex-col gap-3" style={{ animationDelay: "200ms" }}>
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Who is responsible
          </legend>
          <p className="-mt-1 text-xs text-neutral-500">
            At least one person, up to {MAX_ORG_CONTACTS}. Each needs an email or a phone number.
          </p>
          {Array.from({ length: MAX_ORG_CONTACTS }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <input
                name={`email_${i}`}
                type="email"
                required={i === 0}
                placeholder={i === 0 ? "Email" : "Email (optional)"}
                aria-label={`Contact ${i + 1} email`}
                className={field}
              />
              <input
                name={`phone_${i}`}
                type="tel"
                placeholder="Phone"
                aria-label={`Contact ${i + 1} phone`}
                className={field}
              />
            </div>
          ))}
        </fieldset>

        {state.error && (
          <p role="alert" className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="cta-card cta-primary rise rounded-xl bg-accent px-5 py-3.5 font-medium text-background disabled:opacity-60"
          style={{ animationDelay: "240ms" }}
        >
          {pending ? "Creating…" : "Create organisation"}
        </button>
      </form>
    </main>
  );
}

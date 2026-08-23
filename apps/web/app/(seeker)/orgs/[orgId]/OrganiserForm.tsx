"use client";

import { useActionState } from "react";
import { addOrganiser, type OrganiserState } from "./actions";

export default function OrganiserForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<OrganiserState, FormData>(addOrganiser, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="org_id" value={orgId} />
      <div className="flex gap-2">
        <label htmlFor="organiser-email" className="sr-only">
          Organiser&rsquo;s email
        </label>
        <input
          id="organiser-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="colleague@example.com"
          // key on the last success so the field empties itself once the
          // person has been added, ready for the next one.
          key={state.added ?? "new"}
          className="min-w-0 flex-1 rounded-lg border border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-foreground/20 px-4 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.added && (
        <p role="status" className="rounded-lg border border-foreground/20 px-3 py-2 text-sm">
          Added {state.added}. They have been emailed.
        </p>
      )}
    </form>
  );
}

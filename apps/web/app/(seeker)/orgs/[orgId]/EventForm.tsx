"use client";

import { useActionState, useEffect, useRef } from "react";
import CapacityPrice from "@/components/CapacityPrice";
import { createEvent, type EventFormState } from "./actions";

const field =
  "w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground";

export default function EventForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(createEvent, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a success so the next event starts from blank rather
  // than from the last one's details.
  useEffect(() => {
    if (state.created) formRef.current?.reset();
  }, [state.created]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-name" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Event name
        </label>
        <input id="event-name" name="name" required maxLength={120} placeholder="Techfusion 2026" className={field} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-date" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Date
        </label>
        <input id="event-date" name="event_date" type="date" required className={field} />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="starts-at" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Starts
          </label>
          <input id="starts-at" name="starts_at" type="time" required className={field} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="ends-at" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Ends
          </label>
          <input id="ends-at" name="ends_at" type="time" required className={field} />
        </div>
      </div>

      <CapacityPrice inputClassName={field} />

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.created && (
        <p role="status" className="rounded-lg border border-foreground/20 px-3 py-2 text-sm">
          Created {state.created}.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cta-card cta-primary rounded-xl bg-accent px-5 py-3 font-medium text-background disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

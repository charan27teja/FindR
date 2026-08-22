"use client";

import { type MouseEvent, useActionState, useEffect, useRef, useState } from "react";
import CapacityPrice from "@/components/CapacityPrice";
import { createEvent, updateEvent, type EventFormState } from "./actions";

const field =
  "w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground";

const label = "text-xs font-medium uppercase tracking-wider text-neutral-500";

/** The columns this form writes. A null description means "not written yet". */
export type EventDraft = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
};

/**
 * Date and time inputs already carry a calendar and a clock, but the browser
 * only opens them from their own small icon. Clicking anywhere in the field is
 * what people actually try, so forward that to the native picker rather than
 * building one. showPicker() throws where the browser has none — in that case
 * typing into the field still works, which is the whole fallback.
 */
function openPicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker();
  } catch {
    // No native picker here; the field stays plainly typeable.
  }
}

/** Postgres hands back "09:00:00"; an input of type time wants "09:00". */
const hhmm = (t: string | undefined) => t?.slice(0, 5) ?? "";

/**
 * One form for both scheduling and editing — the fields, the validation and
 * the price preview are identical, so the only differences are which action it
 * posts to and what the button says.
 */
export default function EventForm({ orgId, event }: { orgId: string; event?: EventDraft }) {
  const editing = !!event;
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    editing ? updateEvent : createEvent,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Capacity is the one controlled field, so the draft restores it through
  // React rather than by writing to the DOM node like the others.
  const [capacity, setCapacity] = useState(event ? String(event.capacity) : "");

  // Drafts are for the create form only. An edit form already opens with the
  // saved event in it, and a stale draft laid on top would silently undo
  // whatever someone changed elsewhere.
  // Keyed per org, so a half-written draft for one organisation does not
  // surface while scheduling an event for another.
  const draftKey = editing ? null : `findr:event-draft:${orgId}`;

  /** Every keystroke, so a reload at any moment keeps what was typed. */
  function saveDraft() {
    const form = formRef.current;
    if (!form || !draftKey) return;
    const draft: Record<string, string> = {};
    for (const [name, value] of new FormData(form)) {
      // org_id comes from the route, never from the draft.
      if (name !== "org_id" && typeof value === "string") draft[name] = value;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Storage disabled or full — the form still works, it just will not survive a reload.
    }
  }

  // Restore on mount rather than in the initial state: localStorage does not
  // exist while this renders on the server, and reading it during render would
  // make the markup disagree with the client.
  useEffect(() => {
    const form = formRef.current;
    if (!form || !draftKey) return;
    let draft: unknown;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    } catch {
      return; // Corrupt draft; start blank rather than throw on mount.
    }
    if (!draft || typeof draft !== "object") return;
    for (const [name, value] of Object.entries(draft as Record<string, unknown>)) {
      if (typeof value !== "string") continue;
      if (name === "capacity") {
        setCapacity(value);
        continue;
      }
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value;
    }
  }, [draftKey]);

  // Clear the form after a create so the next event starts from blank rather
  // than from the last one's details — and drop the draft with it, or the very
  // next reload would resurrect the event that was just created. Editing keeps
  // what is on screen: it is still the event you are looking at.
  useEffect(() => {
    if (!state.created || !draftKey) return;
    formRef.current?.reset();
    setCapacity("");
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Nothing was stored in the first place.
    }
  }, [state.created, draftKey]);

  return (
    <form ref={formRef} action={action} onInput={saveDraft} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />
      {event ? <input type="hidden" name="event_id" value={event.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-name" className={label}>
          Event name
        </label>
        <input
          id="event-name"
          name="name"
          required
          maxLength={120}
          defaultValue={event?.name}
          placeholder="Techfusion 2026"
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-description" className={label}>
          Description
        </label>
        <textarea
          id="event-description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={event?.description ?? ""}
          placeholder="Where the desk is, when it is staffed, anything a seeker should know."
          className={`${field} resize-y`}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="event-date" className={label}>
            First day
          </label>
          <input
            id="event-date"
            name="event_date"
            type="date"
            required
            defaultValue={event?.event_date}
            onClick={openPicker}
            className={field}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="end-date" className={label}>
            Last day
          </label>
          {/* Optional on purpose: blank means the event starts and ends on the
              same day, which is still the common case. */}
          <input
            id="end-date"
            name="end_date"
            type="date"
            defaultValue={event?.end_date ?? ""}
            onClick={openPicker}
            className={field}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-neutral-500">
        Leave the last day blank for a single-day event.
      </p>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="starts-at" className={label}>
            Starts
          </label>
          <input
            id="starts-at"
            name="starts_at"
            type="time"
            required
            defaultValue={hhmm(event?.starts_at)}
            onClick={openPicker}
            className={field}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="ends-at" className={label}>
            Ends
          </label>
          <input
            id="ends-at"
            name="ends_at"
            type="time"
            required
            defaultValue={hhmm(event?.ends_at)}
            onClick={openPicker}
            className={field}
          />
        </div>
      </div>

      <CapacityPrice inputClassName={field} value={capacity} onChange={setCapacity} />

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {(state.created || state.saved) && (
        <p role="status" className="rounded-lg border border-foreground/20 px-3 py-2 text-sm">
          {state.created ? `Created ${state.created}.` : `Saved ${state.saved}.`}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="cta-card cta-primary rounded-xl bg-accent px-5 py-3 font-medium text-background disabled:opacity-60"
      >
        {pending ? (editing ? "Saving…" : "Creating…") : editing ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}

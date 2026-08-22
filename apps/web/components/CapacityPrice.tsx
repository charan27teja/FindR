"use client";

import { EVENT_BASE_FEE_INR, EVENT_PER_ITEM_INR, eventPrice, formatInr } from "@findr/shared";

/**
 * Capacity is how many lost items the organiser wants room to log — one item
 * fills one slot — and it drives the price, so they share a control. What is
 * shown here is a preview only: createEvent recomputes it server-side from the
 * same eventPrice(), so a tampered form cannot buy a cheap event.
 *
 * The value lives in EventForm rather than here, because the saved draft has
 * to restore this field alongside the rest of the form — two owners would
 * drift apart on reload.
 */
export default function CapacityPrice({
  inputClassName,
  value,
  onChange,
}: {
  inputClassName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const price = eventPrice(Number(value));

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="capacity" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Item capacity
      </label>
      <input
        id="capacity"
        name="capacity"
        type="number"
        min={1}
        max={1000000}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="capacity-hint"
        placeholder="How many lost items do you need room for?"
        className={inputClassName}
      />
      <p id="capacity-hint" className="text-xs text-neutral-500">
        This is how many items the database will store for your event.
      </p>
      <p className="flex items-baseline justify-between pt-1 text-sm" aria-live="polite">
        <span className="text-neutral-500">
          {formatInr(EVENT_BASE_FEE_INR)} base + {formatInr(EVENT_PER_ITEM_INR)} per item
        </span>
        <span className="font-mono text-lg font-medium tabular-nums">
          {price > 0 ? formatInr(price) : "—"}
        </span>
      </p>
    </div>
  );
}

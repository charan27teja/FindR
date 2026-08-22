"use client";

import { useState } from "react";
import { EVENT_BASE_FEE_INR, EVENT_PER_HEAD_INR, eventPrice, formatInr } from "@findr/shared";

/**
 * Capacity drives the price, so they share a control. What is shown here is a
 * preview only — createEvent recomputes it server-side from the same
 * eventPrice(), so a tampered form cannot buy a cheap event.
 */
export default function CapacityPrice({ inputClassName }: { inputClassName: string }) {
  const [capacity, setCapacity] = useState("");
  const n = Number(capacity);
  const price = eventPrice(n);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="capacity" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Capacity
      </label>
      <input
        id="capacity"
        name="capacity"
        type="number"
        min={1}
        max={1000000}
        required
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="How many people are expected?"
        className={inputClassName}
      />
      <p className="flex items-baseline justify-between pt-1 text-sm" aria-live="polite">
        <span className="text-neutral-500">
          {formatInr(EVENT_BASE_FEE_INR)} base + {formatInr(EVENT_PER_HEAD_INR)} per head
        </span>
        <span className="font-mono text-lg font-medium tabular-nums">
          {price > 0 ? formatInr(price) : "—"}
        </span>
      </p>
    </div>
  );
}

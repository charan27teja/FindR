"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitLostItem, submitClaim, type LostReportState, type ClaimState, type MatchItem } from "./actions";

type EventContext = { id: string; name: string; description: string | null; when: string };

const field =
  "w-full rounded-xl bg-[#1A1A1A] border border-white/10 px-4 py-3 text-[15px] text-white placeholder-[#777777] outline-none transition-colors focus:border-white";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#AAAAAA]";

function MatchCard({ item, orgId }: { item: MatchItem; orgId: string }) {
  const [claimState, claimAction, claiming] = useActionState<ClaimState, FormData>(submitClaim, {});

  if (claimState.claimed) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-950/30 px-4 py-3">
        <p className="text-sm font-medium text-green-400">Claim submitted for {item.short_code}</p>
        <p className="mt-1 text-xs text-[#777777]">Staff will review and get back to you.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-white">{item.public_description || "Item"}</span>
        <span className="font-mono text-xs tracking-wider text-[#777777]">{item.short_code}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {item.category && (
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[#AAAAAA]">{item.category}</span>
        )}
        {item.colour && (
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[#AAAAAA]">{item.colour}</span>
        )}
        {item.found_at && (
          <span className="text-xs text-[#555555]">
            Found {new Date(item.found_at).toLocaleDateString()}
          </span>
        )}
      </div>
      {claimState.error && (
        <p className="mt-2 text-xs text-red-400">{claimState.error}</p>
      )}
      <form action={claimAction} className="mt-3">
        <input type="hidden" name="item_id" value={item.id} />
        <button
          type="submit"
          disabled={claiming}
          className="w-full rounded-full border border-white/20 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          {claiming ? "Claiming…" : "This is mine"}
        </button>
      </form>
    </div>
  );
}

export default function ReportItemClient({
  orgId,
  orgName,
  event,
  error,
}: {
  orgId: string;
  orgName: string;
  event: EventContext | null;
  error?: string;
}) {
  const [state, submit, submitting] = useActionState<LostReportState, FormData>(submitLostItem, {});

  // Success screen with potential matches
  if (state.reported) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
        <header className="flex-shrink-0 px-6 pt-10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Report filed</h1>
              <p className="text-xs text-[#AAAAAA]">We&rsquo;ll notify you when something matching turns up.</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-6 pb-8">
          {state.matches && state.matches.length > 0 ? (
            <>
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#AAAAAA]">
                Potential matches already on file
              </h2>
              {state.matches.map((item) => (
                <MatchCard key={item.id} item={item} orgId={orgId} />
              ))}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#555555]">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <p className="text-sm text-[#777777]">
                No matches right now. You&rsquo;ll get a notification if it turns up.
              </p>
            </div>
          )}

          <Link
            href="/"
            className="mt-auto w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99]"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  // Report form
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
      <header className="flex-shrink-0 px-6 pt-10 pb-4">
        <div className="flex items-start gap-3">
          <Link
            href={event ? `/search/${orgId}?report=1` : "/"}
            aria-label="Go back"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {event ? event.name : orgName}
            </h1>
            {event ? (
              <>
                <p className="truncate text-xs text-[#AAAAAA]">
                  {orgName} · {event.when}
                </p>
                {event.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-[#777777]">{event.description}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {(error || state.error) && (
        <div className="mx-6 mb-2 flex-shrink-0 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error ?? state.error}
        </div>
      )}

      <form action={submit} className="flex flex-1 flex-col gap-5 px-6 pb-8 pt-2">
        <input type="hidden" name="org_id" value={orgId} />
        {event ? <input type="hidden" name="event_id" value={event.id} /> : null}

        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#AAAAAA]">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="text-sm text-[#777777]">
            Describe what you lost and we&rsquo;ll check if it has been handed in.
          </p>
        </div>

        <div>
          <label htmlFor="r-description" className={label}>What did you lose?</label>
          <textarea
            id="r-description"
            name="description"
            required
            rows={3}
            maxLength={500}
            placeholder="A navy blue backpack with a front zip pocket and a keychain on the side."
            className={`${field} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="r-category" className={label}>Category (optional)</label>
          <input
            id="r-category"
            name="category"
            maxLength={60}
            placeholder="backpack, phone, wallet, keys…"
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-auto w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "Searching & saving…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}

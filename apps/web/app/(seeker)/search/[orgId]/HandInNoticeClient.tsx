"use client";

import { useActionState } from "react";
import Link from "next/link";
import { notifyFound, type NoticeState } from "./actions";
import OfficeMap from "@/components/OfficeMap";

type EventContext = { id: string; name: string; description: string | null; when: string };

const field =
  "w-full rounded-xl bg-[#1A1A1A] border border-white/10 px-4 py-3 text-[15px] text-white placeholder-[#777777] outline-none transition-colors focus:border-white";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#AAAAAA]";

/**
 * What a member of the public sees after finding something: where to take it,
 * and a note to the desk so they know it is coming. They do not log the item —
 * the desk does that when it arrives, so the record is written by whoever
 * actually has the object in front of them.
 */
export default function HandInNoticeClient({
  orgId,
  orgName,
  orgType,
  address,
  latitude,
  longitude,
  event,
}: {
  orgId: string;
  orgName: string;
  orgType: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  event: EventContext | null;
}) {
  const [state, action, pending] = useActionState<NoticeState, FormData>(notifyFound, {});
  const isPublicPlace = orgType === "PUBLIC";

  if (state.sent) {
    return (
      <div className="rise-stagger mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Thank you — they know it is coming.</h1>
        <p className="text-sm text-[#AAAAAA]">
          {isPublicPlace
            ? `Please hand it in at the ${orgName} lost-and-found office.`
            : `Please hand it in at the ${orgName} office${event ? `, or to the ${event.name} desk` : ""}.`}
        </p>
        <Link href="/" className="mt-4 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
          Done
        </Link>
      </div>
    );
  }

  return (
    <div className="rise-stagger mx-auto flex min-h-dvh max-w-md flex-col bg-black text-white">
      <header className="flex-shrink-0 px-6 pb-4 pt-10">
        <div className="flex items-start gap-3">
          <Link
            href={event ? `/search/${orgId}?report=1` : "/orgs?intent=report"}
            aria-label="Go back"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{event ? event.name : orgName}</h1>
            {event ? (
              <p className="truncate text-xs text-[#AAAAAA]">
                {orgName} · {event.when}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pb-8">
        <div className="rounded-2xl border border-white/15 bg-[#1A1A1A] px-5 py-5">
          <h2 className="mb-2 text-[15px] font-semibold">Please hand it in</h2>
          <p className="text-sm leading-relaxed text-[#AAAAAA]">
            {isPublicPlace ? (
              <>
                Take it to the <span className="text-white">{orgName}</span> lost-and-found
                office. The staff there will log it, and whoever lost it will be
                able to find it here.
              </>
            ) : (
              <>
                Take it to the <span className="text-white">{orgName}</span> office
                {event ? (
                  <>
                    {" "}or to the <span className="text-white">{event.name}</span> desk
                  </>
                ) : null}
                . They will log it, and whoever lost it will be able to find it here.
              </>
            )}
          </p>
        </div>

        {/* Only with real coordinates. An org nobody has placed yet gets no
            map rather than a pin in the wrong street. */}
        {latitude !== null && longitude !== null ? (
          <OfficeMap name={orgName} latitude={latitude} longitude={longitude} address={address} />
        ) : null}

        {/* Private orgs get told in advance. A public desk is staffed all day
            and does not need warning; an event desk might be a table someone
            has to walk back to. */}
        {!isPublicPlace && (
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="org_id" value={orgId} />
            {event ? <input type="hidden" name="event_id" value={event.id} /> : null}

            <div>
              <p className="mb-3 text-xs leading-relaxed text-[#777777]">
                Let the organisers know it is on its way, so someone is expecting
                you and the item is logged even if you cannot wait.
              </p>
              <label htmlFor="n-description" className={label}>What did you find?</label>
              <textarea
                id="n-description"
                name="description"
                required
                rows={3}
                maxLength={500}
                placeholder="A navy blue backpack, found near the main stage."
                className={`${field} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="n-contact" className={label}>Your contact (optional)</label>
              <input
                id="n-contact"
                name="contact"
                maxLength={120}
                placeholder="Phone or email, if they need to reach you"
                className={field}
              />
            </div>

            {state.error && (
              <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Letting them know…" : "Notify the organisers"}
            </button>
          </form>
        )}

        {isPublicPlace && (
          <Link
            href="/"
            className="mt-auto w-full rounded-full border border-white/20 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Done
          </Link>
        )}
      </div>
    </div>
  );
}

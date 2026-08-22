"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  analyseFoundItem,
  submitLostItem,
  submitClaim,
  type LostReportState,
  type ClaimState,
  type MatchItem,
} from "./actions";
import BouncingDots from "@/components/BouncingDots";
import SearchingAnimation from "@/components/SearchingAnimation";
import ScanningImagePlaceholder from "@/components/ScanningImagePlaceholder";

type EventContext = { id: string; name: string; description: string | null; when: string };

const field =
  "w-full rounded-xl bg-[#1A1A1A] border border-white/10 px-4 py-3 text-[15px] text-white placeholder-[#777777] outline-none transition-colors focus:border-white";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#AAAAAA]";

/** capture -> processing -> review -> (submitted). Same wizard as the found-item flow. */
type Step = "capture" | "processing" | "review";

function MatchCard({ item }: { item: MatchItem }) {
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
      {claimState.error && <p className="mt-2 text-xs text-red-400">{claimState.error}</p>}
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
  const [step, setStep] = useState<Step>("review");
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState({ description: "", category: "", colour: "", details: "" });
  const [pendingAnalyse, startAnalyse] = useTransition();
  const [state, submit, submitting] = useActionState<LostReportState, FormData>(submitLostItem, {});
  const cameraRef = useRef<HTMLInputElement>(null);

  function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function retake() {
    setPhoto(null);
    if (cameraRef.current) cameraRef.current.value = "";
    cameraRef.current?.click();
  }

  function analyse() {
    if (!photo) return;
    setStep("processing");
    startAnalyse(async () => {
      const result = await analyseFoundItem(photo, {
        orgName,
        eventName: event?.name,
      });
      if (result.status === "ok") {
        setFields({
          description: result.fields.description,
          category: result.fields.category,
          colour: result.fields.colour,
          details: result.fields.details ?? "",
        });
        setNotice(null);
      } else {
        setNotice(result.message);
      }
      setStep("review");
    });
  }

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  /* ── Success: report filed, show matches ─────────────────────────── */
  if (state.reported) {
    return (
      <div className="rise-stagger min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
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
                <MatchCard key={item.id} item={item} />
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

  /* ── Main wizard ─────────────────────────────────────────────────── */
  return (
    <div className="rise-stagger min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
      <header className="flex-shrink-0 px-6 pt-10 pb-4">
        <div className="flex items-start gap-3">
          <Link
            href={event ? `/search/${orgId}?report=0` : "/orgs?intent=search"}
            aria-label="Go back"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              Report a lost item
            </h1>
            <p className="truncate text-xs text-[#AAAAAA]">
              {event ? `${orgName} · ${event.when}` : orgName}
            </p>
            {event?.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-[#777777]">{event.description}</p>
            ) : null}
          </div>
        </div>
      </header>

      {(error || state.error || notice) && (
        <div className="mx-6 mb-2 flex-shrink-0 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error ?? state.error ?? notice}
        </div>
      )}

      {/* ── Step 1: Photo capture (optional for loss reports) ──────── */}
      {step === "capture" && (
        <>
          <div className="flex w-full flex-1 flex-col items-center justify-center px-6">
            {photo ? (
              <div className="relative aspect-[4/3] max-h-[40vh] w-full overflow-hidden rounded-2xl border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="Photo of the lost item" className="h-full w-full object-cover" />
              </div>
            ) : (
              <ScanningImagePlaceholder label="Add a photo (optional)" />
            )}
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 px-6 pb-8 pt-4">
            {/* accept="image/*" without capture lets the user pick from gallery */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              onChange={onCapture}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3 rounded-full bg-[#1A1A1A] px-6 py-3">
              <button
                type="button"
                onClick={() => (photo ? retake() : cameraRef.current?.click())}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 text-white transition-colors hover:border-white hover:bg-white/10"
                aria-label={photo ? "Retake the photo" : "Take a photo"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {photo ? (
                    <>
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5" />
                    </>
                  ) : (
                    <>
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                      <circle cx="12" cy="13" r="3" />
                    </>
                  )}
                </svg>
              </button>
              <span className="text-xs text-[#AAAAAA]">{photo ? "Retake photo" : "Take a photo"}</span>
            </div>

            <button
              type="button"
              onClick={analyse}
              disabled={!photo || pendingAnalyse}
              className="w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Continue
            </button>

            {/* The photo is optional, so changing your mind has to be possible.
                Without this the header's back arrow is the only way out, and
                that leaves the page entirely — taking the typed description
                with it. */}
            <button
              type="button"
              onClick={() => setStep("review")}
              className="w-full py-1 text-center text-xs text-[#AAAAAA] transition-colors hover:text-white"
            >
              Back to the description
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Processing (AI analysis) ──────────────────────── */}
      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <SearchingAnimation text="Reading the photo with AI…" />
          <p className="text-xs text-[#777777] mt-2">
            Working out what it is so you do not have to type it.
          </p>
        </div>
      )}

      {/* ── Step 3: Review & submit ───────────────────────────────── */}
      {step === "review" && (
        <form action={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8">
          <input type="hidden" name="org_id" value={orgId} />
          {event ? <input type="hidden" name="event_id" value={event.id} /> : null}
          <input type="hidden" name="photo" value={photo ?? ""} />

          {photo ? (
            <div className="relative aspect-[4/3] max-h-[32vh] w-full overflow-hidden rounded-2xl border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Photo of the lost item" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setStep("capture");
                  setNotice(null);
                }}
                className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/70 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep("capture");
                setNotice(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#555555] py-3 text-sm text-[#AAAAAA] transition-colors hover:border-white/40 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Add a photo (optional)
            </button>
          )}

          <p className="text-xs text-[#777777]">
            {photo
              ? "Check these over — correct anything the photo got wrong."
              : "Describe what you lost as precisely as you can."}
          </p>

          <div>
            <label htmlFor="r-description" className={label}>What did you lose?</label>
            <textarea
              id="r-description"
              name="description"
              required
              rows={2}
              maxLength={500}
              value={fields.description}
              onChange={set("description")}
              placeholder="A navy blue backpack with a front zip pocket."
              className={`${field} resize-y`}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="r-category" className={label}>Category</label>
              <input
                id="r-category"
                name="category"
                required
                maxLength={60}
                value={fields.category}
                onChange={set("category")}
                placeholder="backpack"
                className={field}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="r-colour" className={label}>Colour</label>
              <input
                id="r-colour"
                name="colour"
                required
                maxLength={60}
                value={fields.colour}
                onChange={set("colour")}
                placeholder="navy blue"
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="r-details" className={label}>Marks and details</label>
            <textarea
              id="r-details"
              name="details"
              rows={3}
              maxLength={500}
              value={fields.details}
              onChange={set("details")}
              placeholder="Scratches, stickers, engravings — anything that tells it apart."
              className={`${field} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-auto w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center min-h-[48px]"
          >
            {submitting ? <BouncingDots className="h-2 w-2 bg-black" /> : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { analyseFoundItem, submitFoundItem, type SubmitState } from "./actions";

type EventContext = { id: string; name: string; description: string | null; when: string };

const field =
  "w-full rounded-xl bg-[#1A1A1A] border border-white/10 px-4 py-3 text-[15px] text-white placeholder-[#777777] outline-none transition-colors focus:border-white";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#AAAAAA]";

/** capture -> processing -> review. One screen at a time, no route changes. */
type Step = "capture" | "processing" | "review";

/**
 * The desk logging an item that has been handed in. Staff only — a member of
 * the public who finds something files a notice instead and brings the object
 * over, so one person photographs and records it rather than two.
 */
export default function LogFoundItemClient({
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
  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState({ description: "", category: "", colour: "", details: "" });
  const [pendingAnalyse, startAnalyse] = useTransition();
  const [state, submit, submitting] = useActionState<SubmitState, FormData>(submitFoundItem, {});
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
    // Clearing the value matters: picking the *same* file twice fires no
    // change event otherwise, so a retake of an identical shot would do nothing.
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

  if (state.shortCode) {
    return (
      <div className="rise-stagger min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-4 px-8 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Handed in. Thank you.</h1>
        <p className="text-sm text-[#AAAAAA]">
          Reference <span className="font-mono tracking-widest text-white">{state.shortCode}</span>
        </p>
        <Link href="/" className="mt-4 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
          Done
        </Link>
      </div>
    );
  }

  return (
    <div className="rise-stagger min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
      <header className="flex-shrink-0 px-6 pt-10 pb-4">
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
            {/* At a private org the event is the headline and the org the
                subtitle: the person is standing at a fest, not at a campus. */}
            <h1 className="truncate text-xl font-bold tracking-tight">
              Log an item · {event ? event.name : orgName}
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

      {(error || state.error || notice) && (
        <div className="mx-6 mb-2 flex-shrink-0 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error ?? state.error ?? notice}
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span
            aria-hidden
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white"
          />
          <p role="status" className="text-[15px] font-medium">
            Reading the photo…
          </p>
          <p className="text-xs text-[#777777]">
            Working out what it is so you do not have to type it.
          </p>
        </div>
      )}

      {step === "capture" && (
        <>
          <div className="flex w-full flex-1 flex-col items-center justify-center px-6">
            {photo ? (
              <div className="relative aspect-[4/3] max-h-[40vh] w-full overflow-hidden rounded-2xl border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="The item you found" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] max-h-[40vh] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#555555] bg-[#1A1A1A] p-6 text-[#AAAAAA]">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-white">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className="text-sm font-medium">Photograph the item</span>
                <span className="mt-1 text-xs text-[#777777]">Hold it steady in good light.</span>
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 px-6 pb-8 pt-4">
            {/* capture="environment" asks the phone for the rear camera rather
                than the gallery, so the photo is of the thing in their hand. */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
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
          </div>
        </>
      )}

      {step === "review" && (
        <form action={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8">
          <input type="hidden" name="org_id" value={orgId} />
          {event ? <input type="hidden" name="event_id" value={event.id} /> : null}
          <input type="hidden" name="photo" value={photo ?? ""} />

          {photo ? (
            <div className="relative aspect-[4/3] max-h-[32vh] w-full overflow-hidden rounded-2xl border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="The item you found" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setStep("capture");
                  setNotice(null);
                }}
                className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/70 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black"
              >
                Retake
              </button>
            </div>
          ) : null}

          <p className="text-xs text-[#777777]">
            Check these over — correct anything the photo got wrong.
          </p>

          <div>
            <label htmlFor="f-description" className={label}>What is it?</label>
            <textarea
              id="f-description"
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
              <label htmlFor="f-category" className={label}>Category</label>
              <input
                id="f-category"
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
              <label htmlFor="f-colour" className={label}>Colour</label>
              <input
                id="f-colour"
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
            <label htmlFor="f-details" className={label}>Marks and details</label>
            <textarea
              id="f-details"
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
            className="mt-auto w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}

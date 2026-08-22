"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { submitLostItem, type MatchItem } from "./actions";
import BouncingDots from "@/components/BouncingDots";
import SearchingAnimation from "@/components/SearchingAnimation";
import ScanningImagePlaceholder from "@/components/ScanningImagePlaceholder";

type EventContext = { id: string; name: string; description: string | null; when: string };

interface DescribeItemClientProps {
  orgId: string;
  orgName: string;
  event?: EventContext | null;
  isReport: boolean;
  error?: string;
}

export default function DescribeItemClient({
  orgId,
  orgName,
  event,
  isReport,
  error,
}: DescribeItemClientProps) {
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [matches, setMatches] = useState<MatchItem[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  // Searching on submit rather than on every keystroke: a half-typed
  // description matches the wrong things, and the arrow button is already the
  // "I am done describing it" gesture.
  function runSearch() {
    if (!description.trim() || searching) return;
    startSearch(async () => {
      const form = new FormData();
      form.set("org_id", orgId);
      if (event) form.set("event_id", event.id);
      form.set("description", description);
      const result = await submitLostItem({}, form);
      if (result.error) {
        setMatches(null);
        setMatchError(result.error);
      } else {
        setMatches(result.matches ?? []);
        setMatchError(null);
      }
    });
  }

  /** Where to come back to when they close an item without claiming it. */
  const backHere = `/search/${orgId}?report=0${event ? `&event=${event.id}` : ""}`;

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="rise-stagger fixed inset-0 bg-black text-white flex flex-col max-w-md mx-auto">
      {/* Top header — event name or org name */}
      <header className="flex-shrink-0 px-6 pt-10 pb-4">
        <div className="flex items-start gap-3">
          <Link
            href={event ? `/search/${orgId}?report=${isReport ? "1" : "0"}` : `/orgs?intent=${isReport ? "report" : "search"}`}
            aria-label="Go back"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {event ? event.name : orgName}
            </h1>
            {event && (
              <>
                <p className="truncate text-xs text-[#AAAAAA]">
                  {orgName} · {event.when}
                </p>
                {event.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#777777]">{event.description}</p>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-6 mb-2 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Middle — vertically centered content */}
      <div
        className={`flex-1 flex flex-col items-center px-6 w-full ${
          matches && matches.length > 0 ? "justify-start overflow-y-auto pt-2" : "justify-center"
        }`}
      >
        {!isReport ? (
          <>
            {/* Results sit above the box: the description stays put underneath
                so it can be reworded when nothing here is right. */}
            {matches !== null && (
              <div className="mb-5 w-full">
                {matches.length > 0 ? (
                  <>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#AAAAAA]">
                      {matches.length} possible {matches.length === 1 ? "match" : "matches"}
                    </p>
                    <ul className="flex flex-col">
                      {matches.map((m) => (
                        <li key={m.id}>
                          <Link
                            href={`/items/${m.id}?from=${encodeURIComponent(backHere)}`}
                            className="flex w-full items-center gap-3 border-b border-white/10 py-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium text-white">
                                {m.public_description ?? m.category ?? "Found item"}
                              </span>
                              <span className="block truncate text-xs text-[#AAAAAA]">
                                {[m.category, m.colour].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/40">
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#333333] px-4 py-5 text-center text-sm text-[#AAAAAA]">
                    Nothing handed in matches that yet. Try different words, or
                    check back later.
                  </p>
                )}
              </div>
            )}

            {matchError && (
              <div className="mb-4 w-full rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
                {matchError}
              </div>
            )}

            <p className="mb-4 text-sm font-medium text-[#AAAAAA] text-center">
              What did you lose?
            </p>

            <form
              id="lost-item-form"
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
              className="w-full relative"
            >
              
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Describe what you lost — the more specific, the better. Enter to search."
                rows={5}
                className="w-full rounded-2xl bg-[#1A1A1A] border border-white/10 px-6 py-5 text-[15px] text-white placeholder-[#AAAAAA] outline-none resize-none leading-relaxed transition-colors duration-200 focus:border-white hover:border-white/30 pr-16"
              />

              {/* Arrow / Bouncing Dots button inside the describe box at bottom right */}
              <button
                type="submit"
                disabled={!description.trim() || searching}
                aria-label="Search for matches"
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-neutral-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {searching ? (
                  <BouncingDots className="h-1.5 w-1.5 bg-black" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            {searching ? (
              <div className="mt-2 w-full">
                <SearchingAnimation text="Searching for matching lost items…" />
              </div>
            ) : (
              <p className="mt-3 max-w-[320px] text-center text-xs leading-relaxed text-[#555555]">
                Include color, brand, size, or where you last had it.
              </p>
            )}

            {/* Photo preview (Search flow) */}
            {photo && (
              <div className="mt-4 relative w-20 h-20 rounded-xl overflow-hidden border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black border border-white/30 text-white text-xs hover:bg-white/20 transition-colors"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            )}
          </>
        ) : (
          /* Image placeholder / uploaded photo (Report flow) */
          <>
            {photo ? (
              <div className="relative w-full aspect-[4/3] max-h-[40vh] rounded-2xl overflow-hidden border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 border border-white/30 text-white text-sm hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            ) : (
              <ScanningImagePlaceholder label="No image" />
            )}
          </>
        )}
      </div>

      {/* Bottom — camera bar + continue button */}
      <div className="flex-shrink-0 px-6 pb-8 pt-4 flex flex-col gap-4">
        {/* Camera bar */}
        {isReport && (
          <div className="flex items-center justify-center rounded-full bg-[#1A1A1A] py-3 px-6">
            {/* Hidden file input for camera capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleCapture}
              className="flex items-center justify-center h-12 w-12 rounded-full border-2 border-white/40 text-white hover:border-white hover:bg-white/10 transition-colors"
              aria-label="Open camera"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </button>
            <span className="ml-3 text-xs text-[#AAAAAA]">
              {photo ? "Photo added" : "Add a photo"}
            </span>
          </div>
        )}

        {/* Note: In Search flow, the Continue button is now embedded in the textarea box */}
      </div>
    </div>
  );
}

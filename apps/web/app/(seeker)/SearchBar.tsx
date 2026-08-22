"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { eventWhen } from "./orgs/[orgId]/when";
import { startRecording, MAX_RECORDING_MS, type Recorder } from "@/lib/audio/record";
import { transcribeVoiceSearch } from "./actions";
import { OrgIcon } from "@/components/OrgIcon";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

/** Chrome and Edge expose it prefixed; Firefox does not expose it at all. */
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/** Why it stopped, in words worth showing someone. */
function voiceErrorMessage(code: string): string | null {
  switch (code) {
    case "aborted":
      return null; // They pressed stop. Not a failure.
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked. Allow it for this site in your browser settings.";
    case "no-speech":
      return "Didn't catch that — try again.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      // Chrome routes recognition through Google's speech service; plenty of
      // networks cannot reach it even when the machine is perfectly online.
      // The caller falls back to recording rather than showing this.
      return "Voice search could not reach the speech service.";
    default:
      return "Voice search failed. Try again.";
  }
}

type Org = { id: string; name: string; slug: string; type: string };
export type EventLite = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
};

export default function SearchBar({ orgs, events = [] }: { orgs: Org[]; events?: EventLite[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Picking an event does not navigate: it opens a popup that states what the
  // event is and asks which of the two things you are here to do.
  const [chosen, setChosen] = useState<EventLite | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChosen(null);
    };
    if (chosen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [chosen]);

  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Held across renders on purpose. A recognition object created inside the
  // handler is only referenced by its own callbacks, and browsers have been
  // observed collecting it mid-session — the mic light goes out and no result
  // ever arrives. Keeping it here also lets a second press stop it.
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  // Leaving the page with the microphone open is worse than a lost result.
  useEffect(() => () => {
    recognitionRef.current?.abort();
    void recorderRef.current?.stop();
  }, []);

  /**
   * Records a few seconds and has it transcribed server-side.
   *
   * Used when the browser's own recogniser cannot reach its service, which is
   * the "network" error and is not something the page can retry its way out
   * of. Same button, same states — the person is not told which engine ran.
   */
  const recordAndTranscribe = async () => {
    try {
      recorderRef.current = await startRecording();
    } catch {
      setVoiceError("Microphone blocked. Allow it for this site in your browser settings.");
      return;
    }
    setIsListening(true);
    setVoiceError(null);

    // A hard stop, so a forgotten recording cannot run forever.
    const timer = setTimeout(() => void finishRecording(), MAX_RECORDING_MS);
    recordingTimerRef.current = timer;
  };

  const finishRecording = async () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;

    setIsListening(false);
    setTranscribing(true);
    const audio = await recorder.stop();
    if (!audio) {
      setTranscribing(false);
      setVoiceError("Nothing was recorded.");
      return;
    }
    const result = await transcribeVoiceSearch(audio);
    setTranscribing(false);
    if (result.text) {
      setQuery(result.text);
      setOpen(true);
    } else {
      setVoiceError(result.error ?? "Could not make out any speech.");
    }
  };
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const PLACEHOLDERS = [
    "Search for a lost item",
    "Try 'black wallet' or 'iPhone 13'",
    "Search organisation",
    "Search by item name or category",
  ];

  useEffect(() => {
    if (isFocused || query || isListening) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3400);

    return () => clearInterval(interval);
  }, [isFocused, query, isListening, PLACEHOLDERS.length]);

  const toggleVoiceSearch = () => {
    if (transcribing) return;

    // Second press stops it. Calling start() twice throws InvalidStateError,
    // which is what the old version was quietly swallowing.
    if (isListening) {
      if (recorderRef.current) void finishRecording();
      else recognitionRef.current?.stop();
      return;
    }

    // No recogniser at all (Firefox, most in-app browsers): go straight to
    // recording rather than telling someone to change browser.
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      void recordAndTranscribe();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-US";
    // Interim results fill the box while you are still talking, which is the
    // only feedback that the microphone is actually hearing anything.
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
      setOpen(true);
    };

    recognition.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setQuery(text);
      setOpen(true);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      // "network" means the recogniser cannot reach Google's service — common
      // on localhost, behind a VPN, and in browsers built without the key.
      // Nothing the page can fix, so take the other route instead of
      // reporting a failure the person cannot act on.
      if (e.error === "network") {
        void recordAndTranscribe();
        return;
      }
      setVoiceError(voiceErrorMessage(e.error));
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError("Could not start the microphone. Try again.");
    }
  };

  const q = query.trim().toLowerCase();

  const eventsOf = (orgId: string) => events.filter((e) => e.org_id === orgId);
  const hostOf = (orgId: string) => orgs.find((o) => o.id === orgId)?.name;

  // An org earns its place by its own name or by one of its events — either
  // way the whole organisation is the result, and every event it runs is
  // listed under it. Searching "Techfusion" should show you the rest of that
  // campus's schedule too, not just the one event you happened to name.
  const filtered = q
    ? orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          eventsOf(o.id).some((e) => e.name.toLowerCase().includes(q)),
      )
    : orgs;

  // A public venue's desk is open all year and runs no events; a private
  // organisation's items live under one. That is a real difference in how you
  // reach the thing you lost, so the list says so rather than mixing them.
  const publicOrgs = filtered.filter((o) => o.type === "PUBLIC");
  const privateOrgs = filtered.filter((o) => o.type !== "PUBLIC");

  /** Expanded by hover (CSS below), or by tapping the chevron, which is the
   *  same affordance on a phone where there is no hover at all. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (orgId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(orgId)) next.add(orgId);
      return next;
    });

  function orgRow(org: Org) {
    const orgEvents = eventsOf(org.id);
    const hasTree = org.type !== "PUBLIC" && orgEvents.length > 0;
    // An org that surfaced because one of its events matched should show the
    // reason without being poked.
    const matchedByEvent = !!q && orgEvents.some((e) => e.name.toLowerCase().includes(q));
    // Named apart from the dropdown's own `open` — this is just this row's tree.
    const treeOpen = expanded.has(org.id) || matchedByEvent;

    return (
      <li key={org.id} className="group">
        <div className="flex items-center">
          <Link
            href={`/search/${org.id}`}
            onClick={() => setOpen(false)}
            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-foreground">
              <OrgIcon name={org.name} className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium">{org.name}</span>
              <span className="block text-xs uppercase tracking-wide text-neutral-500">
                {org.type.toLowerCase().replace("_", " ")}
                {hasTree ? ` · ${orgEvents.length} event${orgEvents.length === 1 ? "" : "s"}` : ""}
              </span>
            </div>
          </Link>
          {hasTree && (
            <button
              type="button"
              onClick={() => toggle(org.id)}
              aria-expanded={treeOpen}
              aria-label={`${treeOpen ? "Hide" : "Show"} events at ${org.name}`}
              className="mr-2 rounded-full p-2 text-neutral-400 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 ${treeOpen ? "rotate-90" : ""} group-hover:rotate-90`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* The tree. Hover reveals it on a pointer; group-focus-within keeps it
            reachable by keyboard; the chevron covers touch, where hover never
            fires at all. */}
        {hasTree && (
          <ul
            className={`${treeOpen ? "block" : "hidden group-hover:block group-focus-within:block"} ml-6 border-l border-foreground/15`}
          >
            {orgEvents.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setChosen(e);
                  }}
                  className="flex w-full items-baseline gap-2 py-2 pl-3 pr-4 text-left transition-colors hover:bg-foreground/5"
                >
                  <span aria-hidden className="text-neutral-400">└</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{e.name}</span>
                    <span className="block text-xs text-neutral-500">{eventWhen(e)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  const currentPlaceholder = PLACEHOLDERS[placeholderIndex];
  const nextPlaceholder = PLACEHOLDERS[(placeholderIndex + 1) % PLACEHOLDERS.length];

  return (
    <div ref={wrapperRef} className="relative z-50">
      <div className="relative flex items-center rounded-full bg-[#1A1A1A] border border-white/10 focus-within:border-white/30 transition-colors">
        {/* White magnifying glass icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-white"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        {/* Smooth vertical slide-up placeholder ticker */}
        {!query && !isFocused && !isListening && (
          <div className="pointer-events-none absolute left-12 right-12 top-1/2 -translate-y-1/2 overflow-hidden h-6 text-[14px] text-[#AAAAAA] select-none flex items-center">
            <span
              key={placeholderIndex}
              className="block truncate animate-placeholder-slide"
            >
              {PLACEHOLDERS[placeholderIndex]}
            </span>
          </div>
        )}

        {isListening && (
          <div className="pointer-events-none absolute left-12 right-12 top-1/2 -translate-y-1/2 overflow-hidden h-6 text-[14px] text-red-400 select-none flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-medium animate-pulse">Listening… speak now</span>
          </div>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVoiceError(null);
          }}
          onFocus={() => {
            setIsFocused(true);
            setOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          className="w-full rounded-full bg-transparent py-3.5 pl-12 pr-12 text-sm text-white outline-none border-0"
        />

        {/* Suitable Minimalist Microphone Icon Button */}
        <button
          type="button"
          onClick={toggleVoiceSearch}
          aria-label={transcribing ? "Transcribing" : isListening ? "Stop listening" : "Search by voice"}
          title={isListening ? "Stop listening" : "Search by voice"}
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            transcribing
              ? "bg-white/10 text-white/70 animate-pulse"
              : isListening
              ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30"
              : "text-white/60 hover:text-white hover:bg-white/10 active:scale-90"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      </div>

      {voiceError && (
        <p
          role="alert"
          className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg bg-red-950/80 px-4 py-2 text-xs text-red-200"
        >
          {voiceError}
        </p>
      )}

      {open && (
        <ul className="search-dropdown absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-foreground/15 bg-[var(--background)] py-1.5 shadow-xl">
          {filtered.length > 0 ? (
            <>
              {publicOrgs.length > 0 && (
                <li className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Public places
                </li>
              )}
              {publicOrgs.map(orgRow)}

              {privateOrgs.length > 0 && (
                <li className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Organisations
                </li>
              )}
              {privateOrgs.map(orgRow)}
            </>
          ) : (
            <li className="px-4 py-6 text-center text-sm text-neutral-500">
              {query.trim()
                ? `Nothing matches "${query}".`
                : "No organisations yet."}
            </li>
          )}
        </ul>
      )}

      {/* Centered Modal Overlay — portalled to document.body so the backdrop
          covers the entire page, not just the search bar's stacking context. */}
      {chosen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          onClick={() => setChosen(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="m-auto w-full max-w-[480px] rounded-xl bg-[#000000] border border-white/20 p-6 flex flex-col shadow-2xl relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0 pr-6">
                <h2 className="text-xl font-bold tracking-tight text-white">{chosen.name}</h2>
                <p className="mt-1 text-sm text-[#AAAAAA]">
                  {hostOf(chosen.org_id) ?? "Unknown organiser"}
                </p>
                <p className="mt-1 text-sm text-[#AAAAAA]">{eventWhen(chosen)}</p>
              </div>
              <button
                type="button"
                onClick={() => setChosen(null)}
                aria-label="Close"
                className="absolute top-5 right-5 shrink-0 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>

            <p className="whitespace-pre-line text-[15px] text-[#CCCCCC] leading-relaxed mb-8">
              {chosen.description || "No description yet."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 border-t border-white/10 pt-6">
              <Link
                href={`/search/${chosen.org_id}`}
                onClick={() => setChosen(null)}
                className="flex-1 rounded-full bg-white px-4 py-3.5 text-center text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                I lost something
              </Link>
              <Link
                href={`/search/${chosen.org_id}?report=1`}
                onClick={() => setChosen(null)}
                className="flex-1 rounded-full border border-white/20 bg-transparent px-4 py-3.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Report a lost item
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

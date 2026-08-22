"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type EventChoice = {
  id: string;
  name: string;
  description: string | null;
  when: string;
};

export default function EventPicker({
  orgId,
  orgName,
  events,
  isReport,
}: {
  orgId: string;
  orgName: string;
  events: EventChoice[];
  isReport: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<EventChoice | null>(null);

  // Handle ESC key to close modal and body scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    if (selectedEvent) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Disable background scrolling
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedEvent]);

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-10 bg-black px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs?intent=${isReport ? "report" : "search"}`}
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {isReport ? "Where did you find it?" : "Where did you lose it?"}
            </h1>
            <p className="truncate text-sm text-[#AAAAAA]">{orgName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <ul className="flex flex-col">
          {events.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setSelectedEvent(e)}
                className="flex w-full items-center gap-4 border-b border-white/10 py-5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium text-white">{e.name}</span>
                  <span className="mt-1 block text-sm text-[#AAAAAA]">{e.when}</span>
                  {e.description ? (
                    <span className="mt-2 line-clamp-2 block text-sm text-[#777777]">{e.description}</span>
                  ) : null}
                </div>
                {/* Information icon instead of chevron to hint at details */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/40">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Centered Modal Overlay */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 w-full max-w-md mx-auto"
          onClick={() => setSelectedEvent(null)}
          aria-modal="true"
          role="dialog"
        >
          {/* Modal Container */}
          <div 
            className="w-full max-w-sm rounded-[24px] bg-black border border-white/20 p-8 flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Prevent click-outside closure
          >
            {/* Top-right close icon (X) */}
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 h-8 w-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
            
            {/* Event Details */}
            <div className="mt-2 mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight pr-6">{selectedEvent.name}</h2>
              <p className="mt-2 text-[15px] font-medium text-[#AAAAAA]">{selectedEvent.when}</p>
            </div>
            
            {selectedEvent.description && (
              <div className="mb-8 text-[15px] text-[#CCCCCC] leading-relaxed">
                {selectedEvent.description}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-auto flex flex-col gap-3">
              <Link
                href={`/search/${orgId}?report=${isReport ? "1" : "0"}&event=${selectedEvent.id}`}
                className="w-full rounded-full bg-white py-4 text-center text-[15px] font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Select this Event
              </Link>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="w-full rounded-full border border-white/20 bg-transparent py-4 text-center text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

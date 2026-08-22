"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { submitLostItem } from "./actions";

interface DescribeItemClientProps {
  orgId: string;
  orgName: string;
  isReport: boolean;
  error?: string;
}

export default function DescribeItemClient({
  orgId,
  orgName,
  isReport,
  error,
}: DescribeItemClientProps) {
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 bg-black text-white flex flex-col max-w-md mx-auto">
      {/* Top header — org name */}
      <header className="flex-shrink-0 px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs?intent=${isReport ? "report" : "search"}`}
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition-colors"
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
          <h1 className="truncate text-2xl font-bold tracking-tight text-white">
            {orgName}
          </h1>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-6 mb-2 rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Middle — vertically centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 w-full">
        {!isReport ? (
          <>
            <p className="mb-4 text-sm font-medium text-[#AAAAAA] text-center">
              What did you lose?
            </p>

            <textarea
              form="lost-item-form"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you lost — the more specific, the better."
              rows={5}
              className="w-full rounded-2xl bg-[#1A1A1A] border border-white/10 px-6 py-5 text-[15px] text-white placeholder-[#AAAAAA] outline-none resize-none leading-relaxed transition-colors duration-200 focus:border-white hover:border-white/30"
            />

            <p className="mt-3 text-xs text-[#555555] leading-relaxed text-center max-w-[320px]">
              Include color, brand, size, or where you last had it.
            </p>

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
              <div className="w-full aspect-[4/3] max-h-[40vh] rounded-2xl bg-[#1A1A1A] border border-dashed border-[#555555] flex flex-col items-center justify-center p-6 text-[#AAAAAA]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-4 text-white"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-sm font-medium">No image</span>
              </div>
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

        {/* Continue button */}
        {!isReport && (
          <form id="lost-item-form" action={submitLostItem}>
            <input type="hidden" name="org_id" value={orgId} />
            <button
              type="submit"
              disabled={!description.trim()}
              className="w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

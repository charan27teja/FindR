"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut, updateProfile } from "./actions";

interface ProfileClientProps {
  initialData: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    address: string;
    phone: string;
    avatarUrl?: string;
  };
}

export default function ProfileClient({ initialData }: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    address: initialData.address,
    phone: initialData.phone,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateProfile(form);
      setIsEditing(false);
    });
  };

  const displayName = formData.lastName
    ? `${formData.firstName} ${formData.lastName}`
    : formData.firstName || "User";

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col justify-between max-w-md mx-auto px-6 py-8">
      {/* Top Header & Navigation */}
      <div>
        <div className="flex items-center justify-between pb-6">
          <Link
            href="/"
            aria-label="Go back to Home"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
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
          <span className="text-sm font-medium tracking-wide uppercase text-neutral-400">
            Profile
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Edit Profile"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
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
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </button>
        </div>

        {/* Top Profile Card */}
        <div className="flex items-center gap-5 pt-4 pb-8">
          <div className="relative flex-shrink-0">
            {initialData.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initialData.avatarUrl}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-2 border-white/30 bg-neutral-900 flex items-center justify-center text-2xl font-bold text-white tracking-wider">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-white">{displayName}</h1>
            <p className="text-sm text-neutral-400 mt-0.5">{initialData.email}</p>
          </div>
        </div>

        {/* Middle Section: Options / Info Rows */}
        <div className="mt-4 flex flex-col">
          {/* Row: First Name (Mandatory) */}
          <div className="flex items-center justify-between py-4 border-b border-white/15">
            <div className="flex items-center gap-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white flex-shrink-0"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <div>
                <span className="text-sm font-medium text-neutral-400">First Name</span>
                <span className="ml-1.5 text-xs text-neutral-500 font-normal">(Required)</span>
              </div>
            </div>
            <span className="text-sm font-medium text-white">{formData.firstName || "—"}</span>
          </div>

          {/* Row: Last Name (Optional) */}
          <div className="flex items-center justify-between py-4 border-b border-white/15">
            <div className="flex items-center gap-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white flex-shrink-0"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <div>
                <span className="text-sm font-medium text-neutral-400">Last Name</span>
                <span className="ml-1.5 text-xs text-neutral-500 font-normal">(Optional)</span>
              </div>
            </div>
            <span className="text-sm font-medium text-white">{formData.lastName || "—"}</span>
          </div>

          {/* Row: Email */}
          <div className="flex items-center justify-between py-4 border-b border-white/15">
            <div className="flex items-center gap-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white flex-shrink-0"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="text-sm font-medium text-neutral-400">Email</span>
            </div>
            <span className="text-sm font-medium text-white truncate max-w-[200px]">
              {initialData.email}
            </span>
          </div>

          {/* Row: Address */}
          <div className="flex items-center justify-between py-4 border-b border-white/15">
            <div className="flex items-center gap-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white flex-shrink-0"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm font-medium text-neutral-400">Address</span>
            </div>
            <span className="text-sm font-medium text-white">{formData.address || "—"}</span>
          </div>

          {/* Row: Phone Number */}
          <div className="flex items-center justify-between py-4 border-b border-white/15">
            <div className="flex items-center gap-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white flex-shrink-0"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="text-sm font-medium text-neutral-400">Phone Number</span>
            </div>
            <span className="text-sm font-medium text-white">{formData.phone || "—"}</span>
          </div>
        </div>
      </div>

      {/* Claims & Bottom Section */}
      <div className="pt-8 pb-4 flex flex-col gap-4">
        {/* Claims Button */}
        <Link
          href="/profile/claims"
          className="flex items-center justify-between w-full rounded-xl border border-white/20 bg-white/5 py-3.5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            <span>Your Claims</span>
          </div>
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
            className="text-neutral-400"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        {/* Sign Out Button */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-xl border border-white bg-transparent py-3.5 px-6 text-center text-sm font-medium text-white transition-colors duration-150 hover:border-red-600 hover:bg-red-600 hover:text-white active:scale-[0.99]"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black p-6 shadow-2xl">
            <h2 className="text-xl font-bold tracking-tight text-white mb-4">Edit Profile</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="first_name"
                  type="text"
                  required
                  defaultValue={formData.firstName}
                  placeholder="Enter first name"
                  className="w-full rounded-lg border border-white/20 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Last Name <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <input
                  name="last_name"
                  type="text"
                  defaultValue={formData.lastName}
                  placeholder="Enter last name"
                  className="w-full rounded-lg border border-white/20 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Address <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <input
                  name="address"
                  type="text"
                  defaultValue={formData.address}
                  placeholder="City, State"
                  className="w-full rounded-lg border border-white/20 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Phone Number <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={formData.phone}
                  placeholder="+91..."
                  className="w-full rounded-lg border border-white/20 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-lg border border-white/20 py-2.5 text-sm font-medium text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-white py-2.5 text-sm font-medium text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

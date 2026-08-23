"use client";

import { Suspense, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle } from "./actions";

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6">
      {/* Same wordmark bar as the home page */}
      <header className="rise flex items-center justify-between py-5">
        <h1 className="text-2xl font-semibold tracking-tight">FindR</h1>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 pb-12">
        <div className="rise flex flex-col items-center gap-4" style={{ animationDelay: "60ms" }}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Lost and found, without the guesswork. Sign in to continue.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => signInWithGoogle(next))}
          className="chip rise flex items-center justify-center gap-3 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium dark:border-neutral-700"
          style={{ animationDelay: "120ms" }}
        >
          {isPending ? "Working…" : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p
          className="rise text-center text-xs leading-relaxed text-neutral-500"
          style={{ animationDelay: "180ms" }}
        >
          One account covers every campus, station and event on FindR.
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

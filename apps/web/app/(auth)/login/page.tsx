"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp, type LoginState } from "./actions";

const field =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-3 outline-none " +
  "transition-colors placeholder:text-neutral-400 focus-visible:border-foreground " +
  "focus-visible:ring-2 focus-visible:ring-foreground/20 dark:border-neutral-700";

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState("");
  const [state, action, pending] = useActionState<LoginState, FormData>(
    async (prev, form) => {
      if (form.get("reset")) return { email: prev.email };
      return prev.sent ? verifyOtp(prev, form) : sendOtp(prev, form);
    },
    {},
  );

  const register = mode === "register";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6">
      {/* Same wordmark bar as the home page */}
      <header className="rise flex items-center justify-between py-5">
        <h1 className="text-2xl font-semibold tracking-tight">Findr</h1>
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
              {state.sent ? "Check your email" : register ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {state.sent
                ? `Enter the six-digit code we sent to ${state.email}.`
                : register
                  ? "One account covers every campus, station and event on Findr."
                  : "Sign in with your email — there is no password to remember."}
            </p>
          </div>
        </div>

        {!state.sent && (
          <>
            {/* Sign in / Register segmented control */}
            <div
              role="tablist"
              aria-label="Account"
              className="rise flex rounded-lg border border-neutral-300 p-1 dark:border-neutral-700"
              style={{ animationDelay: "120ms" }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m ? "bg-accent text-background" : "text-neutral-500 hover:text-foreground"
                  }`}
                >
                  {m === "login" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setNotice("Google sign-in is not connected yet — use your email for now.")}
              className="chip rise flex items-center justify-center gap-3 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium dark:border-neutral-700"
              style={{ animationDelay: "180ms" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              Continue with Google
            </button>

            <div className="rise flex items-center gap-3" style={{ animationDelay: "220ms" }}>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-xs uppercase tracking-wider text-neutral-500">or</span>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </>
        )}

        <form action={action} className="rise flex flex-col gap-3" style={{ animationDelay: "260ms" }}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />

          {state.sent ? (
            <>
              <input type="hidden" name="email" value={state.email} />
              <label htmlFor="token" className="sr-only">
                Six-digit code
              </label>
              <input
                id="token"
                name="token"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                required
                autoFocus
                className={`${field} text-center font-mono text-2xl tracking-[0.4em]`}
              />
            </>
          ) : (
            <>
              {register && (
                <>
                  <label htmlFor="name" className="sr-only">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    className={field}
                  />
                </>
              )}
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                defaultValue={state.email}
                required
                autoFocus={!register}
                className={field}
              />
            </>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-3 font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
          >
            {pending ? "Working…" : state.sent ? "Verify code" : register ? "Create account" : "Send code"}
          </button>

          {state.sent && (
            <button
              type="submit"
              name="reset"
              value="1"
              formNoValidate
              className="self-start text-sm text-neutral-500 underline underline-offset-4 hover:text-foreground"
            >
              Use a different email
            </button>
          )}

          {(state.error || notice) && (
            <p role="alert" className="rounded-lg border border-foreground/30 px-4 py-3 text-sm">
              {state.error || notice}
            </p>
          )}
        </form>

        {!state.sent && (
          <p
            className="rise text-center text-xs leading-relaxed text-neutral-500"
            style={{ animationDelay: "300ms" }}
          >
            {register ? "Already have an account? " : "New to Findr? "}
            <button
              type="button"
              onClick={() => setMode(register ? "login" : "register")}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {register ? "Sign in" : "Create one"}
            </button>
          </p>
        )}
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

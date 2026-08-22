"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { sendOtp, verifyOtp, type LoginState } from "./actions";

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(
    async (prev, form) => (prev.sent ? verifyOtp(prev, form) : sendOtp(prev, form)),
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Findr</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {state.sent
            ? `We sent a six-digit code to ${state.email}.`
            : "Sign in with your email. No password to remember."}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        {state.sent ? (
          <>
            <input type="hidden" name="email" value={state.email} />
            <input
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              required
              autoFocus
              className="rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
            />
          </>
        ) : (
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            defaultValue={state.email}
            required
            autoFocus
            className="rounded-lg border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
          />
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Working…" : state.sent ? "Verify code" : "Send code"}
        </button>

        {state.error && <p className="text-sm text-neutral-500">{state.error}</p>}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

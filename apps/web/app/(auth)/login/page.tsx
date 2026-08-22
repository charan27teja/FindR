"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp, type LoginState } from "./actions";

const field =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-3 outline-none " +
  "transition-colors placeholder:text-neutral-400 focus-visible:border-foreground " +
  "focus-visible:ring-2 focus-visible:ring-foreground/20 dark:border-neutral-700";

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(
    async (prev, form) => {
      if (form.get("reset")) return { email: prev.email };
      return prev.sent ? verifyOtp(prev, form) : sendOtp(prev, form);
    },
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-[0.12em]">FindR</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          {state.sent
            ? `Enter the six-digit code we sent to ${state.email}.`
            : "Lost and found, without the guesswork. Sign in with your email — there is no password to remember."}
        </p>
      </header>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />

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
              autoFocus
              className={field}
            />
          </>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-3 font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
        >
          {pending ? "Working…" : state.sent ? "Verify code" : "Send code"}
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

        {state.error && (
          <p
            role="alert"
            className="rounded-lg border border-foreground/30 px-4 py-3 text-sm"
          >
            {state.error}
          </p>
        )}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="splash" aria-hidden="true">
        <span className="splash-mark">FindR</span>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}

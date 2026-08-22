"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitClaim, type ClaimState } from "../../search/[orgId]/actions";

export default function ClaimButton({
  itemId,
  alreadyClaimed,
}: {
  itemId: string;
  alreadyClaimed: boolean;
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(submitClaim, {});

  if (alreadyClaimed || state.claimed) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm">
          Claim submitted. The desk will be in touch.
        </p>
        <Link
          href="/profile/claims"
          className="rounded-full border border-white/20 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          See your claims
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="item_id" value={itemId} />
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Submitting…" : "This is mine — submit a claim"}
      </button>
    </form>
  );
}

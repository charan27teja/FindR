import BouncingDots from "@/components/BouncingDots";

/**
 * Without a loading.tsx there is no Suspense boundary, so a click showed the
 * *previous* page, unchanged, until the new one's server render had finished
 * every query — which reads as a frozen app rather than a slow one.
 *
 * This is the whole fix for that: Next streams this immediately on navigation
 * and swaps in the page when it is ready. It does not make the queries faster,
 * it makes the wait visible.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black">
      <BouncingDots className="h-2 w-2 bg-white/70" />
    </div>
  );
}

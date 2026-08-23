import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * The icon reel from the startup sequence — the part after the wordmark clears.
 * Stepping into the lost-item flows used to drop to a bare row of dots, which
 * read as a different, lesser app than the one that had just introduced itself.
 *
 * `intro={false}` skips the wordmark and the opening flash: those introduce the
 * app once, and this screen can appear on any navigation.
 */
export default function Loading() {
  return <LoadingScreen intro={false} />;
}

import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Bypasses RLS and the INV-1 column grant. Legitimate uses are exactly:
 *  - intake writes and enrichment jobs
 *  - reading `private_attributes` to build or score a challenge
 *  - minting signed URLs after an authorisation check
 *  - writing audit_events
 *
 * Never hand its output to a serialiser other than the ones in lib/serializers.
 * `server-only` makes importing this from a client component a build error.
 */
export function serviceDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** INV-2: every URL we hand out is signed and short-lived. */
export const SIGNED_URL_TTL_SECONDS = 15 * 60;

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await serviceDb()
    .storage.from("items")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

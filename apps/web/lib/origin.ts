import { headers } from "next/headers";

/**
 * The URL this request arrived on.
 *
 * Taken from the request, not from a constant, so testing on a phone over the
 * LAN comes back to the phone rather than to the developer's laptop. `origin`
 * is present on a server action POST; the host header is the fallback for the
 * cases where it is stripped. The hardcoded default is last and is only ever
 * hit if both are missing.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000";
}

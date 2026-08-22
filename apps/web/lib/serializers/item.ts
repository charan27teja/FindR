import { SEEKER_ITEM_FIELDS, PRIVATE_ITEM_FIELDS } from "@findr/shared";

export type SeekerItem = {
  [K in (typeof SEEKER_ITEM_FIELDS)[number]]: unknown;
} & { image_redacted_url: string | null; reason?: string };

/**
 * INV-1 / INV-2. The ONLY way an item reaches a seeker.
 *
 * Allowlist, not denylist: a column added to `items` tomorrow is invisible
 * here until someone deliberately adds it to SEEKER_ITEM_FIELDS. `image_full_url`
 * is not constructible from this output — the caller never gets the storage path.
 */
export function serialiseItemForSeeker(
  row: Record<string, unknown>,
  opts: { imageRedactedUrl?: string | null; reason?: string } = {},
): SeekerItem {
  const out: Record<string, unknown> = {};
  for (const f of SEEKER_ITEM_FIELDS) out[f] = row[f] ?? null;
  out.image_redacted_url = opts.imageRedactedUrl ?? null;
  if (opts.reason) out.reason = opts.reason;
  return out as SeekerItem;
}

export function serialiseItemsForSeeker(
  rows: Record<string, unknown>[],
  urls: (string | null)[] = [],
): SeekerItem[] {
  return rows.map((r, i) => serialiseItemForSeeker(r, { imageRedactedUrl: urls[i] ?? null }));
}

/**
 * Last-chance tripwire. Walks an arbitrary payload and throws if a private
 * field name appears anywhere in it. Cheap enough to run on every seeker
 * response; see the route handlers in app/api.
 */
export function assertNoPrivateFields(payload: unknown, path = "$"): void {
  if (payload === null || typeof payload !== "object") return;
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoPrivateFields(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(payload)) {
    if ((PRIVATE_ITEM_FIELDS as readonly string[]).includes(k)) {
      throw new Error(`INV-1 violation: private field "${k}" at ${path}`);
    }
    assertNoPrivateFields(v, `${path}.${k}`);
  }
}

import { db } from "@/lib/db/client";
import { markClaimCollected } from "./actions";
import { ClientDate } from "@/components/ClientDate";

/**
 * Claims waiting on an organisation's items, and the button that settles one.
 *
 * Scoped by event when given — a private org handles claims on the event page,
 * because that is where its items live. A public venue has no events at all,
 * so its console shows the whole desk instead. Same markup either way; the
 * only difference is which items are counted.
 */
export default async function ClaimsSection({
  orgId,
  eventId,
}: {
  orgId: string;
  eventId?: string;
}) {
  const supabase = await db();

  let itemQuery = supabase
    .from("items")
    .select("id,short_code,public_description,category,colour")
    .eq("org_id", orgId);
  if (eventId) itemQuery = itemQuery.eq("event_id", eventId);
  const { data: itemRows } = await itemQuery;

  const items = (itemRows ?? []) as {
    id: string;
    short_code: string;
    public_description: string | null;
    category: string | null;
  }[];
  const itemById = new Map(items.map((i) => [i.id, i]));

  const { data: claimRows } = items.length
    ? await supabase
        .from("claims")
        .select("id,item_id,user_id,status,created_at")
        .in("item_id", items.map((i) => i.id))
        .order("created_at", { ascending: false })
    : { data: [] };
  const claims = (claimRows ?? []) as {
    id: string;
    item_id: string;
    user_id: string;
    status: string;
    created_at: string;
  }[];

  // profiles_claimant_read is what makes this readable, and only for people
  // who have actually claimed something here.
  const claimantIds = [...new Set(claims.map((c) => c.user_id))];
  const { data: profileRows } = claimantIds.length
    ? await supabase.from("profiles").select("id,email,phone").in("id", claimantIds)
    : { data: [] };
  const profileById = new Map(
    ((profileRows ?? []) as { id: string; email: string | null; phone: string | null }[]).map(
      (p) => [p.id, p],
    ),
  );

  return (
    <section className="rise mb-8" style={{ animationDelay: "150ms" }}>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
        Claims{claims.length > 0 ? ` (${claims.length})` : ""}
      </h2>
      {claims.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {claims.map((c) => {
            const item = itemById.get(c.item_id);
            const who = profileById.get(c.user_id);
            const collected = c.status === "COLLECTED";
            return (
              <li
                key={c.id}
                className={`rounded-xl border px-4 py-3 ${collected ? "border-neutral-200 opacity-60 dark:border-neutral-800" : "border-neutral-300 dark:border-neutral-700"}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">
                    {item?.public_description ?? item?.category ?? "Item"}
                  </span>
                  <span className="shrink-0 font-mono text-xs tracking-wider text-neutral-500">
                    {item?.short_code}
                  </span>
                </div>
                <dl className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500">
                  <div className="flex gap-2">
                    <dt>Claimed by</dt>
                    <dd className="text-foreground">{who?.email ?? "Unknown"}</dd>
                  </div>
                  {who?.phone ? (
                    <div className="flex gap-2">
                      <dt>Phone</dt>
                      <dd className="text-foreground">{who.phone}</dd>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <dt>Filed</dt>
                    <dd><ClientDate date={c.created_at} /></dd>
                  </div>
                </dl>

                {collected ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Picked up
                  </p>
                ) : (
                  <form action={markClaimCollected} className="mt-3">
                    <input type="hidden" name="org_id" value={orgId} />
                    <input type="hidden" name="event_id" value={eventId ?? ""} />
                    <input type="hidden" name="claim_id" value={c.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
                    >
                      Mark as picked up
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No claims yet.
        </p>
      )}
    </section>
  );
}

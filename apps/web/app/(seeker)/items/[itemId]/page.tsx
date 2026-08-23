import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { assertNoPrivateFields, serialiseItemForSeeker } from "@/lib/serializers/item";
import { serviceDb, signedUrl } from "@/lib/db/service";
import ClaimButton from "./ClaimButton";

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requireUser();
  const { itemId } = await params;
  const { from } = await searchParams;

  const supabase = await db();
  // Only the granted columns are asked for. Naming a private one here would be
  // rejected by the grant itself, not merely by a policy (INV-1).
  const { data: item, error } = await supabase
    .from("items")
    .select("id,org_id,node_id,short_code,state,category,colour,material,condition,public_description,enrichment_status,found_at")
    .eq("id", itemId)
    .single();

  if (error && error.code !== "PGRST116") {
    return (
      <div className="min-h-dvh bg-black px-6 py-10 text-white">
        <p role="alert" className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-300">
          Could not load this item: {error.message}
        </p>
      </div>
    );
  }
  if (!item) notFound();

  // Belt and braces: the row went through the allowlist, and the tripwire
  // checks the result rather than trusting that it did.
  const safe = serialiseItemForSeeker(item as Record<string, unknown>);
  assertNoPrivateFields(safe);

  // org, media, signed URL, and existing claim are all independent of each
  // other — run them in one wall-clock wait instead of four sequential ones.
  const orgId = (item as Record<string, unknown>).org_id as string;
  const [{ data: org }, { data: media }, existing] = await Promise.all([
    supabase
      .from("orgs")
      .select("name")
      .eq("id", orgId)
      .single(),
    // The photo. Read with the service role because image_full_path is a private
    // column — the grant does not expose it, so the RLS client above genuinely
    // cannot see it.
    serviceDb()
      .from("items")
      .select("image_redacted_path,image_full_path")
      .eq("id", itemId)
      .single(),
    // Has this person already claimed it? claims_own means this returns their
    // own row or nothing — never anyone else's (INV-5).
    supabase
      .from("claims")
      .select("id,status")
      .eq("item_id", itemId)
      .maybeSingle()
      .then((r: { data: unknown }) => r.data),
  ]);

  // The redacted crop is preferred when one exists; nothing produces one yet,
  // so in practice this is the full photograph. Only the signed URL crosses
  // into the page — the storage path itself never leaves this function.
  const imageUrl = await signedUrl(
    (media?.image_redacted_path as string | null) ?? (media?.image_full_path as string | null) ?? null,
  );

  const rows: [string, string | null][] = [
    ["Reference", safe.short_code ? String(safe.short_code) : null],
    ["Category", safe.category ? String(safe.category) : null],
    ["Colour", safe.colour ? String(safe.colour) : null],
    ["Material", safe.material ? String(safe.material) : null],
    ["Marks and details", safe.condition ? String(safe.condition) : null],
    ["Handed in", safe.found_at ? new Date(String(safe.found_at)).toLocaleString() : null],
    ["Status", safe.state ? String(safe.state).toLowerCase() : null],
  ];

  return (
    <div className="rise-stagger mx-auto flex min-h-dvh max-w-md flex-col bg-black text-white">
      <header className="flex-shrink-0 px-6 pb-4 pt-10">
        <div className="flex items-start gap-3">
          <a
            href={from ?? "/"}
            aria-label="Go back"
            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {safe.public_description ? String(safe.public_description) : "Found item"}
            </h1>
            {org?.name ? <p className="truncate text-sm text-[#AAAAAA]">{org.name as string}</p> : null}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {imageUrl ? (
          <div className="mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/15 bg-[#1A1A1A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={safe.public_description ? String(safe.public_description) : "The found item"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <dl className="flex flex-col">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/10 py-3">
                <dt className="text-xs uppercase tracking-wider text-[#AAAAAA]">{k}</dt>
                <dd className="text-right text-sm text-white">{v}</dd>
              </div>
            ))}
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-[#777777]">
          If this is yours, claim it and the desk will confirm a few details
          with you before handing it over.
        </p>

        <div className="mt-6">
          {/* A returned item is a record, not something still on the shelf.
              Offering a claim on it would be a dead end. */}
          {String(safe.state) === "LISTED" ? (
            <ClaimButton itemId={String(safe.id)} alreadyClaimed={!!existing} />
          ) : (
            <p className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm text-[#AAAAAA]">
              This item has already been returned to its owner.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

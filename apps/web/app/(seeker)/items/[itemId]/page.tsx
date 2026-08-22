import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { assertNoPrivateFields, serialiseItemForSeeker } from "@/lib/serializers/item";
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

  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", (item as Record<string, unknown>).org_id as string)
    .single();

  // Belt and braces: the row went through the allowlist, and the tripwire
  // checks the result rather than trusting that it did.
  const safe = serialiseItemForSeeker(item as Record<string, unknown>);
  assertNoPrivateFields(safe);

  // Has this person already claimed it? claims_own means this returns their
  // own row or nothing — never anyone else's (INV-5).
  const { data: existing } = await supabase
    .from("claims")
    .select("id,status")
    .eq("item_id", itemId)
    .maybeSingle();

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-black text-white">
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

        {/* INV-3: the desk keeps the photograph. Someone who can see it could
            answer the ownership questions from it, which is the one thing a
            claim has to prove without help. */}
        <p className="mt-4 text-xs leading-relaxed text-[#777777]">
          The photograph stays with the desk. If this is yours, claim it and you
          will be asked a few questions only its owner could answer.
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

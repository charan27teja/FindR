import { db } from "@/lib/db/client";
import { serviceDb } from "@/lib/db/service";
import { requireUser } from "@/lib/auth";
import OrganiserForm from "./OrganiserForm";
import { removeOrganiser } from "./actions";

/**
 * Everyone who runs this organisation, and the field that adds another.
 *
 * The page has already refused anyone who is not an ORG_ADMIN here, so this
 * renders unconditionally. The membership read still goes through RLS —
 * memberships_self covers an admin reading their own org — but the addresses
 * behind those ids do not: profiles_self only ever returns your own row, so
 * the emails need the service role.
 */
export default async function OrganisersSection({ orgId }: { orgId: string }) {
  const user = await requireUser();
  const supabase = await db();

  const { data: rows } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "ORG_ADMIN");
  const ids = [...new Set(((rows ?? []) as { user_id: string }[]).map((r) => r.user_id))];

  const { data: profiles } = ids.length
    ? await serviceDb().from("profiles").select("id,email").in("id", ids)
    : { data: [] };
  const organisers = ((profiles ?? []) as { id: string; email: string | null }[]).sort((a, b) =>
    (a.email ?? "").localeCompare(b.email ?? ""),
  );

  return (
    <section className="rise mt-8" style={{ animationDelay: "150ms" }}>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
        Organisers ({organisers.length})
      </h2>

      <ul className="mb-3 flex flex-col gap-2">
        {organisers.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
          >
            <span className="min-w-0 truncate text-sm">
              {o.email ?? "No address on file"}
              {o.id === user.id ? <span className="text-neutral-500"> · you</span> : null}
            </span>
            {o.id === user.id ? null : (
              <form action={removeOrganiser} className="shrink-0">
                <input type="hidden" name="org_id" value={orgId} />
                <input type="hidden" name="user_id" value={o.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${o.email ?? "this organiser"}`}
                  className="rounded-full p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <OrganiserForm orgId={orgId} />
      <p className="mt-2 text-xs text-neutral-500">
        An organiser can log items, settle claims, and add other organisers.
      </p>
    </section>
  );
}

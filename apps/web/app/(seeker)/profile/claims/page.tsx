import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import Link from "next/link";

export const metadata = {
  title: "Your Claims - FindR",
};

type ClaimRecord = {
  id: string;
  status: string;
  created_at: string;
  items: {
    id: string;
    short_code: string;
    category: string;
    public_description: string;
  } | null;
  orgs: {
    id: string;
    name: string;
  } | null;
};

export default async function ClaimsPage() {
  const user = await requireUser();
  const supabase = await db();

  const { data: claims, error } = await supabase
    .from("claims")
    .select(`
      id,
      status,
      created_at,
      items (
        id,
        short_code,
        category,
        public_description
      ),
      orgs (
        id,
        name
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Type assertion since Supabase returns a complex nested type
  const typedClaims = (claims || []) as unknown as ClaimRecord[];

  return (
    <div className="rise-stagger min-h-dvh bg-black text-white max-w-md mx-auto px-6 py-8">
      <div className="flex items-center pb-8 gap-4">
        <Link
          href="/profile"
          className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Your Claims</h1>
      </div>

      <div className="flex flex-col gap-4">
        {error ? (
          <p className="text-red-400 text-sm text-center pt-10">
            Failed to load claims.
          </p>
        ) : typedClaims.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center pt-10">
            You haven&apos;t made any claims yet.
          </p>
        ) : (
          typedClaims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-white/15 bg-white/5 p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">{claim.items?.category || "Unknown Item"}</span>
                <span className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/20">
                  {claim.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-2">
                {claim.items?.public_description || "No description available."}
              </p>
              <div className="flex justify-between items-end mt-2">
                <span className="text-xs text-neutral-500">
                  {claim.orgs?.name || "Unknown Location"}
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(claim.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

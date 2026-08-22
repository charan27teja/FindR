import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * RLS-aware client: runs as the signed-in user, so every tenant-scoped query
 * is filtered by the policies in supabase/migrations/*_rls.sql (INV-4).
 * Use this by default. Reach for the service client only where documented.
 */
export async function db() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          // No-op in server components; middleware.ts owns cookie writes.
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}

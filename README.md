# Findr

Multi-tenant lost-and-found. Build spec: [`FindR_requirement.md`](./FindR_requirement.md) — it wins over every other doc, this one included.

## Status

**M0 — Foundations: done.** M1 (intake) is next.

| M0 item | Where |
|---|---|
| Migrations, RLS policies | `supabase/migrations/` |
| Seed: one org, five nodes | `supabase/seed.sql` |
| Auth (email OTP), roles, membership | `app/(auth)/login/`, `lib/auth.ts`, `app/(seeker)/orgs/` |
| Allowlist serialiser + leak test | `lib/serializers/item.ts` + `item.test.ts` |

## Running it

```bash
npm install
supabase start                 # or point at a cloud project
supabase db reset              # applies migrations + seed
cp .env.example apps/web/.env.local   # fill in the three Supabase values
npm run dev
```

Staff roles cannot be seeded — `auth.users` rows only exist after a first sign-in.
Log in once as your demo staff account, then in the SQL editor:

```sql
select grant_role('staff@example.com', 'snist', 'INTAKE_STAFF');
```

## Checks

```bash
npm test        # includes the INV-1 leak test
npm run lint
npm run typecheck
```

## How the invariants are enforced

- **INV-1** — two independent layers. The `authenticated` role has *no grant* on
  `private_attributes`, `ocr_text` or `image_full_path`, so no anon-key query can
  read them at all. On top of that, `serialiseItemForSeeker` is an allowlist and
  `assertNoPrivateFields` is a tripwire for anything assembled by hand.
- **INV-2** — `signedUrl()` in `lib/db/service.ts` is the only URL minter, and it
  is 15-minute signed against a private bucket.
- **INV-4** — Postgres RLS with `is_org_member` / `has_org_role`. No policy match
  means zero rows; a seeker with no membership sees nothing, by construction.
- **INV-7** — `update` and `delete` on `audit_events` are revoked from
  `authenticated`, `anon` *and* `service_role`.

INV-3, INV-5, INV-6 and INV-8 land with M1–M3.

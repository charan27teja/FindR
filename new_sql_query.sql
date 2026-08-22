-- ============================================================================
-- FindR — catch-up migration
--
-- Everything from 20260822200000 to 20260822270000, in order, as one script.
-- Paste the whole thing into the Supabase SQL Editor and Run.
--
-- SAFE TO RE-RUN. Every statement is guarded (`if exists` / `if not exists`,
-- and every policy is dropped before it is created), so running it twice, or
-- running it when some of these have already been applied, does nothing the
-- second time. You do not need to know which ones are already in.
--
-- NOT included, because they are already applied and are NOT re-runnable:
--   20260822160000_events_end_date            (adds a constraint by name)
--   20260822180000_event_description_...      (already live)
-- ============================================================================


-- ── 20260822200000 · nobody grants themselves a membership ──────────────────
-- Joining an organisation is gone: you select one, nothing is stored. This
-- policy used to let any signed-in user grant themselves SEEKER anywhere.
drop policy if exists memberships_self_join on memberships;


-- ── 20260822210000 · which event an item was found at ───────────────────────
alter table items add column if not exists event_id uuid references events(id);
create index if not exists items_event_id_idx on items (event_id);

-- The grant in the RLS migration is an allowlist, not a default: a column that
-- is not named there stays invisible to the API even when a policy allows the
-- row. New column, so it has to be granted deliberately.
grant select (event_id) on items to authenticated;


-- ── 20260822220000 · seekers can see listed items and file a claim ──────────
-- Both of these required is_org_member(), which nobody satisfies now that
-- joining is gone — so search returned nothing and claiming always failed.
-- This does not widen what a seeker sees of an item: the column grant is
-- untouched, so private_attributes, ocr_text and image_full_path stay
-- unreachable, and only state = 'LISTED' rows match at all.
drop policy if exists items_seeker_listed on items;
create policy items_seeker_listed on items for select to authenticated
  using (state = 'LISTED');

drop policy if exists claims_own_create on claims;
create policy claims_own_create on claims for insert to authenticated
  with check (user_id = auth.uid());


-- ── 20260822230000 · a loss report can carry a photo and detail ─────────────
alter table loss_reports add column if not exists colour text;
alter table loss_reports add column if not exists image_path text;
alter table loss_reports add column if not exists event_id uuid references events(id);
create index if not exists loss_reports_event_id_idx on loss_reports (event_id);


-- ── 20260822240000 · anyone signed in may file a loss report ────────────────
-- Same membership problem. You do not need to be a member of an organisation
-- to say "I lost my bag at your venue".
--
-- The drops below are wider than the original migration: it created these four
-- policies unguarded, so re-running it errored with "policy already exists".
drop policy if exists loss_reports_own on loss_reports;
drop policy if exists loss_reports_own_read on loss_reports;
drop policy if exists loss_reports_own_update on loss_reports;
drop policy if exists loss_reports_own_delete on loss_reports;
drop policy if exists loss_reports_insert on loss_reports;

create policy loss_reports_own_read on loss_reports for select to authenticated
  using (user_id = auth.uid());
create policy loss_reports_own_update on loss_reports for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy loss_reports_own_delete on loss_reports for delete to authenticated
  using (user_id = auth.uid());
create policy loss_reports_insert on loss_reports for insert to authenticated
  with check (user_id = auth.uid());


-- ── 20260822250000 · "someone is bringing you something" ────────────────────
-- A finder does not log the item; they carry it to the desk and the desk logs
-- it. This table is the message between the two, so an event's organisers know
-- to expect it.
create table if not exists found_notices (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  event_id    uuid references events(id),
  reported_by uuid references profiles(id),
  description text not null,
  contact     text,
  status      text not null default 'OPEN',   -- OPEN | LOGGED | CLOSED
  created_at  timestamptz default now()
);

create index if not exists found_notices_org_status_idx
  on found_notices (org_id, status, created_at desc);

alter table found_notices enable row level security;

-- No membership check: the whole point is that a passer-by can do this.
drop policy if exists found_notices_insert on found_notices;
create policy found_notices_insert on found_notices for insert to authenticated
  with check (reported_by = auth.uid());

drop policy if exists found_notices_own_read on found_notices;
create policy found_notices_own_read on found_notices for select to authenticated
  using (reported_by = auth.uid());

drop policy if exists found_notices_staff_read on found_notices;
create policy found_notices_staff_read on found_notices for select to authenticated
  using (is_org_staff(org_id));

drop policy if exists found_notices_staff_update on found_notices;
create policy found_notices_staff_update on found_notices for update to authenticated
  using (is_org_staff(org_id)) with check (is_org_staff(org_id));


-- ── 20260822260000 · the desk can reach whoever claimed ─────────────────────
-- profiles_self limits reading a profile to its owner, which is right
-- everywhere except here — handing an item back means contacting the claimant.
--
-- Deliberately narrow: it opens exactly the profiles of people who have filed
-- a claim in YOUR org, to that org's verifiers and admins. No claim, no
-- visibility. It is not a user directory.
drop policy if exists profiles_claimant_read on profiles;
create policy profiles_claimant_read on profiles for select to authenticated
  using (exists (
    select 1 from claims c
    where c.user_id = profiles.id
      and has_org_role(c.org_id, array['VERIFIER','ORG_ADMIN']::role_name[])
  ));


-- ── 20260822270000 · where to carry a found item ────────────────────────────
-- `location` is a human-readable address; these are what a map needs.
-- Nullable: an org nobody has placed yet gets no map rather than a pin in the
-- wrong street.
alter table orgs add column if not exists latitude  double precision;
alter table orgs add column if not exists longitude double precision;

-- The seeded venues are real places, so give them real coordinates instead of
-- a placeholder pin. Only filled in when still null, so this never overwrites
-- a coordinate someone has set by hand.
update orgs set latitude = 17.4375, longitude = 78.4483
  where name = 'Hyderabad Metro' and latitude is null;
update orgs set latitude = 17.4339, longitude = 78.5017
  where name = 'Secunderabad Railway Station' and latitude is null;
update orgs set latitude = 17.3616, longitude = 78.4747
  where name = 'Charminar' and latitude is null;
update orgs set latitude = 17.4435, longitude = 78.4772
  where name = 'Jubilee Bus Station' and latitude is null;
update orgs set latitude = 17.3775, longitude = 78.4805
  where name in ('Mahatma Gandhi Bus Station', 'MGBS Bus Terminal') and latitude is null;
update orgs set latitude = 17.2403, longitude = 78.4294
  where name = 'Rajiv Gandhi International Airport' and latitude is null;


-- ── Finally ─────────────────────────────────────────────────────────────────
-- PostgREST caches the schema; without this the new columns and tables stay
-- invisible to the API until its next automatic reload. This is what clears
-- the "Could not find the X column in the schema cache" errors.
notify pgrst, 'reload schema';

-- Organisation self-service: an address, the people responsible for the desk,
-- and events run under the org.

-- Street address / city. `nodes` are locations *inside* an org (desk, platform);
-- this is where the org itself is.
alter table orgs add column if not exists location text;

-- The people a seeker or the platform contacts about this org. At least one
-- contact row is required at creation time and each row needs an email or a
-- phone; the "at most 3" cap is enforced in the create action rather than by a
-- trigger, since nothing else writes this table.
create table if not exists org_contacts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  email      text,
  phone      text,
  created_at timestamptz default now(),
  constraint org_contacts_reachable check (
    coalesce(nullif(btrim(email), ''), nullif(btrim(phone), '')) is not null
  )
);
create index if not exists org_contacts_org_id_idx on org_contacts (org_id);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  event_date  date not null,
  starts_at   time not null,
  ends_at     time not null,
  capacity    integer not null check (capacity > 0),
  -- Derived from capacity by eventPrice() in packages/shared. Stored rather
  -- than generated so the formula lives in exactly one place and retuning it
  -- does not need a migration. The server action always recomputes it; the
  -- number the browser shows is a preview and is never trusted.
  price_inr   integer not null check (price_inr >= 0),
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  constraint events_time_order check (ends_at > starts_at)
);
create index if not exists events_org_id_event_date_idx on events (org_id, event_date);

alter table org_contacts enable row level security;
alter table events enable row level security;

-- Contact details of named individuals: staff only, never the seeker list.
drop policy if exists org_contacts_staff_read on org_contacts;
create policy org_contacts_staff_read on org_contacts for select to authenticated
  using (is_org_staff(org_id));
drop policy if exists org_contacts_admin_write on org_contacts;
create policy org_contacts_admin_write on org_contacts for all to authenticated
  using (has_org_role(org_id, array['ORG_ADMIN']::role_name[]))
  with check (has_org_role(org_id, array['ORG_ADMIN']::role_name[]));

-- Events are visible to anyone in the org; only an admin may schedule one.
drop policy if exists events_member_read on events;
create policy events_member_read on events for select to authenticated
  using (is_org_member(org_id));
drop policy if exists events_admin_write on events;
create policy events_admin_write on events for all to authenticated
  using (has_org_role(org_id, array['ORG_ADMIN']::role_name[]))
  with check (has_org_role(org_id, array['ORG_ADMIN']::role_name[]));

-- PostgREST caches the schema; without this the new column and tables stay
-- invisible to the API until the next automatic reload.
notify pgrst, 'reload schema';

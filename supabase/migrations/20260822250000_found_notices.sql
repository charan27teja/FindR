-- Someone who finds an item does not log it themselves: they carry it to the
-- desk, and the desk logs it. This table is the message between the two — "a
-- person is on their way to you with something" — so the organisers of a
-- private event know to expect it rather than finding out when the finder
-- gives up and walks off with it.

create table if not exists found_notices (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  event_id    uuid references events(id),
  reported_by uuid references profiles(id),
  description text not null,
  -- How the desk reaches the finder if they do not arrive. Optional: a notice
  -- with no contact is still worth having.
  contact     text,
  status      text not null default 'OPEN',   -- OPEN | LOGGED | CLOSED
  created_at  timestamptz default now()
);

create index if not exists found_notices_org_status_idx
  on found_notices (org_id, status, created_at desc);

alter table found_notices enable row level security;

-- Anyone signed in may tell a desk they found something. There is no
-- membership to check: the whole point is that a passer-by can do this.
drop policy if exists found_notices_insert on found_notices;
create policy found_notices_insert on found_notices for insert to authenticated
  with check (reported_by = auth.uid());

drop policy if exists found_notices_own_read on found_notices;
create policy found_notices_own_read on found_notices for select to authenticated
  using (reported_by = auth.uid());

-- The desk sees its own notices and marks them off once the item is logged.
drop policy if exists found_notices_staff_read on found_notices;
create policy found_notices_staff_read on found_notices for select to authenticated
  using (is_org_staff(org_id));

drop policy if exists found_notices_staff_update on found_notices;
create policy found_notices_staff_update on found_notices for update to authenticated
  using (is_org_staff(org_id)) with check (is_org_staff(org_id));

notify pgrst, 'reload schema';

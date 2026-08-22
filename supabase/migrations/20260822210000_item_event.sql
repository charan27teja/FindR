-- An item handed in at a private organisation is found *at an event*, so the
-- desk needs to know which one. Public venues have no event to pick.

alter table items add column if not exists event_id uuid references events(id);
create index if not exists items_event_id_idx on items (event_id);

-- INV-1: the grant in *_rls.sql is an allowlist, not a default. A column that
-- is not named here is invisible to PostgREST even with a policy allowing the
-- row, so a new column has to be added deliberately. event_id is safe to show:
-- it says where the item turned up, which is the point of listing it.
grant select (event_id) on items to authenticated;

notify pgrst, 'reload schema';

-- An event gets its own page: a description the organiser can edit, and
-- visibility in search for people who have not joined the org yet.

alter table events add column if not exists description text;

-- Events were member-only, which made them undiscoverable: searching for
-- "Techfusion" found nothing unless you had already joined the org running it.
-- An event listing is a public notice — name, dates, how much room the desk
-- has — exactly as public as `orgs_read` already makes the org itself. The
-- sensitive rows are items and claims, and those policies are untouched.
drop policy if exists events_member_read on events;
drop policy if exists events_read on events;
create policy events_read on events for select to authenticated using (true);

notify pgrst, 'reload schema';

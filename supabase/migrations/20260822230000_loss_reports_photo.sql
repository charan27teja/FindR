-- Bring loss_reports closer to items: a seeker can now attach a photo of the
-- item they lost (from their gallery) and supply the same detail fields the
-- found-item intake asks for.  This gives the matching pipeline richer signals
-- and lets staff visually compare a report against what is on the shelf.

alter table loss_reports add column if not exists colour text;
alter table loss_reports add column if not exists image_path text;
alter table loss_reports add column if not exists event_id uuid references events(id);

create index if not exists loss_reports_event_id_idx on loss_reports (event_id);

notify pgrst, 'reload schema';

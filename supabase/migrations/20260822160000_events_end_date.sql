-- Events can run for more than one day (a three-day fest, an overnight show).
-- `event_date` becomes the first day and `end_date` the last; `starts_at` and
-- `ends_at` keep their meaning as the clock times on those two days.

alter table events add column if not exists end_date date;
update events set end_date = event_date where end_date is null;
alter table events alter column end_date set not null;

-- The old check assumed one day, so an overnight span (22:00 -> 02:00) was
-- rejected. Now the times only have to be ordered when it *is* one day.
alter table events drop constraint if exists events_time_order;
alter table events add constraint events_span_order check (
  end_date >= event_date and (end_date > event_date or ends_at > starts_at)
);

notify pgrst, 'reload schema';

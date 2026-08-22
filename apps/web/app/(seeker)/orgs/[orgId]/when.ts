/** Postgres hands back "09:00:00"; nobody wants to read the seconds. */
const hhmm = (t: string) => t.slice(0, 5);

/**
 * How an event's dates read. A one-day event is a time range; a longer one is
 * a full span, so the two dates are never mistaken for a daily window.
 * Shared by the org page, the event page and the search results so they cannot
 * drift into describing the same event three different ways.
 */
export function eventWhen(e: {
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
}): string {
  return e.end_date && e.end_date !== e.event_date
    ? `${e.event_date} ${hhmm(e.starts_at)} → ${e.end_date} ${hhmm(e.ends_at)}`
    : `${e.event_date} · ${hhmm(e.starts_at)}–${hhmm(e.ends_at)}`;
}

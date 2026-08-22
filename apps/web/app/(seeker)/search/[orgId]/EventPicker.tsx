import Link from "next/link";

export type EventChoice = {
  id: string;
  name: string;
  description: string | null;
  when: string;
};

/**
 * Server component: choosing an event is one link per event, so there is no
 * state to hold and nothing to hydrate.
 */
export default function EventPicker({
  orgId,
  orgName,
  events,
  isReport,
}: {
  orgId: string;
  orgName: string;
  events: EventChoice[];
  isReport: boolean;
}) {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-black px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs?intent=${isReport ? "report" : "search"}`}
            aria-label="Go back"
            className="flex items-center justify-center h-10 w-10 rounded-full border border-white/15 text-white hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {isReport ? "Where did you find it?" : "Where did you lose it?"}
            </h1>
            <p className="truncate text-sm text-[#AAAAAA]">{orgName}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <ul className="flex flex-col">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/search/${orgId}?report=${isReport ? "1" : "0"}&event=${e.id}`}
                className="flex w-full items-center gap-4 border-b border-white/10 py-4 text-left transition-colors hover:bg-white/5 active:bg-white/10"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-white">{e.name}</span>
                  <span className="block text-xs text-[#AAAAAA]">{e.when}</span>
                  {e.description ? (
                    <span className="mt-1 line-clamp-2 block text-xs text-[#777777]">{e.description}</span>
                  ) : null}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/40">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

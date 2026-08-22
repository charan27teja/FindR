import Link from "next/link";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import SearchBar from "./SearchBar";
import DashboardDrawer from "@/components/DashboardDrawer";
import { OrgIcon } from "@/components/OrgIcon";

type Org = { id: string; name: string; slug: string; type: string };
type EventLite = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_at: string;
  ends_at: string;
};

/** Everything routes through /orgs — it is the only screen that can both
 *  join you to an org and hand you off to the right intent. */
const orgHref = (o: Org, intent = "search") =>
  `/orgs?intent=${intent}&q=${encodeURIComponent(o.name)}`;

export default async function Home() {
  const user = await requireUser();

  // §12 — pre-fetch all orgs so the search bar can show them on focus.
  const supabase = await db();
  const [{ data: orgs }, { data: memberships }, { data: events }] = await Promise.all([
    supabase.from("orgs").select("id,name,slug,type").order("name").limit(50),
    supabase
      .from("memberships")
      .select("role,orgs(id,name,slug,type)")
      .eq("user_id", user.id),
    // Events ride along so the search bar can match on an event name without a
    // round trip per keystroke. events_read makes them visible to anyone signed
    // in, which is the point — you should be able to find "Techfusion" before
    // you have joined the campus running it.
    supabase
      .from("events")
      .select("id,org_id,name,description,event_date,end_date,starts_at,ends_at")
      .order("event_date")
      .limit(200),
  ]);

  // The Supabase client is untyped here, so pin the shape once.
  const orgList = (orgs ?? []) as Org[];
  const eventList = (events ?? []) as EventLite[];

  // Public venues double as quick links — no extra query, they are already
  // in the org list the search bar needs.
  const places = orgList.filter((o) => o.type === "PUBLIC").slice(0, 6);

  // memberships is one row per role, so collapse to one card per org.
  const workspaces = new Map<string, { org: Org; roles: string[] }>();
  for (const m of (memberships ?? []) as { role: string; orgs: Org | null }[]) {
    const org = m.orgs;
    if (!org) continue;
    const entry = workspaces.get(org.id) ?? { org, roles: [] };
    entry.roles.push(m.role);
    workspaces.set(org.id, entry);
  }

  const firstName = typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : user.email?.split("@")[0] || "there";
    
  const greetings = [
    "How can I help you?",
    "What are you looking for today?",
    "Need any assistance?",
    "Hope you're having a great day!",
  ];
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6">
      {/* Top bar: logo left, profile right */}
      <header className="rise flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <DashboardDrawer workspaces={[...workspaces.values()]} />
          <h1 className="text-2xl font-semibold tracking-tight">Findr</h1>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <span className="text-sm font-medium text-foreground">
            {user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </Link>
      </header>

      {/* Search bar below header */}
      <div className="search-container rise relative z-20" style={{ animationDelay: "60ms" }}>
        <SearchBar orgs={orgList} events={eventList} />
      </div>

      <div className="content-container flex flex-1 flex-col justify-center gap-8 py-10">
        {/* Public venues — one tap to the busiest lost-and-found desks */}
        {places.length > 0 && (
          <section className="popular-section">
            <h2
              className="rise mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500"
              style={{ animationDelay: "120ms" }}
            >
              Popular nearby
            </h2>
            <ul className="flex flex-wrap gap-2">
              {places.map((o, i) => (
                <li
                  key={o.id}
                  className="rise"
                  style={{ animationDelay: `${160 + i * 50}ms` }}
                >
                  <Link
                    href={orgHref(o)}
                    className="chip flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
                  >
                    <OrgIcon name={o.name} className="w-[14px] h-[14px] text-neutral-400 shrink-0" />
                    {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {/* Greeting and Center CTA buttons */}
        <div className="flex flex-col gap-6">
          <div className="rise text-center" style={{ animationDelay: "400ms" }}>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              Hello {firstName}, {randomGreeting}
            </h2>
          </div>
          
          <div className="flex flex-row items-stretch gap-4">
            <Link
              href="/orgs?intent=search"
              className="cta-card cta-primary rise flex-1 rounded-xl bg-accent px-5 py-4 text-center text-background border-2 border-transparent hover:border-black transition-colors"
              style={{ animationDelay: "480ms" }}
            >
            {/* package-search — is my thing on their shelf? */}
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="cta-icon mx-auto mb-3">
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0" />
              <path d="M16.5 9.4 7.5 4.21" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
              <circle cx="18.5" cy="15.5" r="2.5" />
              <path d="M20.3 17.3 22 19" />
            </svg>
            <span className="block text-lg font-medium">I lost something</span>
            <span className="block text-sm opacity-80">
              Check if it has been handed in.
            </span>
          </Link>
          <Link
            href="/orgs?intent=report"
            className="cta-card cta-outline rise flex-1 rounded-xl border border-neutral-300 px-5 py-4 text-center dark:border-neutral-700"
            style={{ animationDelay: "560ms" }}
          >
            {/* bell — we ping you the moment it is handed in */}
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="cta-icon mx-auto mb-3">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="block text-lg font-medium">Report a lost item</span>
            <span className="block text-sm text-neutral-500">
              We&rsquo;ll notify you when it turns up.
            </span>
          </Link>
          </div>
        </div>
        {/* Workspaces this user actually belongs to */}
        <section>
          <h2
            className="rise mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500"
            style={{ animationDelay: "640ms" }}
          >
            Your workspaces
          </h2>
          {workspaces.size > 0 ? (
            <ul className="flex flex-col gap-2">
              {[...workspaces.values()].map(({ org, roles }, i) => (
                <li
                  key={org.id}
                  className="rise"
                  style={{ animationDelay: `${690 + i * 60}ms` }}
                >
                  <Link
                    href={`/orgs/${org.id}`}
                    className="chip flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <OrgIcon name={org.name} className="w-5 h-5 text-neutral-400 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{org.name}</span>
                        <span className="block text-xs uppercase tracking-wide text-neutral-500">
                          {roles.map((r) => r.toLowerCase().replace("_", " ")).join(" · ")}
                        </span>
                      </span>
                    </div>
                    <span aria-hidden className="text-neutral-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="rise rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700"
              style={{ animationDelay: "690ms" }}
            >
              You have not joined any organisation yet.{" "}
              <Link href="/orgs" className="underline underline-offset-2">
                Browse organisations
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrgIcon } from "@/components/OrgIcon";
import { fetchNearbyPlaces } from "./actions";

type Place = { id: string; name: string; slug: string; type: string };

/**
 * Server-rendered venues first, then the ones actually around you once the
 * browser gives up a position. Denied or unavailable location just leaves the
 * seeded list in place — the section never goes blank waiting on a permission.
 */
export default function NearbyPlaces({ initial }: { initial: Place[] }) {
  const [places, setPlaces] = useState(initial);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let live = true;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const res = await fetchNearbyPlaces(coords.latitude, coords.longitude);
        if (!live || !res.places.length) return;
        setPlaces(res.places);
        setCity(res.city);
      },
      () => {},
      { maximumAge: 3_600_000, timeout: 10_000 },
    );
    return () => {
      live = false;
    };
  }, []);

  if (!places.length) return null;

  return (
    <section className="popular-section">
      <h2
        className="rise mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500"
        style={{ animationDelay: "120ms" }}
      >
        {city ? `Near you in ${city}` : "Popular nearby"}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {places.map((o, i) => (
          <li key={o.id} className="rise" style={{ animationDelay: `${160 + i * 50}ms` }}>
            <Link
              href={`/search/${o.id}?report=0`}
              className="chip flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              <OrgIcon name={o.name} className="w-[14px] h-[14px] text-neutral-400 shrink-0" />
              {o.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

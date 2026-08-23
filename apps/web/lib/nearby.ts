import "server-only";
import { slugify } from "@findr/shared";
import { serviceDb } from "@/lib/db/service";
import { distanceKm, pickVenues, validCoords, type OverpassElement } from "@/lib/geo";

/**
 * Populates the org directory from wherever the seeker actually is: the city's
 * metro, its railway stations, its bus terminals and its airport, straight out
 * of OpenStreetMap. Without this, "Popular nearby" is whatever the seed file
 * happened to contain — which is Hyderabad and nowhere else.
 */
export type NearbyPlace = { id: string; name: string; slug: string; type: string; city: string | null };

const RADIUS_M = 25_000;
/** Fewer known venues around you than this, and we go looking for more. */
const ENOUGH = 4;
const UA = "FindR/1.0 (lost-and-found)";

/**
 * Areas this process has already searched, to ~1km. Somewhere with genuinely no
 * station, airport or bus terminal nearby would otherwise re-ask Nominatim and
 * Overpass on every home page load — they are free services, so we ask once.
 * Resets on redeploy, which is exactly when re-asking is reasonable again.
 */
const searched = new Set<string>();

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function cityOf(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const a = (await res.json())?.address ?? {};
    return a.city ?? a.town ?? a.municipality ?? a.state_district ?? a.county ?? null;
  } catch {
    return null;
  }
}

/** One Overpass call for the four kinds of place that run a lost-property desk. */
async function overpass(lat: number, lon: number): Promise<OverpassElement[]> {
  const q = `[out:json][timeout:25];
(
  nwr["railway"="station"]["name"]["station"!="subway"](around:${RADIUS_M},${lat},${lon});
  nwr["amenity"="bus_station"]["name"](around:${RADIUS_M},${lat},${lon});
  nwr["aeroway"="aerodrome"]["name"]["iata"](around:60000,${lat},${lon});
  node["station"="subway"]["name"](around:${RADIUS_M},${lat},${lon});
);
out center 120;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "text/plain" },
      body: q,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    return (await res.json())?.elements ?? [];
  } catch {
    return [];
  }
}

/**
 * Venues we already know about, nearest first. Reads every PUBLIC org and sorts
 * in JS — ponytail: fine at directory scale, move to earthdistance/PostGIS if
 * the table ever outgrows a few thousand rows.
 */
async function known(lat: number, lon: number): Promise<(NearbyPlace & { km: number })[]> {
  const { data } = await serviceDb()
    .from("orgs")
    .select("id,name,slug,type,location,latitude,longitude")
    .eq("type", "PUBLIC");
  return ((data ?? []) as OrgRow[])
    .filter((o) => o.latitude !== null && o.longitude !== null)
    .map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      type: o.type,
      city: o.location,
      km: distanceKm(lat, lon, o.latitude!, o.longitude!),
    }))
    .filter((o) => o.km <= RADIUS_M / 1000)
    .sort((a, b) => a.km - b.km);
}

export async function nearbyPlaces(
  lat: number,
  lon: number,
  limit = 6,
): Promise<{ city: string | null; places: NearbyPlace[] }> {
  if (!validCoords(lat, lon)) return { city: null, places: [] };

  let here = await known(lat, lon);
  let city = here.find((p) => p.city)?.city ?? null;

  const area = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (here.length < ENOUGH && !searched.has(area)) {
    searched.add(area);
    city = await cityOf(lat, lon);
    const venues = pickVenues(await overpass(lat, lon), lat, lon, city);
    if (venues.length) {
      // Service role, and deliberately no membership: these are directory rows,
      // not organisations the seeker who walked past the station now owns.
      await serviceDb()
        .from("orgs")
        .upsert(
          venues.map((v) => ({
            name: v.name,
            slug: slugify(v.name),
            type: "PUBLIC",
            location: city,
            latitude: v.latitude,
            longitude: v.longitude,
          })),
          { onConflict: "slug", ignoreDuplicates: true },
        );
      here = await known(lat, lon);
    }
  }

  const places = here.slice(0, limit).map(
    ({ id, name, slug, type, city: at }): NearbyPlace => ({ id, name, slug, type, city: at }),
  );
  return { city, places };
}

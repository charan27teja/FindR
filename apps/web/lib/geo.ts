/** Pure geo helpers for the nearby-venue discovery in `lib/nearby.ts`. */

export type Venue = { name: string; latitude: number; longitude: number };

/** An OpenStreetMap element as Overpass returns it. */
export type OverpassElement = {
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** A browser can hand us anything; these two numbers go into a URL and a query. */
export function validCoords(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/**
 * Overpass elements to venues worth listing, nearest first.
 *
 * Metro stations collapse into a single "<City> Metro": a lost phone goes to
 * the network's lost property office, not to forty separate organisations, one
 * per platform. Without a city name there is nothing sensible to call that org,
 * so the metro is left out rather than guessed at.
 */
export function pickVenues(
  elements: OverpassElement[],
  lat: number,
  lon: number,
  city: string | null,
  limit = 8,
): Venue[] {
  const near = (a: Venue, b: Venue) =>
    distanceKm(lat, lon, a.latitude, a.longitude) - distanceKm(lat, lon, b.latitude, b.longitude);

  const venues: Venue[] = [];
  const metro: Venue[] = [];
  for (const e of elements) {
    const latitude = e.lat ?? e.center?.lat;
    const longitude = e.lon ?? e.center?.lon;
    const name = e.tags?.["name:en"] ?? e.tags?.name;
    if (!name || latitude === undefined || longitude === undefined) continue;
    (e.tags?.station === "subway" ? metro : venues).push({ name, latitude, longitude });
  }

  const picked = venues.sort(near).slice(0, limit);
  if (metro.length && city) {
    metro.sort(near);
    picked.unshift({ name: `${city} Metro`, latitude: metro[0].latitude, longitude: metro[0].longitude });
  }
  return picked;
}

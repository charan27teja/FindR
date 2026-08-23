import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, pickVenues, validCoords } from "./geo.ts";

const HYD = { lat: 17.4375, lon: 78.4483 };

test("distance is in kilometres both ways", () => {
  assert.equal(Math.round(distanceKm(HYD.lat, HYD.lon, 17.4339, 78.5017)), 6);
  assert.equal(distanceKm(HYD.lat, HYD.lon, HYD.lat, HYD.lon), 0);
});

test("coordinates from a browser are bounds-checked", () => {
  assert.ok(validCoords(HYD.lat, HYD.lon));
  assert.ok(!validCoords(Number.NaN, 0));
  assert.ok(!validCoords(91, 0));
  assert.ok(!validCoords(0, 181));
});

test("metro stations collapse into one city org, everything else stays itself", () => {
  const picked = pickVenues(
    [
      { tags: { name: "Ameerpet", station: "subway" }, lat: 17.4374, lon: 78.4487 },
      { tags: { name: "Miyapur", station: "subway" }, lat: 17.4967, lon: 78.3606 },
      { tags: { name: "Secunderabad Railway Station", railway: "station" }, lat: 17.4339, lon: 78.5017 },
      { tags: { name: "MGBS", amenity: "bus_station" }, center: { lat: 17.3775, lon: 78.4805 } },
      { tags: { name: "unplaced" } },
      { lat: 17.4, lon: 78.4 },
    ],
    HYD.lat,
    HYD.lon,
    "Hyderabad",
  );
  assert.deepEqual(
    picked.map((v) => v.name),
    ["Hyderabad Metro", "Secunderabad Railway Station", "MGBS"],
  );
  // The metro org sits on the nearest station, not on an arbitrary one.
  assert.equal(picked[0].latitude, 17.4374);
});

test("no city name means no invented metro org", () => {
  const picked = pickVenues([{ tags: { name: "Ameerpet", station: "subway" }, lat: 17.4374, lon: 78.4487 }], HYD.lat, HYD.lon, null);
  assert.deepEqual(picked, []);
});

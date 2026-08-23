import test from "node:test";
import assert from "node:assert/strict";
import { fitWithin } from "./image.ts";

test("a phone photo is scaled down to the long edge, aspect kept", () => {
  // 12 MP portrait shot, the shape that used to blow the 1 MB action limit
  assert.deepEqual(fitWithin(3024, 4032, 1280), { width: 960, height: 1280 });
  assert.deepEqual(fitWithin(4032, 3024, 1280), { width: 1280, height: 960 });
});

test("an already-small photo is left alone", () => {
  assert.deepEqual(fitWithin(800, 600, 1280), { width: 800, height: 600 });
});

test("an extreme panorama still has a drawable height", () => {
  assert.deepEqual(fitWithin(8000, 20, 1280), { width: 1280, height: 3 });
});

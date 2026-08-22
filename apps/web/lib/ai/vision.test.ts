import test from "node:test";
import assert from "node:assert/strict";
import { parseVisionJson, cacheKey, normalisedCropBox } from "./vision.ts";

const ok = {
  public: {
    category: "backpack",
    colour: "navy blue",
    material: "nylon",
    condition: "well used",
    description: "A navy blue nylon backpack with a front zip pocket.",
  },
  private: [
    { q: "What is written on the sticker on the front pocket?", a: "MARVEL" },
    { q: "What colour is the inner lining?", a: "orange" },
    { q: "How many small pockets are inside?", a: "3" },
  ],
  safe_crop_box: [0.15, 0.1, 0.85, 0.62],
};

test("parses a well-formed response", () => {
  const r = parseVisionJson(ok, 1380);
  assert.equal(r.public.category, "backpack");
  assert.equal(r.private.length, 3);
  assert.deepEqual(r.safe_crop_box, [0.15, 0.1, 0.85, 0.62]);
  assert.equal(r.latency_ms, 1380);
});

test("clamps an over-long private set instead of losing the enrichment", () => {
  const many = { ...ok, private: Array.from({ length: 9 }, (_, i) => ({ q: `q${i}`, a: `a${i}` })) };
  assert.equal(parseVisionJson(many, 1).private.length, 6);
});

test("a malformed crop box degrades to null, not a throw", () => {
  assert.equal(parseVisionJson({ ...ok, safe_crop_box: [0.1, 0.2] }, 1).safe_crop_box, null);
  assert.equal(parseVisionJson({ ...ok, safe_crop_box: undefined }, 1).safe_crop_box, null);
});

test("INV-3: a pixel-coordinate crop box is refused, not silently cropped", () => {
  // Observed live from gemini-3.6-flash. Read as normalised it crops a
  // one-pixel corner and ships an unredacted image.
  assert.equal(normalisedCropBox([410, 480, 600, 650]), null);
  assert.equal(normalisedCropBox([0.15, 0.1, 0.85, 0.62])?.[2], 0.85);
  assert.equal(normalisedCropBox([0.8, 0.1, 0.2, 0.6]), null, "x0 >= x1");
  assert.equal(normalisedCropBox([0, 0, 1, 1])?.[3], 1, "full frame is legal");
  assert.equal(normalisedCropBox([-0.1, 0, 0.5, 0.5]), null, "negative");
});

test("too few challenge questions is a hard failure", () => {
  assert.throws(() => parseVisionJson({ ...ok, private: [ok.private[0]] }, 1));
});

test("junk is a hard failure", () => {
  assert.throws(() => parseVisionJson({ public: "a backpack" }, 1));
});

test("cache key is stable, image-derived and model-scoped", () => {
  assert.equal(cacheKey("abc", "m1"), cacheKey("abc", "m1"));
  assert.notEqual(cacheKey("abc", "m1"), cacheKey("abd", "m1"));
  // Otherwise switching GEMINI_MODEL replays the old model's cached answer.
  assert.notEqual(cacheKey("abc", "gemini-3.6-flash"), cacheKey("abc", "gemini-2.5-flash"));
});

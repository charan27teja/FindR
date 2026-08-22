import test from "node:test";
import assert from "node:assert/strict";
import {
  serialiseItemForSeeker,
  serialiseItemsForSeeker,
  assertNoPrivateFields,
} from "./item.ts";

const row = {
  id: "i1",
  org_id: "o1",
  node_id: "n1",
  short_code: "SNIST-4B7K",
  bin: "B-12",
  state: "LISTED",
  category: "backpack",
  colour: "navy blue",
  material: "nylon",
  condition: "well used",
  public_description: "A navy blue nylon backpack with a front zip pocket.",
  private_attributes: [{ q: "sticker?", a: "MARVEL" }],
  ocr_text: "21B81A0512 R MEHTA",
  image_full_path: "items/o1/i1/full.jpg",
  image_redacted_path: "items/o1/i1/crop.jpg",
  embed_image: [0.1, 0.2],
  embed_description: [0.3],
  enrichment_status: "DONE",
  logged_by: "u9",
  found_at: "2026-08-22T10:00:00Z",
};

test("serialiser drops every private field", () => {
  const out = serialiseItemForSeeker(row, { imageRedactedUrl: "https://signed/crop" });
  assert.doesNotThrow(() => assertNoPrivateFields(out));
  assert.equal(out.public_description, row.public_description);
  assert.equal(out.image_redacted_url, "https://signed/crop");
});

test("serialiser is an allowlist, not a denylist", () => {
  // A column nobody has thought about yet must not leak by default.
  const out = serialiseItemForSeeker({ ...row, owner_phone_number: "+919000000000" });
  assert.equal("owner_phone_number" in out, false);
});

test("tripwire catches a private field nested anywhere", () => {
  assert.throws(
    () => assertNoPrivateFields({ results: [{ item: { ocr_text: "leak" } }] }),
    /INV-1 violation: private field "ocr_text"/,
  );
  assert.throws(
    () => assertNoPrivateFields({ private_attributes: [] }),
    /INV-1 violation/,
  );
});

test("list serialiser pairs rows with their signed urls", () => {
  const out = serialiseItemsForSeeker([row, row], ["a", null]);
  assert.doesNotThrow(() => assertNoPrivateFields(out));
  assert.deepEqual(out.map((i) => i.image_redacted_url), ["a", null]);
});

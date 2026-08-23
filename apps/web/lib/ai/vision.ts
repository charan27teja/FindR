// No `server-only` guard: it is unresolvable under `node --test`, and
// GEMINI_API_KEY lacks a NEXT_PUBLIC_ prefix so it cannot reach a browser
// bundle anyway. Only route handlers and server actions may import this.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { VisionExtractResponse } from "@findr/shared";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const CACHE_DIR = process.env.RESPONSE_CACHE_DIR ?? "./.cache/vision";

/**
 * §8 prompt requirements. `public.description` is read by strangers in a
 * listing, so it must carry nothing that could be used to claim the item —
 * that separation is INV-1 enforced at the prompt, before the data exists.
 */
const SYSTEM_PROMPT = `You are cataloguing a lost item photographed at a lost-and-found desk.

Return two disjoint sets of facts.

PUBLIC — safe to show to strangers browsing a listing. Category, colour,
material, condition and a one-sentence description. The description MUST omit
brand names, serial numbers, any text legible on the item, stickers, engravings
and unique marks. Someone reading it must not be able to answer the private
questions below.

PRIVATE — 3 to 6 ownership-challenge questions answerable from this photo
alone, each with a short unambiguous answer. Prefer the details you deliberately
kept out of the public description. Never ask something a passer-by could guess
from the public description.

SAFE_CROP_BOX — [x0,y0,x1,y1] bounding a region of the image with no legible
text and no distinguishing marks, usable as a redacted thumbnail. Each value is
a FRACTION OF THE IMAGE SIZE between 0.0 and 1.0 — never a pixel count. x0<x1
and y0<y1. Null if no such region exists.`;

/** Gemini structured output — removes the "please emit strict JSON" failure mode. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    public: {
      type: "object",
      properties: {
        category: { type: "string" },
        colour: { type: "string" },
        material: { type: "string" },
        condition: { type: "string" },
        description: { type: "string" },
      },
      required: ["category", "colour", "material", "condition", "description"],
      propertyOrdering: ["category", "colour", "material", "condition", "description"],
    },
    private: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
        propertyOrdering: ["q", "a"],
      },
    },
    safe_crop_box: {
      type: "array",
      nullable: true,
      description: "[x0,y0,x1,y1] as fractions of image width/height, each 0.0-1.0, never pixels",
      items: { type: "number" },
    },
  },
  required: ["public", "private", "safe_crop_box"],
  propertyOrdering: ["public", "private", "safe_crop_box"],
};

/** Keyed by image hash, so re-reading the same photo costs nothing. */
export function cacheKey(imageB64: string, model = MODEL): string {
  // Model is part of the key: without it, switching GEMINI_MODEL silently
  // replays the previous model's answer and you tune against a ghost.
  return createHash("sha256").update(`${model}:${imageB64}`).digest("hex").slice(0, 32);
}

/**
 * INV-3: the crop is what redacts the image. Gemini 3.6 returns pixel
 * coordinates about as often as normalised ones, and a pixel box read as
 * normalised crops a 1x1-pixel corner — so anything outside [0,1] or
 * non-increasing is refused. Null means "no safe region", which the UI already
 * handles by falling back to a category icon.
 */
export function normalisedCropBox(raw: unknown): [number, number, number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const b = raw.map(Number);
  if (!b.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) return null;
  if (b[0] >= b[2] || b[1] >= b[3]) return null;
  return [b[0], b[1], b[2], b[3]];
}

/**
 * Shapes a raw model object into the §8 contract. Exported for the test —
 * everything that can be wrong about a model response is wrong in here.
 */
export function parseVisionJson(raw: unknown, latencyMs: number): VisionExtractResponse {
  const o = (raw ?? {}) as { public?: unknown; private?: unknown; safe_crop_box?: unknown };
  const box = normalisedCropBox(o.safe_crop_box);
  return VisionExtractResponse.parse({
    public: o.public,
    // The model overshoots maxItems often enough to be worth clamping, and an
    // extra question is not a reason to lose the whole enrichment.
    private: Array.isArray(o.private) ? o.private.slice(0, 6) : o.private,
    safe_crop_box: box,
    latency_ms: latencyMs,
  });
}

async function readCache(key: string): Promise<VisionExtractResponse | null> {
  try {
    return VisionExtractResponse.parse(JSON.parse(await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")));
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: VisionExtractResponse): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    // A cold cache is not an intake failure.
  }
}

/**
 * INV-6: returns null rather than throwing. The caller persists the item with
 * `enrichment_status='FAILED'` and the guard still finishes in 15 seconds.
 */
export async function extractVision(
  imageB64: string,
  orgContext: { node_name?: string } = {},
  mimeType = "image/jpeg",
): Promise<VisionExtractResponse | null> {
  const key = cacheKey(imageB64, MODEL);
  const cached = await readCache(key);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const started = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: imageB64 } },
                { text: orgContext.node_name ? `Found at: ${orgContext.node_name}` : "Found item." },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
            // Flash thinks by default; intake has a 15s budget and this task
            // does not need much. Raise to "high" if extraction disappoints.
            // Gemini 3.x only — 2.x wants `thinkingBudget: 0` here and 400s on this.
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!res.ok) {
      console.error(`[vision] ${MODEL} ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error(`[vision] empty candidate (finishReason=${body?.candidates?.[0]?.finishReason})`);
      return null;
    }

    const parsed = parseVisionJson(JSON.parse(text), Date.now() - started);
    await writeCache(key, parsed); // write-through: today's real calls are demo day's cache
    return parsed;
  } catch (e) {
    console.error("[vision]", e);
    return null;
  }
}


// --- Found-item intake -----------------------------------------------------
/**
 * The seeker-facing sibling of SYSTEM_PROMPT. Whoever found the object is
 * holding it and is about to check the model's answers on screen, so there is
 * no public/private split here and nothing to withhold — just the four fields
 * they would otherwise type themselves.
 */
const FOUND_ITEM_PROMPT = `You are looking at a photograph of an object that someone has just found and is handing in to a lost-and-found desk.

Describe THE OBJECT ONLY. The photograph was taken wherever the person happened
to be standing, and none of that is part of the item. Say nothing about:
the background, the surface it is resting on, the floor, a table, a desk, a
counter, the lighting, the room, anyone holding it, hands, other objects beside
it, or where the photo appears to have been taken. If the object is being held,
describe the object and not the hand. If there are several things in frame,
describe only the one that is the subject of the photo.

Write as if the object were on a plain white background, however it actually
appears. A description that mentions the surroundings is wrong even if it is
accurate, because it is used to match against someone recalling the item from
memory — and they remember the thing, not the desk it was photographed on.

Do not guess at a brand, a price, or an owner. If something is not visible,
leave it out rather than inventing it.

description — one short sentence naming the object and its most obvious
features. Plain language, no more than about twenty words.

category — a single common noun for the kind of thing it is: "backpack",
"phone", "water bottle", "umbrella", "keys". Lowercase.

colour — the dominant colour or two of the object itself, in plain words:
"navy blue", "black and silver". Never the colour of the background.

details — distinguishing marks ON THE OBJECT: scratches, dents, stickers,
engravings, wear, a cracked screen. This is what tells two similar objects
apart. Empty string if there is genuinely nothing distinguishing about the
object itself.`;

const FOUND_ITEM_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    category: { type: "string" },
    colour: { type: "string" },
    details: { type: "string" },
  },
  required: ["description", "category", "colour", "details"],
  propertyOrdering: ["description", "category", "colour", "details"],
};

/**
 * What the model made of the photo. Every field may be blank.
 *
 * Deliberately NOT FoundItemFields: that schema is the rule for *saving* an
 * item, where a category and a colour are required. Holding a draft to it
 * meant one unanswerable field threw away the three the model got right, and
 * the person retyped all four. Blanks are the model's honest answer to "what
 * colour is this" for a photo taken in the dark; the review screen is where
 * they get filled in, and FoundItemFields still guards the submit.
 */
export type FoundItemDraft = {
  description: string;
  category: string;
  colour: string;
  details: string;
};

/**
 * Why a read produced nothing. Carried back to the screen rather than only to
 * a server log: "could not read the photo" for four different causes meant
 * nobody standing at the desk — or reading a bug report — could tell a missing
 * API key from a timeout from a photo of a blank wall.
 */
export type FoundItemFailure =
  | "no-api-key"
  | "api-error"
  | "unreadable-response"
  | "nothing-in-photo";

export type FoundItemResult =
  | { ok: true; draft: FoundItemDraft }
  | { ok: false; reason: FoundItemFailure };

/**
 * INV-6 again: a result rather than a throw. A model that is down or slow must
 * not stop someone handing in a wallet — the review screen simply opens with
 * empty fields for them to fill in themselves.
 *
 * A partial read is a success: whatever the model saw comes back, blank where
 * it saw nothing. Only the four failures above are `ok: false`.
 */
export async function extractFoundItem(
  imageB64: string,
  context: { orgName?: string; eventName?: string } = {},
  mimeType = "image/jpeg",
): Promise<FoundItemResult> {
  // Namespaced: the same photo can be run through both prompts, and without
  // this the two answers would overwrite each other in the cache.
  const key = cacheKey(imageB64, `${MODEL}:found-item-v2`);
  const cached = await readFoundCache(key);
  if (cached) return { ok: true, draft: cached };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[found-item] GEMINI_API_KEY is not set in this environment");
    return { ok: false, reason: "no-api-key" };
  }

  const where = [context.eventName, context.orgName].filter(Boolean).join(", ");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: FOUND_ITEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: imageB64 } },
                { text: where ? `Found at: ${where}` : "Found item." },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: FOUND_ITEM_SCHEMA,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
        // Someone is watching a spinner, so this budget is tighter than intake's.
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      console.error(`[found-item] ${MODEL} ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { ok: false, reason: "api-error" };
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error(`[found-item] empty candidate (finishReason=${body?.candidates?.[0]?.finishReason})`);
      return { ok: false, reason: "unreadable-response" };
    }

    const parsed = parseFoundItemJson(JSON.parse(text));
    if (!parsed) {
      console.error(`[found-item] every field blank: ${text.slice(0, 200)}`);
      return { ok: false, reason: "nothing-in-photo" };
    }
    await writeFoundCache(key, parsed);
    return { ok: true, draft: parsed };
  } catch (e) {
    // A timeout arrives here as an AbortError, as does a DNS or TLS failure.
    console.error("[found-item]", e);
    return { ok: false, reason: "api-error" };
  }
}

/**
 * Shapes a raw model object into a draft. Exported for the test.
 *
 * Takes whatever is there and blanks whatever is not, rather than validating:
 * a field the model could not answer is information, not a malformed
 * response. null is reserved for a response with nothing usable in it at all,
 * which is the only case that still reads as "could not read the photo".
 */
export function parseFoundItemJson(raw: unknown): FoundItemDraft | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const field = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const draft = {
    description: field(o.description, 500),
    category: field(o.category, 60),
    colour: field(o.colour, 60),
    details: field(o.details, 500),
  };
  return Object.values(draft).some(Boolean) ? draft : null;
}

async function readFoundCache(key: string): Promise<FoundItemDraft | null> {
  try {
    // Through the same lenient parse as a live response: holding the cache to
    // FoundItemFields meant a partial draft failed to read back and silently
    // paid for the API call again on every retake of the same photo.
    return parseFoundItemJson(JSON.parse(await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")));
  } catch {
    return null;
  }
}

async function writeFoundCache(key: string, value: FoundItemDraft): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    // A cold cache is not an intake failure.
  }
}


// --- Speech ----------------------------------------------------------------
/**
 * Transcribes a spoken search.
 *
 * A fallback, not the main path: the browser's own SpeechRecognition is
 * instant and free where it works, but Chrome routes it through Google's
 * speech service and that connection fails on plenty of networks — reported
 * as a bare "network" error with nothing the page can do about it. This runs
 * the same audio through the API key the project already has.
 *
 * Returns null rather than throwing, like the other extractors here, so a
 * failure leaves the search box exactly as the person left it.
 */
export async function transcribeSpeech(audioB64: string, mimeType = "audio/wav"): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                "Transcribe the speech in this audio into plain text. It is somebody naming a " +
                "place or an object they have lost. Return the words only — no punctuation " +
                "beyond what a name needs, no quotes, no commentary. If there is no intelligible " +
                "speech, return an empty string.",
            }],
          },
          contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: audioB64 } }] }],
          generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: "low" } },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      console.error(`[speech] ${MODEL} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.error("[speech]", e);
    return null;
  }
}

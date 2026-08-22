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

/** DEMO_MODE replays by image hash, so dead venue wifi is not a dead demo. */
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
  if (process.env.DEMO_MODE === "true") return null;

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

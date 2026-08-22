import { z } from "zod";

// --- Tenant config (§7) ----------------------------------------------------
export const VerificationMode = z.enum(["SELF_SERVE", "STAFF_APPROVAL", "OFFICER_SIGNOFF"]);
export const Disclosure = z.enum(["REDACTED_CARD", "NO_IMAGE"]);

export const OrgConfig = z.object({
  retention_days: z.number().int().positive().default(30),
  verification_mode: VerificationMode.default("SELF_SERVE"),
  disclosure: Disclosure.default("REDACTED_CARD"),
  match_threshold: z.number().min(0).max(1).default(0.62),
  auto_approve_threshold: z.number().min(0).max(1).default(0.85),
  contest_window_hours: z.number().int().positive().default(24),
  pickup_window_hours: z.number().int().positive().default(48),
  always_escalate_categories: z
    .array(z.string())
    .default(["phone", "laptop", "wallet", "documents", "jewellery"]),
  federation_group: z.string().nullable().default(null),
  require_id_at_handover: z.boolean().default(false),
});
export type OrgConfig = z.infer<typeof OrgConfig>;

// --- AI service contract (§8) ---------------------------------------------
export const VisionPublic = z.object({
  category: z.string(),
  colour: z.string(),
  material: z.string(),
  condition: z.string(),
  description: z.string(),
});

/** Never crosses the wire to a seeker. INV-1. */
export const VisionPrivate = z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(6);

export const VisionExtractResponse = z.object({
  public: VisionPublic,
  private: VisionPrivate,
  /** normalised [x0,y0,x1,y1]; null when no text-free region exists (INV-3) */
  safe_crop_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  latency_ms: z.number(),
});
export type VisionExtractResponse = z.infer<typeof VisionExtractResponse>;

export const OcrResponse = z.object({ text: z.string(), tokens: z.array(z.string()) });
export const EmbedResponse = z.object({
  image: z.array(z.number()).nullable(),
  text: z.array(z.number()).nullable(),
});
export const ChallengeScoreResponse = z.object({
  score: z.number().min(0).max(1),
  per_answer: z.array(z.number()),
  passed: z.boolean(),
});

// --- Item field allowlist (INV-1) -----------------------------------------
/**
 * The only `items` columns a seeker may ever receive. Mirrored by the column
 * grant in supabase/migrations/*_rls.sql — change both together.
 */
export const SEEKER_ITEM_FIELDS = [
  "id",
  "org_id",
  "node_id",
  "short_code",
  "state",
  "category",
  "colour",
  "material",
  "condition",
  "public_description",
  "enrichment_status",
  "found_at",
] as const;

/** Columns that must never appear in a seeker-facing payload. */
export const PRIVATE_ITEM_FIELDS = [
  "private_attributes",
  "ocr_text",
  "image_full_path",
  "image_full_url",
  "embed_image",
  "embed_description",
  "bin",
  "logged_by",
] as const;

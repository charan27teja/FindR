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

// --- Organisations & events ------------------------------------------------
/**
 * Event pricing. The single source of truth: the create form previews it live,
 * the server action recomputes it on submit, and `events.price_inr` stores the
 * result. Retune these two numbers and everything follows.
 */
export const EVENT_BASE_FEE_INR = 500;
export const EVENT_PER_HEAD_INR = 10;

export function eventPrice(capacity: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return EVENT_BASE_FEE_INR + Math.floor(capacity) * EVENT_PER_HEAD_INR;
}

export const formatInr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const trimmed = z.string().trim();

/** An untouched form field arrives as "" — that means absent, not invalid. */
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** One responsible person. Reachable by email or phone — at least one. */
export const OrgContact = z
  .object({
    email: z.preprocess(
      blankToNull,
      trimmed.email("That email address does not look right.").nullable(),
    ),
    phone: z.preprocess(
      blankToNull,
      trimmed
        .min(6, "That phone number looks too short.")
        .max(20, "That phone number looks too long.")
        .nullable(),
    ),
  })
  .refine((c) => c.email || c.phone, { message: "Give an email or a phone number." });
export type OrgContact = z.infer<typeof OrgContact>;

export const MAX_ORG_CONTACTS = 3;

export const NewOrg = z.object({
  name: trimmed.min(2, "Name the organisation.").max(120),
  location: trimmed.min(2, "Where is it?").max(200),
  contacts: z
    .array(OrgContact)
    .min(1, "Add at least one contact.")
    .max(MAX_ORG_CONTACTS, `At most ${MAX_ORG_CONTACTS} contacts.`),
});
export type NewOrg = z.infer<typeof NewOrg>;

export const NewEvent = z
  .object({
    name: trimmed.min(2, "Name the event.").max(120),
    event_date: trimmed.regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    starts_at: trimmed.regex(/^\d{2}:\d{2}/, "Pick a start time."),
    ends_at: trimmed.regex(/^\d{2}:\d{2}/, "Pick an end time."),
    capacity: z.coerce.number().int().positive("Capacity must be at least 1.").max(1_000_000),
  })
  .refine((e) => e.ends_at > e.starts_at, {
    message: "The event must end after it starts.",
    path: ["ends_at"],
  });
export type NewEvent = z.infer<typeof NewEvent>;

/** URL-safe, collision-resistant enough for a hackathon; uniqueness is the DB's job. */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "org";
}

# FindR — Engineering Requirements

> Agent-facing build spec. Read this file completely before writing code.
> Companion docs (human-facing): Pitch v2, Application Specification, Feature Checklist, PRD.
> When this file and any other doc disagree, **this file wins**.

---

## 1. What we are building

A multi-tenant lost-and-found platform.

- **Staff** photograph a found item. A vision model auto-fills its attributes. Target: 15 seconds, zero typing.
- **Seekers** describe what they lost in plain language and get redacted matches.
- **Claiming** an item triggers AI-generated ownership questions built from private details the claimant was never shown.
- **Handover** happens at a physical desk against a QR pickup code, with an append-only audit trail.

One codebase. One schema. Tenants differ only by a configuration row.

**The product is intake + verification.** Search is table stakes. If you are choosing what to polish, polish those two.

---

## 2. Non-negotiable invariants

Violating any of these is a bug of the highest severity, even if tests pass.

### INV-1 — Private attributes never leave the server
`items.private_attributes` is the source of ownership-challenge answers. It must **never** appear in:
- any API response consumed by a Seeker
- any client bundle, prop, or hydration payload
- any log line, error message, or analytics event

Enforce with a database column-level grant AND an explicit allowlist serializer. Do not rely on `SELECT *` discipline.

### INV-2 — Full images are gated
A Seeker may see `image_redacted_url` only. `image_full_url` is released **only** when:
- their claim on that item has `status = 'APPROVED'`, **or**
- they hold an `Intake Staff` / `Verifier` / `Org Admin` role in the owning org

All image URLs are signed and expire in ≤ 15 minutes. No public bucket. Ever.

### INV-3 — Redaction is destructive
Generate `image_redacted_url` by **cropping** to a region the vision model confirmed contains no text and no distinguishing marks. Never ship a blur — blurs are reversible and squint-through-able. If no safe crop region exists, emit a category-icon placeholder instead of an image.

### INV-4 — Tenant isolation fails closed
Every tenant-scoped row carries `org_id`. Isolation is enforced in the **data layer** (Postgres RLS), not application code. A query missing its filter must return zero rows, never all rows.

### INV-5 — No public feed of pending claims
There is no endpoint, page, or query that lists claims across users. Notification of a competing claim goes **only** to users holding an open loss report that matched that specific item above threshold.

### INV-6 — Intake never blocks on the model
If the vision API is slow, rate-limited, or down, intake still completes. Persist the item with `enrichment_status = 'PENDING'`, queue the job, let the guard finish. An item logged with bad tags is infinitely better than an item not logged.

### INV-7 — Audit log is append-only
`audit_events` has no UPDATE and no DELETE path. Revoke those grants at the database level. Corrections are new rows.

### INV-8 — Challenge failure is never terminal
A failed challenge routes to in-person verification. There is no code path that permanently denies a claimant. The UI copy on failure must say so explicitly.

---

## 3. Stack

Chosen for hackathon velocity. Swap only with a deliberate team decision — everything from §6 onward is stack-agnostic.

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind | PWA-capable, one deploy, server components keep secrets server-side |
| Backend | Next.js route handlers + server actions | No separate API service to operate |
| Database | Postgres via Supabase | Row-Level Security maps directly onto INV-4 |
| Vectors | `pgvector` extension | Same database, no second store to sync |
| Auth | Supabase Auth, email OTP | INV covered out of the box |
| Storage | Supabase Storage, private bucket + signed URLs | INV-2 covered out of the box |
| AI service | FastAPI sidecar (Python) | Embeddings and OCR run locally; keeps GPU-free CPU work off the Node process |
| Vision model | Gemini Flash-Lite (primary), GPT-5 mini (fallback) | Cheapest capable; free tier covers the whole demo |
| OCR | RapidOCR / PaddleOCR, CPU | Free, ~100ms, better at alphanumerics than a general VLM |
| Embeddings | SigLIP or CLIP ViT-B/32, CPU, self-hosted | Called on every search — per-token pricing is the wrong model here |
| Hosting | Vercel (web) + Railway/Render (AI service) | Free tiers, no ops |

**Do not** self-host a large VLM. Rented GPU + cold starts + CUDA setup is a demo-day failure mode with no visible payoff.

---

## 4. Repo structure

```
findr/
├── apps/
│   ├── web/                        # Next.js
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (seeker)/
│   │   │   │   ├── page.tsx                 # home: two big buttons
│   │   │   │   ├── orgs/                    # org picker
│   │   │   │   ├── search/[orgId]/          # describe → match → results
│   │   │   │   ├── item/[itemId]/           # redacted detail
│   │   │   │   ├── claim/[claimId]/         # challenge + status
│   │   │   │   └── activity/                # open reports + claims
│   │   │   ├── (staff)/
│   │   │   │   ├── intake/                  # THE critical screen
│   │   │   │   ├── queue/                   # verifier claim queue
│   │   │   │   ├── inventory/
│   │   │   │   └── handover/
│   │   │   ├── (admin)/setup/               # org creation wizard
│   │   │   └── api/
│   │   ├── lib/
│   │   │   ├── db/                          # queries, RLS-aware client
│   │   │   ├── ai/                          # AI service client + fallback
│   │   │   ├── serializers/                 # ALLOWLIST-based (INV-1)
│   │   │   └── policy/                      # tenant config resolution
│   │   └── components/
│   └── ai/                         # FastAPI
│       ├── main.py
│       ├── vision.py               # VLM call + provider fallback
│       ├── ocr.py
│       ├── embed.py
│       └── challenge.py            # question generation + answer scoring
├── packages/
│   └── shared/                     # zod schemas + TS types shared by both
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── requirements.md
```

---

## 5. Environment variables

```bash
# web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only, never NEXT_PUBLIC_
AI_SERVICE_URL=
AI_SERVICE_TOKEN=
DEMO_MODE=false                     # true → replay cached AI responses

# ai service
GEMINI_API_KEY=
OPENAI_API_KEY=                     # fallback provider
VISION_PROVIDER=gemini              # gemini | openai
EMBED_MODEL=clip-vit-base-patch32
RESPONSE_CACHE_DIR=./.cache
```

`DEMO_MODE=true` must replay cached AI responses keyed by image hash. Build this on day one, not on demo morning — it is the difference between recovering from dead venue wifi and standing there apologising.

---

## 6. Data model

```sql
create extension if not exists vector;

-- ORGANISATIONS ------------------------------------------------------------
create type org_type as enum ('PUBLIC','PRIVATE','SEMI_PUBLIC','TEMPORARY');

create table orgs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  type          org_type not null,
  email_domain  text,                        -- auto-membership on match
  join_code     text unique,
  event_start   timestamptz,
  event_end     timestamptz,                 -- TEMPORARY orgs auto-archive
  config        jsonb not null default '{}', -- see §7
  created_at    timestamptz default now()
);

create table nodes (                          -- locations within an org
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references orgs(id) on delete cascade,
  parent_id uuid references nodes(id),        -- zone → station → platform
  name      text not null,
  kind      text                              -- desk | building | platform | coach
);

-- PEOPLE -------------------------------------------------------------------
create type role_name as enum ('SEEKER','INTAKE_STAFF','VERIFIER','ORG_ADMIN','PLATFORM_ADMIN');

create table profiles (
  id          uuid primary key references auth.users(id),
  email       text,
  phone       text,
  is_guest    boolean default false,
  flagged_at  timestamptz,                    -- 2 failed challenges in 30d
  created_at  timestamptz default now()
);

create table memberships (
  user_id  uuid references profiles(id),
  org_id   uuid references orgs(id) on delete cascade,
  role     role_name not null,
  primary key (user_id, org_id, role)
);

-- ITEMS --------------------------------------------------------------------
create type item_state as enum (
  'DRAFT','LISTED','CLAIM_PENDING','CONTESTED','VERIFIED',
  'READY','RETURNED','UNCLAIMED','DISPOSED','ON_HOLD'
);

create table items (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  node_id             uuid references nodes(id),
  short_code          text not null,          -- e.g. SNIST-4B7K
  bin                 text,
  state               item_state not null default 'DRAFT',

  -- PUBLIC (safe to serialise to a seeker)
  category            text,
  colour              text,
  material            text,
  condition           text,
  public_description  text,                   -- model-generated, redacted

  -- PRIVATE — INV-1. NEVER serialise to a seeker.
  private_attributes  jsonb not null default '[]',
  ocr_text            text,

  -- MEDIA
  image_full_path     text not null,          -- private bucket key
  image_redacted_path text,                   -- cropped, INV-3

  -- VECTORS
  embed_image         vector(512),
  embed_description   vector(384),

  enrichment_status   text default 'PENDING', -- PENDING | DONE | FAILED (INV-6)
  logged_by           uuid references profiles(id),
  found_at            timestamptz not null default now(),
  retention_until     timestamptz,
  created_at          timestamptz default now()
);

create index on items using ivfflat (embed_description vector_cosine_ops);
create index on items using ivfflat (embed_image vector_cosine_ops);
create index on items (org_id, state, found_at desc);
create index on items using gin (to_tsvector('english', coalesce(ocr_text,'')));

-- LOSS REPORTS -------------------------------------------------------------
create table loss_reports (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references orgs(id) on delete cascade,
  user_id            uuid not null references profiles(id),
  description        text not null,
  written_text_hint  text,                    -- "anything written on it?"
  category           text,
  node_id            uuid references nodes(id),
  lost_after         timestamptz,
  lost_before        timestamptz,
  embed_description  vector(384),
  status             text default 'OPEN',     -- OPEN | MATCHED | CLOSED | EXPIRED
  expires_at         timestamptz,
  created_at         timestamptz default now()
);

-- CLAIMS -------------------------------------------------------------------
create type claim_status as enum (
  'SUBMITTED','CHALLENGE_ISSUED','PASSED','FAILED',
  'STAFF_REVIEW','APPROVED','REJECTED','COLLECTED'
);

create table claims (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references items(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  org_id          uuid not null references orgs(id),
  status          claim_status not null default 'SUBMITTED',
  challenge       jsonb,                      -- questions as issued
  answers         jsonb,                      -- what the user typed/picked
  score           numeric,                    -- 0..1
  reviewed_by     uuid references profiles(id),
  reject_reason   text,
  pickup_code     text,
  pickup_expires  timestamptz,
  created_at      timestamptz default now(),
  unique (item_id, user_id)                   -- one open claim per user per item
);

-- AUDIT — append only, INV-7 ----------------------------------------------
create table audit_events (
  id          bigserial primary key,
  org_id      uuid not null,
  actor_id    uuid,
  entity      text not null,                  -- item | claim | org
  entity_id   uuid not null,
  action      text not null,                  -- STATE_CHANGE | IMAGE_VIEW | HANDOVER ...
  detail      jsonb,
  created_at  timestamptz default now()
);
revoke update, delete on audit_events from authenticated, anon;
```

**RLS**: enable on every tenant-scoped table. Policy shape — a row is visible iff the caller has a `memberships` row for that `org_id`, plus a Seeker-scoped policy allowing `items` in state `LISTED` with **column grants excluding** `private_attributes`, `ocr_text`, `image_full_path`.

---

## 7. Tenant config

`orgs.config` — this is what makes multi-tenancy real. No per-tenant code paths anywhere.

```json
{
  "retention_days": 30,
  "verification_mode": "SELF_SERVE",
  "disclosure": "REDACTED_CARD",
  "match_threshold": 0.62,
  "auto_approve_threshold": 0.85,
  "contest_window_hours": 24,
  "pickup_window_hours": 48,
  "always_escalate_categories": ["phone", "laptop", "wallet", "documents", "jewellery"],
  "federation_group": null,
  "require_id_at_handover": false
}
```

`verification_mode`: `SELF_SERVE` | `STAFF_APPROVAL` | `OFFICER_SIGNOFF`
`disclosure`: `REDACTED_CARD` | `NO_IMAGE` (enterprise — text attributes only)

Read config through `lib/policy/resolve.ts`. Never inline a threshold or a branch on org name.

---

## 8. AI service contract

### `POST /vision/extract`
```json
// request
{ "image_b64": "...", "org_context": { "node_name": "Library Desk" } }

// response — public and private MUST be separate top-level keys (INV-1)
{
  "public": {
    "category": "backpack",
    "colour": "navy blue",
    "material": "nylon",
    "condition": "well used",
    "description": "A navy blue nylon backpack with a front zip pocket."
  },
  "private": [
    { "q": "What is written on the sticker on the front pocket?", "a": "MARVEL" },
    { "q": "What colour is the inner lining?",                    "a": "orange" },
    { "q": "How many small pockets are inside?",                  "a": "3" },
    { "q": "What is the brand on the shoulder strap?",            "a": "Wildcraft" }
  ],
  "safe_crop_box": [0.15, 0.10, 0.85, 0.62],
  "latency_ms": 1380
}
```

**Prompt requirements:**
- Demand strict JSON, no prose, no markdown fences.
- Instruct the model that `public.description` must be usable in a listing seen by strangers, so it must **omit** brand names, serial numbers, any text on the item, and unique marks.
- `private` must contain 3–6 items answerable from the photo alone, each with a short unambiguous answer.
- `safe_crop_box` is normalised `[x0,y0,x1,y1]` bounding a region with no legible text and no distinguishing marks. Return `null` if none exists.

**Fallback chain:** primary provider → secondary provider → `enrichment_status='FAILED'` and the item still saves (INV-6).

### `POST /ocr` → `{ "text": "21B81A0512 R MEHTA", "tokens": ["21B81A0512","R","MEHTA"] }`

### `POST /embed` → `{ "image": [512 floats] | null, "text": [384 floats] | null }`

### `POST /challenge/score`
```json
{ "expected": ["MARVEL", "orange", "3"], "given": ["a blue marvel sticker", "orange", "three"] }
→ { "score": 0.91, "per_answer": [0.85, 1.0, 0.88], "passed": true }
```
Score semantically, not by string equality. `"three"` must match `"3"`. `"a blue Marvel sticker"` must match `"MARVEL"`.

---

## 9. Retrieval algorithm

Implement exactly this order. Do not replace it with a single vector search.

```
1. HARD FILTER  → org_id, state='LISTED', date window, node subtree, category
                   (typically removes 90–99% of candidates; cheap and exact)
2. TEXT→TEXT    → cosine(query_embed, items.embed_description)     weight 0.45
3. TEXT→IMAGE   → cosine(query_embed, items.embed_image)           weight 0.25
4. OCR BOOST    → exact token match +0.40 ; fuzzy (lev ≤ 2) +0.20
5. RANK, cut to top 5, drop anything below config.match_threshold
```

**Why layer 2 outranks layer 3:** comparing the seeker's text against the model's *written description* keeps both sides in the same semantic space and reliably beats text→image retrieval in this domain.

**Known limitation to design around:** embeddings resolve category well and fine detail poorly. `"blue water bottle"` retrieves; `"with a dent on the bottom"` does not. Fine detail belongs in the challenge, not in retrieval. Do not build a demo whose headline query depends on it.

Return a human-readable reason string per hit (`"matches: navy, backpack, found in Library block"`). **Never return a numeric confidence to a seeker.**

---

## 10. Claim state machine

```
SUBMITTED
  └─ generate 2–3 questions from items.private_attributes  → CHALLENGE_ISSUED
CHALLENGE_ISSUED
  ├─ score ≥ auto_approve_threshold AND mode=SELF_SERVE     → APPROVED
  ├─ score ≥ pass floor                                     → PASSED → STAFF_REVIEW
  └─ score < pass floor                                     → FAILED (→ in-person route, INV-8)
STAFF_REVIEW  → APPROVED | REJECTED
APPROVED
  ├─ issue pickup_code (QR + typed fallback), set expiry
  ├─ reveal image_full_url to this claimant only
  └─ item → VERIFIED → READY
READY
  ├─ staff scans code, dual confirm                         → COLLECTED, item → RETURNED
  └─ pickup_expires passes                                  → item → LISTED, notify next best
```

**Contest:** a second claim while `item.state = 'CLAIM_PENDING'` moves the item to `CONTESTED`, blocks all release, pins both claims in the verifier queue with answer sets side by side. Neither claimant learns anything about the other.

**Escalation override:** if `item.category ∈ config.always_escalate_categories`, auto-approval is disabled regardless of score.

---

## 11. Abuse rules

Implement as middleware, not as scattered checks.

- Max 3 open claims per user per org.
- One challenge attempt set per claim. Failure routes to in-person, **not** to a retry.
- 2 failures in 30 days → set `profiles.flagged_at`; all subsequent claims force `STAFF_REVIEW`.
- Rate limit claim submission per user and per device.
- Require a verified phone before a second claim.
- Write an `audit_events` row for every full-image view, answer submission, approval, rejection and handover.

---

## 12. UI rules

- Monochrome. **One** reserved accent, used only for state and primary action — never decoration.
- Staff screens use larger type and heavier weights than seeker screens: cheap phone, outdoors, bad light, possibly no reading glasses. Elegance loses to legibility here.
- Every screen needs a designed empty state and a designed offline state.
- **Home screen search bar searches organisations, not items.** Placeholder must say so: `Search stations, campuses, events`.
- The two home buttons need one-line subtitles or users cannot tell them apart:
  - *I lost something* → "Check if it has already been handed in."
  - *Report a lost item* → "Tell us what you lost and we will notify you when it turns up."
- Zero-result search converts the typed description into a loss report in **one tap**. This empty state is not optional — it is where the two buttons become one flow.
- Intake screen shows a live elapsed timer. It is the product's core claim, made visible.

---

## 13. Build order

Ship in this sequence. Do not start a milestone before the previous one runs end to end.

**M0 — Foundations**
- [ ] Migrations, RLS policies, seed one org with 5 nodes
- [ ] Auth (email OTP), roles, membership
- [ ] Allowlist serializers + a test that fails if `private_attributes` appears in any seeker response

**M1 — Intake** *(highest value; do not defer)*
- [ ] Camera capture, upload to private bucket
- [ ] `/vision/extract`, `/ocr`, `/embed` wired with fallback + `DEMO_MODE` cache
- [ ] Tap-to-confirm tag UI, zero typing
- [ ] Redacted crop generation from `safe_crop_box`
- [ ] Short code + bin assignment, elapsed timer

**M2 — Search**
- [ ] Describe screen with example ghost text and when/where/category chips
- [ ] Four-layer retrieval, top 5 with reason strings
- [ ] Redacted result cards + item detail
- [ ] Zero-result → loss report conversion

**M3 — Claim** *(the differentiator; assign your strongest person)*
- [ ] Challenge generation and issuance
- [ ] Semantic answer scoring
- [ ] Policy-based routing, verifier queue
- [ ] Approval, pickup code, gated full-image reveal

**M4 — Handover**
- [ ] QR scan, staff review panel, dual confirm
- [ ] Audit trail write on every transition

**M5 — If time remains**
- [ ] Continuous matching + notifications
- [ ] Contest window
- [ ] Org setup wizard (target: under 3 minutes end to end)

**Stub for the demo, do not build:** federation, admin metrics, disposal queue, SMS gateway, guest claim path, full RBAC beyond the three core roles.

---

## 14. Acceptance criteria

The build is done when this script runs without intervention:

1. Staff logs a backpack from a phone in **under 20 seconds**, typing nothing.
2. A seeker on a different device describes it in plain language and sees it in the top 3 results.
3. The result card shows a **cropped** image — the sticker and the brand are not visible.
4. Seeker taps Submit Claim and immediately gets 3 questions.
5. A **wrong** claimant fails the questions and is offered the in-person route, not a hard block.
6. The **right** claimant passes and receives a QR pickup code; only now does the full image appear.
7. Staff scan the code, see the answer log, confirm handover; the item reads `RETURNED`.
8. `audit_events` contains a complete, ordered trail for that item.
9. `DEMO_MODE=true` reproduces steps 1–8 with the network disconnected.

Step 9 is not optional. Test it on the venue's actual wifi if you can get in early; otherwise assume the wifi will fail, because it usually does.

---

## 15. Known gaps — do not silently invent answers

Flag these to the team rather than implementing a guess:

- **Guest accounts vs. abuse rules.** A phone-OTP guest has no history, so rate limits and flagging are meaningless. Current working assumption: guest claims always route to in-person verification. Unconfirmed.
- **OCR of identity documents.** The feature works precisely because it reads student IDs and name tapes — which means storing personal data about people who never signed up, including the person who lost the ID. Needs a written retention policy before any real deployment. Consider `documents` as a special item type where extracted names are used to contact the owner and then discarded.
- **Photo ownership** between platform and tenant. Affects export, deletion rights, contract terms.
- **Federation consent** governance — who grants it, who revokes it, what it covers.
- **Auto-approval threshold** sits directly on the trade-off between match rate and wrong-person handovers.

---

## 16. The one metric that overrides the others

**Wrong-person handovers. Target: zero.**

Match rate can always be improved by loosening thresholds — right up to the moment you hand someone's laptop to a stranger. If a change would raise match rate but also raise wrong handovers, reject the change. This applies to every tuning decision in §9 and §10, including ones made at 3am on day two.

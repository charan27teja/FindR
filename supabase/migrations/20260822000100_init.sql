-- FindR core schema. See requirements §6.
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
  parent_id uuid references nodes(id),        -- zone -> station -> platform
  name      text not null,
  kind      text                              -- desk | building | platform | coach
);

create index on nodes (org_id);

-- PEOPLE -------------------------------------------------------------------
create type role_name as enum ('SEEKER','INTAKE_STAFF','VERIFIER','ORG_ADMIN','PLATFORM_ADMIN');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  phone       text,
  is_guest    boolean default false,
  flagged_at  timestamptz,                    -- 2 failed challenges in 30d
  created_at  timestamptz default now()
);

create table memberships (
  user_id  uuid references profiles(id) on delete cascade,
  org_id   uuid references orgs(id) on delete cascade,
  role     role_name not null,
  primary key (user_id, org_id, role)
);

create index on memberships (org_id, user_id);

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

  -- PRIVATE - INV-1. NEVER serialise to a seeker.
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

create unique index on items (org_id, short_code);
create index on items using ivfflat (embed_description vector_cosine_ops);
create index on items using ivfflat (embed_image vector_cosine_ops);
create index on items (org_id, state, found_at desc);
create index on items using gin (to_tsvector('english', coalesce(ocr_text,'')));

-- LOSS REPORTS -------------------------------------------------------------
create table loss_reports (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references orgs(id) on delete cascade,
  user_id            uuid not null references profiles(id) on delete cascade,
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

create index on loss_reports (org_id, status);
create index on loss_reports (user_id);

-- CLAIMS -------------------------------------------------------------------
create type claim_status as enum (
  'SUBMITTED','CHALLENGE_ISSUED','PASSED','FAILED',
  'STAFF_REVIEW','APPROVED','REJECTED','COLLECTED'
);

create table claims (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references items(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  org_id          uuid not null references orgs(id) on delete cascade,
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

create index on claims (org_id, status);
create index on claims (user_id);

-- AUDIT - append only, INV-7 ----------------------------------------------
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

create index on audit_events (org_id, entity, entity_id, created_at);

-- Profile row for every new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, is_guest)
  values (new.id, new.email, new.phone, new.email is null)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

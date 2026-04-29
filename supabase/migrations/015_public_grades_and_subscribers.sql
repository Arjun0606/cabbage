-- ============================================================
-- Cabbge Migration 015 — Public grades cache + email subscribers
-- ============================================================
-- Powers the post-pivot SMB funnel:
--
--   /api/grade        → upserts into public_grades, returns cached result
--                       on hit (7-day TTL)
--   /visibility/[slug] → server-rendered public result page (read from
--                       public_grades)
--   /badge/[slug]     → SVG score badge (read from public_grades)
--   /og/[slug]        → OG social card (read from public_grades)
--
--   /api/subscribe    → upserts into global_subscribers; every shared
--                       /visibility URL becomes a lead capture surface
--                       even when the visitor doesn't buy
--
-- Idempotent. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. public_grades — cached free public scans, one row per origin
-- ------------------------------------------------------------

create table if not exists public.public_grades (
  origin text primary key,            -- "https://stripe.com"
  slug text not null unique,          -- "stripe.com"
  brand text not null,
  category text default '',
  vertical text not null default 'unknown',
  subcategory text,
  scores jsonb,                       -- { overall, chatgpt, gemini, perplexity?, claude?, grok?, readiness, mentions, offDomain? }
  ai_readiness jsonb,                 -- AIReadinessCheck[]
  off_domain_coverage jsonb,          -- OffDomainItem[]
  query_results jsonb,                -- per-prompt summaries (mentioned + position per engine)
  total_queries int default 0,
  competitors text[] default '{}',
  scanned_at timestamptz default now(),
  scan_count int default 1,           -- popularity tracking for cron-prioritization
  created_at timestamptz default now()
);

create index if not exists idx_public_grades_slug
  on public.public_grades(slug);

create index if not exists idx_public_grades_recent
  on public.public_grades(scanned_at desc);

create index if not exists idx_public_grades_vertical
  on public.public_grades(vertical);

alter table public.public_grades enable row level security;

drop policy if exists "anyone can read public grades" on public.public_grades;

create policy "anyone can read public grades"
  on public.public_grades for select
  using (true);

-- Writes flow only through service role (no insert/update policy).

-- ------------------------------------------------------------
-- 2. global_subscribers — email lead capture from /visibility pages
-- ------------------------------------------------------------

create table if not exists public.global_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  brand_slug text,                    -- the grade slug they subscribed against
  source text default 'unknown',      -- e.g. "grade-page", "outreach-batch-3", "home"
  meta jsonb default '{}',            -- referer, UA, utm_*
  confirmed boolean default true,
  unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  unique(email, brand_slug)
);

create index if not exists idx_global_subscribers_email
  on public.global_subscribers(email);

create index if not exists idx_global_subscribers_brand
  on public.global_subscribers(brand_slug, created_at desc);

create index if not exists idx_global_subscribers_recent
  on public.global_subscribers(created_at desc);

alter table public.global_subscribers enable row level security;

-- No public-read policy. Writes only via service role.

-- ============================================================
-- DONE
-- ============================================================

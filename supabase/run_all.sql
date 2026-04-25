-- ============================================================
-- CABBGE — One-shot setup script
-- Generated: 2026-04-25
--
-- Paste this entire file into Supabase SQL Editor and hit Run.
-- It runs the base schema + every migration (001-009) in order,
-- with idempotency guards so re-runs are safe.
--
-- Estimated runtime: 5-15 seconds.
-- ============================================================


-- ============================================================
-- supabase/schema.sql
-- ============================================================
-- ============================================================
-- CabbageSEO Database Schema
-- AI Marketing Agent for Real Estate Developers
-- Run this in your Supabase SQL Editor to set up all tables.
-- ============================================================

-- Companies (the real estate developer)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  city TEXT,
  tier TEXT DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'enterprise')),

  -- Context documents (brand knowledge base)
  product_info TEXT,
  brand_voice TEXT,
  brand_values TEXT,
  brand_vision TEXT,
  target_audience TEXT,
  marketing_strategy TEXT,
  competitor_analysis TEXT,

  -- Structured data
  sites JSONB DEFAULT '[]',          -- [{url, label}]
  documents JSONB DEFAULT '{}',      -- arbitrary key-value docs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (each residential project/microsite)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  location TEXT,
  city TEXT,
  configurations TEXT,
  price_range TEXT,
  rera_number TEXT,
  amenities TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Pre-launch', 'Under Construction', 'Ready to Move', 'Sold Out')),
  possession_date TEXT,
  usps TEXT,
  brochure_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors (tracked competitor developers)
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan History (for tracking scores over time and trend charts)
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN (
    'audit', 'technical', 'ai_visibility', 'backlinks', 'competitor'
  )),
  url TEXT NOT NULL,
  score INT,
  summary TEXT,
  results JSONB,
  triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron', 'webhook')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration credentials (GSC, WordPress, Webflow, Moz)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'google_search_console', 'wordpress_com', 'wordpress_self_hosted', 'webflow', 'moz'
  )),
  credentials JSONB NOT NULL,
  metadata JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(company_id, provider)
);

-- Credit usage tracking
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  credits_used INT NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated content
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  meta_description TEXT,
  target_keywords TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Golden prompts: user-locked top buyer queries tracked across every scan.
-- Stable baseline so volatility reads as signal vs noise.
CREATE TABLE IF NOT EXISTS golden_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, query)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_company ON scan_history(company_id, scan_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrations_company ON integrations(company_id, provider);
CREATE INDEX IF NOT EXISTS idx_credit_usage_company ON credit_usage(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_company ON chat_messages(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_company ON generated_content(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_competitors_company ON competitors(company_id);
CREATE INDEX IF NOT EXISTS idx_golden_prompts_company ON golden_prompts(company_id, pinned_at DESC);


-- ============================================================
-- supabase/migrations/001_auth_and_billing.sql
-- ============================================================
-- ============================================================
-- Cabbge Migration 001 — Auth, Billing, Decay, Schema Deploy
-- ============================================================
-- Run this once in Supabase SQL Editor. Idempotent.
-- Enables: Supabase Auth integration, subscriptions, GSC decay
-- tracking, deployed schemas public lookup, user↔company linking.

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Profiles (one per auth.users row) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Link companies → users ----------
alter table public.companies
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

create index if not exists idx_companies_owner on public.companies(owner_id);

-- ---------- Subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  plan text not null default 'trial',      -- trial | starter | growth | enterprise
  status text not null default 'trialing', -- trialing | active | past_due | canceled | expired
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  razorpay_plan_id text,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_razorpay on public.subscriptions(razorpay_subscription_id);

-- Auto-create trial subscription when a profile is created
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ---------- GSC snapshots (content decay tracking) ----------
create table if not exists public.gsc_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  site_url text not null,
  captured_at timestamptz default now(),
  pages jsonb not null,
  queries jsonb,
  totals jsonb
);

create index if not exists idx_gsc_snapshots_site on public.gsc_snapshots(site_url, captured_at desc);

-- ---------- Deployed schemas (public schema loader endpoint) ----------
create table if not exists public.deployed_schemas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  site_url text not null,
  page_path text not null,
  schema_type text not null,
  schema_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(site_url, page_path)
);

create index if not exists idx_deployed_schemas_lookup on public.deployed_schemas(site_url, page_path);

-- ---------- Tracked articles (publish → rescan loop) ----------
create table if not exists public.tracked_articles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  query text not null,
  title text,
  content text,
  status text default 'draft',
  publish_url text,
  generated_at timestamptz default now(),
  published_at timestamptz,
  pre_score jsonb,
  post_score jsonb
);

create index if not exists idx_articles_company on public.tracked_articles(company_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.gsc_snapshots enable row level security;
alter table public.deployed_schemas enable row level security;
alter table public.tracked_articles enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.competitors enable row level security;
alter table public.scan_history enable row level security;
alter table public.credit_usage enable row level security;
alter table public.chat_messages enable row level security;
alter table public.generated_content enable row level security;
alter table public.integrations enable row level security;

-- Drop any previous permissive policies from earlier runs
drop policy if exists "own profile" on public.profiles;
drop policy if exists "own subscription read" on public.subscriptions;
drop policy if exists "own companies" on public.companies;
drop policy if exists "own projects" on public.projects;
drop policy if exists "own competitors" on public.competitors;
drop policy if exists "own scan history" on public.scan_history;
drop policy if exists "own gsc" on public.gsc_snapshots;
drop policy if exists "own articles" on public.tracked_articles;
drop policy if exists "own generated_content" on public.generated_content;
drop policy if exists "own credit usage" on public.credit_usage;
drop policy if exists "own chat" on public.chat_messages;
drop policy if exists "own integrations" on public.integrations;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own subscription read" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "own companies" on public.companies
  for all using (auth.uid() = owner_id or owner_id is null)
  with check (auth.uid() = owner_id);

create policy "own projects" on public.projects
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own competitors" on public.competitors
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own scan history" on public.scan_history
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own gsc" on public.gsc_snapshots
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own articles" on public.tracked_articles
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own generated_content" on public.generated_content
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own credit usage" on public.credit_usage
  for select using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "own chat" on public.chat_messages
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own integrations" on public.integrations
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

-- deployed_schemas: no RLS policy needed — our API routes use the service role
-- to both write (from dashboard) and serve (from public /api/schema-deploy GET).


-- ============================================================
-- supabase/migrations/002_deployed_content.sql
-- ============================================================
-- ============================================================
-- Deployed content — the universal-publish mechanism.
-- ============================================================
--
-- The schema-deploy pattern made publishing schema trivial on any CMS.
-- This extends it to arbitrary HTML content (articles, locality pages,
-- GBP-style blocks). Customer embeds a single <script> tag + a <div>
-- with a data-cabbge-slot attribute and Cabbge injects the content at
-- runtime. Works on WordPress, Drupal, custom React, bespoke stacks —
-- anywhere schema-deploy works.
--
-- Usage:
--   1. In Cabbge dashboard: generate article → click "Publish via Cabbge"
--   2. Cabbge stores HTML keyed by (site_url, slot) in this table.
--   3. Customer's site has:
--        <script defer src="https://cabbge.com/api/content-loader"></script>
--        <div data-cabbge-slot="blog/3bhk-gachibowli-guide"></div>
--   4. Loader fetches /api/content-deploy?url=<origin>&slot=<slot>,
--      injects the HTML into the div.

create table if not exists public.deployed_content (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  site_url text not null,
  slot text not null,
  content_type text not null check (content_type in ('article', 'gbp_post', 'locality_page', 'html_block')),
  html text not null,
  meta jsonb,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (site_url, slot)
);

create index if not exists idx_deployed_content_lookup on public.deployed_content(site_url, slot);
create index if not exists idx_deployed_content_company on public.deployed_content(company_id);

-- No RLS: service-role writes from the dashboard, public-read from the
-- customer site via the loader. Matches the deployed_schemas pattern.
alter table public.deployed_content enable row level security;

drop policy if exists "own deployed content" on public.deployed_content;
create policy "own deployed content" on public.deployed_content
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );


-- ============================================================
-- supabase/migrations/003_competitor_watch.sql
-- ============================================================
-- ============================================================
-- Competitor watch — snapshots + alerts when a competitor site changes.
-- ============================================================
--
-- Real RE CMOs want to know within 24 hours when a competitor launches
-- a new project 2 km from theirs. Today the /api/competitors route
-- produces a one-shot manual analysis — no ongoing tracking. This table
-- pair turns that into a daily diff loop.
--
-- Daily cron:
--   1. For every competitor on every company, fetch homepage + sitemap
--   2. Extract key signals (title, H1s, new URLs, price tokens)
--   3. Hash the signals; compare to the previous snapshot
--   4. If different, write a competitor_alert with the specific change

create table if not exists public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_name text not null,
  competitor_url text not null,
  signals jsonb not null,
  signals_hash text not null,
  captured_at timestamptz default now()
);

create index if not exists idx_competitor_snapshots_lookup
  on public.competitor_snapshots(company_id, competitor_name, captured_at desc);

create table if not exists public.competitor_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_name text not null,
  competitor_url text not null,
  alert_type text not null check (alert_type in ('new_project', 'hero_change', 'sitemap_grew', 'price_change', 'headline_change')),
  title text not null,
  description text,
  details jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_competitor_alerts_feed
  on public.competitor_alerts(company_id, created_at desc);

-- RLS: owners can read their own alerts; service role writes from cron.
alter table public.competitor_snapshots enable row level security;
alter table public.competitor_alerts enable row level security;

drop policy if exists "own competitor snapshots" on public.competitor_snapshots;
create policy "own competitor snapshots" on public.competitor_snapshots
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );

drop policy if exists "own competitor alerts" on public.competitor_alerts;
create policy "own competitor alerts" on public.competitor_alerts
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );


-- ============================================================
-- supabase/migrations/004_geo_benchmark.sql
-- ============================================================
-- ============================================================
-- GEO Benchmark — monthly leaderboard of top Indian RE developers'
-- AI visibility across ChatGPT + Gemini.
-- ============================================================
--
-- Fed by the /api/cron/benchmark route (monthly). Rendered on the
-- public /benchmark page as a leaderboard per city. This is both a
-- lead-gen magnet and a positioning lever — nobody else publishes
-- this data.

create table if not exists public.geo_benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  developer_slug text not null,
  brand text not null,
  city text not null,
  tier text not null,
  score integer not null,
  mentioned_count integer not null,
  total_queries integer not null,
  competitors_seen jsonb,
  captured_month text not null, -- "2026-04" — lets us pin "latest monthly run"
  captured_at timestamptz default now(),
  unique (developer_slug, captured_month)
);

create index if not exists idx_benchmark_city_month
  on public.geo_benchmark_snapshots(city, captured_month, score desc);

create index if not exists idx_benchmark_latest
  on public.geo_benchmark_snapshots(captured_month desc, score desc);

-- Benchmark data is public. Read-only for anon; service-role writes.
alter table public.geo_benchmark_snapshots enable row level security;

drop policy if exists "public read benchmark" on public.geo_benchmark_snapshots;
create policy "public read benchmark" on public.geo_benchmark_snapshots
  for select using (true);


-- ============================================================
-- supabase/migrations/005_drop_free_trial.sql
-- ============================================================
-- ============================================================
-- Cabbge Migration 005 — Drop the 14-day free trial
-- ============================================================
-- Cabbge is a paid product. A new signup lands on /pricing and only
-- gets a subscription row once they complete checkout. No more auto-
-- provisioned trial rows, no trial_ends_at clock.
--
-- What this migration does:
--   1. Drops the handle_new_profile trigger + function so new profiles
--      no longer auto-create a trialing subscription row.
--   2. Flips any still-trialing rows (from users who signed up before
--      this migration) to status='inactive' so the dashboard paywall
--      locks them out until they pay.
--   3. Updates the `subscriptions` column defaults so a manual insert
--      without a plan/status defaults to inactive.
--
-- Idempotent. Re-running is safe.

-- 1) Remove the auto-trial trigger.
drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.handle_new_profile();

-- 2) Demote anyone still on the old trial.
update public.subscriptions
   set status = 'inactive',
       plan = case when plan = 'trial' then 'none' else plan end,
       updated_at = now()
 where status = 'trialing';

-- 3) New rows default to inactive/none. The `trial_ends_at` column
--    stays (for backward compat with old queries) but no longer has a
--    14-day default — we explicitly set null.
alter table public.subscriptions
  alter column plan set default 'none';

alter table public.subscriptions
  alter column status set default 'inactive';

alter table public.subscriptions
  alter column trial_ends_at drop default;


-- ============================================================
-- supabase/migrations/006_structured_project_data.sql
-- ============================================================
-- ============================================================
-- Cabbge Migration 006 — Structured project data
-- ============================================================
-- Indian buyers search by a structured matrix: config + locality +
-- price + stage. Until now Cabbge stored all of those as unstructured
-- free text on the `projects` row ("3BHK, 4BHK" / "Gachibowli, Hyderabad"
-- / "₹1.2 Cr onwards" / "Pre-launch"), which meant the app couldn't
-- roll up "how's Gachibowli doing?" or match "under 3 cr" queries.
--
-- This migration adds derived structured columns alongside the existing
-- free-text fields. The API fills them on save by parsing the text the
-- user already types — users don't see any new fields. The app reads
-- the structured columns for filtering, rollups, and matrix-aware
-- query generation.
--
-- Idempotent. Re-running is safe.

-- ---------- Locality (separate from city) ----------
-- Indian addresses are "Locality, City". The locality is the most
-- important dimension after city for buyer queries.
alter table public.projects
  add column if not exists locality text;

create index if not exists idx_projects_locality
  on public.projects(locality);

-- ---------- Config tags (array) ----------
-- Parsed from the `configurations` text. Examples: ["2BHK", "3BHK"].
-- Lets the app answer "how do 3BHK queries perform across projects".
alter table public.projects
  add column if not exists config_tags text[];

create index if not exists idx_projects_config_tags
  on public.projects using gin (config_tags);

-- ---------- Price band (numeric, in rupees) ----------
-- Parsed from the `price_range` text. 1 Cr = 10000000. Lets the app
-- match "under 3 cr" style queries and segment content by budget.
alter table public.projects
  add column if not exists price_min numeric;
alter table public.projects
  add column if not exists price_max numeric;

create index if not exists idx_projects_price_min
  on public.projects(price_min);

-- ---------- Normalized stage ----------
-- `status` stays (it has a check constraint for display labels), but a
-- snake_case normalized version is easier to branch on in the agent
-- prompts and the content-queue logic.
alter table public.projects
  add column if not exists stage text
  check (stage in ('pre_launch', 'under_construction', 'ready_to_move', 'sold_out', 'active'));

create index if not exists idx_projects_stage
  on public.projects(stage);


-- ============================================================
-- supabase/migrations/007_portal_submissions.sql
-- ============================================================
-- ============================================================
-- Cabbge Migration 007 — Portal submission tracker
-- ============================================================
-- Cabbge generates portal-specific listing copy (99acres, Magicbricks,
-- Housing, NoBroker, etc.) + GBP for every project. The "paste and
-- submit" step is manual, and the Authority tab now has a "Mark
-- submitted" toggle per project × portal. This table persists that
-- state so it survives across devices and doesn't only live in the
-- user's browser localStorage.
--
-- Idempotent. Re-running is safe.

create table if not exists public.portal_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  /** Project this submission belongs to. Empty string = company-level. */
  project_name text not null default '',
  /** Portal key — matches the slugifyPortal() output (e.g. "99acres", "magicbricks", "gbp"). */
  portal_key text not null,
  submitted_at timestamptz not null default now(),
  unique (company_id, project_name, portal_key)
);

create index if not exists idx_portal_submissions_company
  on public.portal_submissions(company_id);

-- RLS so a customer can only read/write their own submission rows.
alter table public.portal_submissions enable row level security;

drop policy if exists "own portal submissions" on public.portal_submissions;

create policy "own portal submissions" on public.portal_submissions
  for all using (
    exists (
      select 1 from public.companies c
      where c.id = portal_submissions.company_id
        and (c.owner_id = auth.uid() or c.owner_id is null)
    )
  );


-- ============================================================
-- supabase/migrations/008_possession_and_phases.sql
-- ============================================================
-- ============================================================
-- Cabbge Migration 008 — Possession tracking + project phases
-- ============================================================
-- Two small additions to the projects model for enterprise depth:
--
-- 1. possession_date already exists as text — we add a structured
--    date column (possession_target_date) for delay-risk arithmetic
--    and keep the free-text one for display ("Q3 2026").
-- 2. A `phase` column so multi-phase launches (Prestige Lakeside
--    Habitat Phase 2, Lodha Palava Phase 3) can share the same
--    parent project name but carry their own stage + RERA + price.
--    parent_project_name is the anchor; phase is the suffix.
--
-- Idempotent. Re-running is safe.

alter table public.projects
  add column if not exists possession_target_date date;

alter table public.projects
  add column if not exists phase text;

-- Phase index helps the Overview delay-risk query group by phase.
create index if not exists idx_projects_phase on public.projects(phase) where phase is not null;

-- Delay status view — a computed helper the dashboard can consume
-- directly so we don't do the arithmetic client-side on every render.
--   status = 'on_track'  | 'at_risk' (≤30d to possession, still UC)
--          | 'delayed'    (past possession_target_date, not yet RTM)
--          | 'n/a'        (no possession_target_date set)
create or replace view public.project_delay_status as
select
  p.id,
  p.company_id,
  p.name,
  p.stage,
  p.possession_target_date,
  p.phase,
  case
    when p.possession_target_date is null then 'n/a'
    when p.stage = 'ready_to_move' or p.stage = 'sold_out' then 'delivered'
    when p.possession_target_date < current_date then 'delayed'
    when p.possession_target_date < current_date + interval '60 days' then 'at_risk'
    else 'on_track'
  end as delay_status,
  (p.possession_target_date - current_date) as days_until_possession
from public.projects p;

grant select on public.project_delay_status to authenticated, anon;


-- ============================================================
-- supabase/migrations/009_golden_prompts.sql
-- ============================================================
-- Golden prompts: user-locked top buyer queries tracked across every scan.
--
-- Foundation Inc's GEO research found AI visibility swings 20-30% across
-- scan runs even when nothing has changed. A CMO who sees rank +8 / -6 / +3
-- with no baseline distrusts every number. The fix is a stable top-N set
-- the user locks in — same queries every week, so volatility is readable
-- as signal vs noise. The volatility per query is computed on the fly
-- from scan_history rows (last 10 runs), no extra storage needed.

CREATE TABLE IF NOT EXISTS golden_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, query)
);

CREATE INDEX IF NOT EXISTS idx_golden_prompts_company
  ON golden_prompts(company_id, pinned_at DESC);

-- Row Level Security — every other customer-data table follows this
-- pattern (user can access rows whose company they own). Without this
-- the anon key in the client bundle could read every brand's pinned
-- queries. Idempotent: the alter is a no-op if already enabled, and
-- the policy CREATEs are guarded.
ALTER TABLE golden_prompts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can read their own golden prompts'
  ) THEN
    CREATE POLICY "Users can read their own golden prompts"
      ON golden_prompts FOR SELECT
      USING (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can pin golden prompts to their own companies'
  ) THEN
    CREATE POLICY "Users can pin golden prompts to their own companies"
      ON golden_prompts FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can unpin their own golden prompts'
  ) THEN
    CREATE POLICY "Users can unpin their own golden prompts"
      ON golden_prompts FOR DELETE
      USING (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ============================================================
-- VERIFICATION — these run last and show what you just created
-- ============================================================

-- All public tables that should exist:
select table_name from information_schema.tables
  where table_schema = 'public' order by table_name;

-- Critical tables for tier enforcement + scans + billing:
select 'companies' as t, exists(select 1 from information_schema.tables where table_schema='public' and table_name='companies') as ok
union all select 'projects',         exists(select 1 from information_schema.tables where table_schema='public' and table_name='projects')
union all select 'subscriptions',    exists(select 1 from information_schema.tables where table_schema='public' and table_name='subscriptions')
union all select 'scan_history',     exists(select 1 from information_schema.tables where table_schema='public' and table_name='scan_history')
union all select 'credit_usage',     exists(select 1 from information_schema.tables where table_schema='public' and table_name='credit_usage')
union all select 'golden_prompts',   exists(select 1 from information_schema.tables where table_schema='public' and table_name='golden_prompts')
union all select 'integrations',     exists(select 1 from information_schema.tables where table_schema='public' and table_name='integrations')
union all select 'generated_content',exists(select 1 from information_schema.tables where table_schema='public' and table_name='generated_content')
union all select 'competitors',      exists(select 1 from information_schema.tables where table_schema='public' and table_name='competitors');

-- Confirm RLS is enabled on the customer-data tables:
select schemaname, tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
    and tablename in ('companies','projects','scan_history','credit_usage','subscriptions','golden_prompts')
  order by tablename;

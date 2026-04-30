-- ============================================================
-- Cabbge Migration 021 — Daily score history + drift alerts
-- ============================================================
-- Powers the always-on monitoring layer:
--   - cron/daily-scan runs a cheap 4-prompt × 5-engine mini-scan
--     per tracked brand each morning
--   - one row per (brand_slug, scanned_at) goes into score_history
--   - the diff vs yesterday's row is what surfaces in the Monday
--     digest as "your score moved +N" or "your score dropped N".
--   - drift_alerts captures flagged drops > 5 points so we can
--     email-pings them in real time, not wait till Monday
--
-- Cost: ~$0.04/day per brand (8 LLM calls × ~$0.005). Sized for
-- the typical Starter ($49) limit of 3 tracked brands = $0.12/day
-- = $3.60/mo COGS on a $49 line. Fine.
--
-- Idempotent.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. score_history — one row per brand per day
-- ------------------------------------------------------------
create table if not exists public.score_history (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null,
  scanned_at timestamptz not null default now(),
  scores jsonb not null,          -- { overall, chatgpt, gemini, perplexity?, claude?, grok? }
  prompt_count int default 4,     -- mini-scan = 4, full = 8+
  unique (brand_slug, scanned_at)
);

create index if not exists idx_score_history_slug_recent
  on public.score_history(brand_slug, scanned_at desc);

alter table public.score_history enable row level security;

drop policy if exists "anyone reads score history" on public.score_history;
create policy "anyone reads score history"
  on public.score_history for select
  using (true);

-- ------------------------------------------------------------
-- 2. drift_alerts — flagged score drops/jumps
-- ------------------------------------------------------------
create table if not exists public.drift_alerts (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null,
  detected_at timestamptz default now(),
  engine text not null,            -- 'overall' | 'chatgpt' | 'gemini' | etc
  prev_score int not null,
  curr_score int not null,
  delta int generated always as (curr_score - prev_score) stored,
  severity text not null,          -- 'drop' | 'jump' (informational)
  notified_at timestamptz
);

create index if not exists idx_drift_alerts_slug
  on public.drift_alerts(brand_slug, detected_at desc);

create index if not exists idx_drift_alerts_unsent
  on public.drift_alerts(notified_at) where notified_at is null;

alter table public.drift_alerts enable row level security;

drop policy if exists "anyone reads drift alerts" on public.drift_alerts;
create policy "anyone reads drift alerts"
  on public.drift_alerts for select
  using (true);

-- ============================================================
-- DONE
-- ============================================================

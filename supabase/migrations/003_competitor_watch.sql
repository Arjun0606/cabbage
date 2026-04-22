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

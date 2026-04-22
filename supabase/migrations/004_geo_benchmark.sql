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

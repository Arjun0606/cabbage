-- ============================================================
-- Cabbge Migration 016 — Brand mention tracking
-- ============================================================
-- Pivot.14: surface every Reddit / HN / X / YouTube mention of a
-- tracked brand. The 5-engine GEO scan tells the user how AI sees
-- them; the mention tracker tells them where humans are talking.
--
--   tracked_brands   user → brand_slug subscription. Cron walks
--                    these weekly and refreshes mentions.
--   brand_mentions   one row per (brand_slug, source, source_id).
--                    Dedup key is the natural id from each source
--                    so re-running the scan is idempotent.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. tracked_brands — what a user is watching
-- ------------------------------------------------------------

create table if not exists public.tracked_brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_slug text not null,           -- joins to public_grades.slug
  display_name text,                  -- override label for UI
  notify_weekly boolean default true, -- include in weekly digest
  created_at timestamptz default now(),
  last_refreshed_at timestamptz,
  unique(user_id, brand_slug)
);

create index if not exists idx_tracked_brands_user
  on public.tracked_brands(user_id, created_at desc);

create index if not exists idx_tracked_brands_slug
  on public.tracked_brands(brand_slug);

create index if not exists idx_tracked_brands_refresh_due
  on public.tracked_brands(last_refreshed_at nulls first);

alter table public.tracked_brands enable row level security;

drop policy if exists "owner reads own tracked brands" on public.tracked_brands;
drop policy if exists "owner writes own tracked brands" on public.tracked_brands;

create policy "owner reads own tracked brands"
  on public.tracked_brands for select
  using (auth.uid() = user_id);

create policy "owner writes own tracked brands"
  on public.tracked_brands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. brand_mentions — one row per surfaced mention, deduped
-- ------------------------------------------------------------

create table if not exists public.brand_mentions (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null,            -- joins to public_grades.slug + tracked_brands.brand_slug
  source text not null,                -- 'reddit' | 'hackernews' | 'youtube' | 'x'
  source_id text not null,             -- natural id from each platform
  url text not null,
  title text,
  excerpt text,
  author text,
  score int default 0,                 -- upvotes / likes / view count, source-dependent
  comments int default 0,
  posted_at timestamptz,
  sentiment text,                      -- 'positive' | 'neutral' | 'negative' | null
  meta jsonb default '{}',
  fetched_at timestamptz default now(),
  unique(brand_slug, source, source_id)
);

create index if not exists idx_brand_mentions_slug_recent
  on public.brand_mentions(brand_slug, posted_at desc nulls last);

create index if not exists idx_brand_mentions_fetched
  on public.brand_mentions(fetched_at desc);

create index if not exists idx_brand_mentions_source
  on public.brand_mentions(source, posted_at desc nulls last);

alter table public.brand_mentions enable row level security;

drop policy if exists "anyone reads brand mentions" on public.brand_mentions;

-- Mentions surface from public sources, so reads are public. The
-- gating is on tracked_brands (only your own brands appear in your
-- dashboard). This keeps the cron writer simple and lets us reuse
-- mentions across users tracking the same brand.
create policy "anyone reads brand mentions"
  on public.brand_mentions for select
  using (true);

-- Writes only via service role.

-- ============================================================
-- DONE
-- ============================================================

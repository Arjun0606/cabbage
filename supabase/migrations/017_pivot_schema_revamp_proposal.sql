-- ============================================================
-- Cabbge Migration 017 — Pivot schema revamp (PROPOSAL — DRAFT)
-- ============================================================
-- This is the first of a 4-migration sequence (017 → 020) that
-- reshapes the schema from the RE tenant model (companies +
-- nested projects) to the post-pivot SMB shape (sites at the
-- top, no projects layer).
--
-- 017 (this file): introduce `sites` table + backfill from
--                  companies. Non-destructive — companies and
--                  projects stay in place during the cutover.
-- 018: rewrite remaining API routes to read sites instead of
--      companies (a code change, not a SQL change).
-- 019: drop projects table + RE-specific columns from
--      scan_history.results jsonb.
-- 020: drop companies once cutover is verified live.
--
-- DO NOT APPLY TO PRODUCTION WITHOUT REVIEW. Several decisions
-- in this file are placeholders pending confirmation:
--   - Backfill rule (one site per company.owner_id × company.website)
--   - Treatment of companies with multiple sites jsonb entries
--   - Whether tracked_brands.brand_slug should become
--     tracked_brands.site_id (FK to sites) — for now we keep
--     brand_slug since /api/mentions and /dashboard/mentions
--     already key off it.
--
-- Idempotent. Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. sites — replaces companies+projects as the tenant boundary
-- ------------------------------------------------------------
-- One row per tracked URL. owner_id ties back to auth.users.
-- url is the canonical origin (https://example.com); brand and
-- vertical come from the classifier that runs at /api/grade.
-- ------------------------------------------------------------

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  url text not null,                    -- canonical origin: https://stripe.com
  brand text not null,                  -- "Stripe"
  brand_aliases text[] default '{}',    -- ["stripe", "stripe payments"]
  brand_exclusions text[] default '{}', -- ["stripe county", "robert stripe"]
  vertical text not null default 'unknown',  -- saas | ecommerce | app | local_service | media | marketplace
  category text default '',             -- "Payment processing"
  classification jsonb default '{}',    -- raw classifier output for re-runs
  display_name text,                    -- override label for the dashboard
  notify_weekly boolean default true,   -- include in weekly digest
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_id, url)
);

create index if not exists idx_sites_owner on public.sites(owner_id, created_at desc);
create index if not exists idx_sites_vertical on public.sites(vertical);
create index if not exists idx_sites_url on public.sites(url);

alter table public.sites enable row level security;

drop policy if exists "owner reads own sites" on public.sites;
drop policy if exists "owner writes own sites" on public.sites;

create policy "owner reads own sites"
  on public.sites for select
  using (auth.uid() = owner_id);

create policy "owner writes own sites"
  on public.sites for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- 2. Backfill from companies (PLACEHOLDER — review before applying)
-- ------------------------------------------------------------
-- Strategy: one row per (company.owner_id, company.website).
-- Skips rows missing either field. Brand defaults to company.name
-- with the trailing TLD stripped if name is missing.
--
-- Comment this whole block out if companies table is already
-- empty (fresh install) or if you want to backfill manually
-- after reviewing edge cases.
-- ------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'companies') then
    insert into public.sites (owner_id, url, brand, vertical, category, created_at)
    select
      c.owner_id,
      case
        when c.website ~ '^https?://' then c.website
        else 'https://' || c.website
      end as url,
      coalesce(nullif(c.name, ''), split_part(c.website, '.', 1)) as brand,
      'unknown' as vertical,
      coalesce(c.industry, '') as category,
      coalesce(c.created_at, now()) as created_at
    from public.companies c
    where c.owner_id is not null
      and c.website is not null
      and c.website <> ''
    on conflict (owner_id, url) do nothing;
  end if;
end$$;

-- ------------------------------------------------------------
-- 3. Bridge tracked_brands ↔ sites (no migration of data yet)
-- ------------------------------------------------------------
-- tracked_brands today keys mentions off brand_slug (a domain
-- label like "stripe.com"). Once 018+ ships, the long-term shape
-- is for tracked_brands to FK to sites.id. For now we add a
-- nullable site_id column so the new dashboard can opportunistically
-- populate it without breaking the existing brand_slug path.
-- ------------------------------------------------------------

alter table public.tracked_brands
  add column if not exists site_id uuid references public.sites(id) on delete cascade;

create index if not exists idx_tracked_brands_site on public.tracked_brands(site_id);

-- Backfill: link tracked_brands rows to a matching site by
-- (owner=user_id, url derived from brand_slug). Only fills rows
-- where the user already has a sites row for that domain.
update public.tracked_brands tb
set site_id = s.id
from public.sites s
where tb.user_id = s.owner_id
  and tb.site_id is null
  and (
    s.url = 'https://' || tb.brand_slug
    or s.url = 'http://' || tb.brand_slug
    or s.url = 'https://www.' || tb.brand_slug
  );

-- ============================================================
-- DONE — review the backfill block before applying. See PIVOT_PLAN.md
-- §"pivot.21 — supabase revamp" for the full sequence (018-020).
-- ============================================================

-- ============================================================
-- Cabbge Migration 019 — Drop legacy crons / route data deps
-- ============================================================
-- DRAFT — third of the four-migration pivot.21 sequence.
-- DO NOT APPLY UNTIL: 018 is applied and you've confirmed nothing
-- in the live app reads the tables this migration drops.
--
-- The "rewire routes to sites" work itself happens in code, not
-- SQL — see the matching code change that swaps from(companies)
-- callers to use a sites lookup instead. This SQL file is the
-- after-the-code-rewrite cleanup: drop the now-unused tables.
--
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop article-pipeline tables that were keyed off companies
-- ------------------------------------------------------------
-- article_jobs: per-(company, project, locality) article queue.
-- crawl_jobs: per-company sitemap crawl jobs.
-- competitor_snapshots / competitor_alerts: keyed off company_id.
--
-- Each of these gets recreated post-cutover with site_id keys when
-- the corresponding feature ships in the new shape. For now,
-- there's no dashboard reading them.
--
-- Comment out individual drops if a feature you still want to keep
-- alive depends on the table.
-- ------------------------------------------------------------

drop table if exists public.article_jobs cascade;
drop table if exists public.crawl_jobs cascade;
drop table if exists public.competitor_snapshots cascade;
drop table if exists public.competitor_alerts cascade;
drop table if exists public.deployed_content cascade;
drop table if exists public.deployed_schemas cascade;

-- ------------------------------------------------------------
-- 2. Drop GSC snapshot table if you don't plan to revive it
-- ------------------------------------------------------------
-- gsc_snapshots was keyed off company_id with an RE-shaped query
-- column (location, intent, config). The integrations route still
-- reads from it, but no UI surface renders it post-pivot.
--
-- This drop is COMMENTED OUT by default — uncomment if you've
-- decided GSC integration is out of scope for the SMB pivot.
-- ------------------------------------------------------------

-- drop table if exists public.gsc_snapshots cascade;

-- ------------------------------------------------------------
-- 3. Trim subscriptions to the SMB plan shape
-- ------------------------------------------------------------
-- The plan column was created with an "enterprise" value in the
-- domain. After the pivot we only have starter/pro/scale. Coerce
-- any old "enterprise" or "base" rows to the closest equivalent so
-- isPaidTier() in lib/tiers.ts reads them correctly.
-- ------------------------------------------------------------

update public.subscriptions
set plan = 'scale'
where plan = 'enterprise';

update public.subscriptions
set plan = 'pro'
where plan = 'base';

-- ============================================================
-- DONE — review carefully. Each table drop is irreversible.
-- ============================================================

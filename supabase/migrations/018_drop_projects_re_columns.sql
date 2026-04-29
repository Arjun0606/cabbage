-- ============================================================
-- Cabbge Migration 018 — Drop projects + RE columns from scan_history
-- ============================================================
-- DRAFT — second of the four-migration pivot.21 sequence.
-- DO NOT APPLY UNTIL: 017 has been applied and the new dashboard
-- has been running on prod for at least 7 days without users
-- still hitting the legacy companies+projects flow.
--
-- 017 introduces sites + backfills from companies. (applied)
-- 018 (this file): drops projects + RE-shaped scan_history columns.
-- 019: drops the deleted RE-only API route's data dependencies (the
--      portal_submissions and refresh_queue tables that nothing
--      reads anymore).
-- 020: drops companies once cutover is verified.
--
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop the projects table
-- ------------------------------------------------------------
-- projects was the RE-specific child of companies — held configurations
-- (1/2/3 BHK), rera_number, possession_date, microsite_url. The
-- post-pivot model has no project layer; sites is a flat tenant.
--
-- All API routes that called this table (api/companies, the legacy
-- onboarding /api/projects/pending, the api/cron/project-sync cron)
-- have been deleted in pivot.18 slice 3b.
-- ------------------------------------------------------------

drop table if exists public.projects cascade;

-- ------------------------------------------------------------
-- 2. Strip RE metadata from scan_history.results
-- ------------------------------------------------------------
-- scan_history.results is jsonb that used to carry per-query
-- metadata for the RE locality engine: city, locality, config
-- (BHK), priceTier. The post-pivot QueryWithMeta only needs query
-- + level. Walking every row to rewrite the jsonb is expensive on
-- a large history table; instead we leave the existing rows alone
-- (the extra fields are harmless if unread) and document here that
-- consumers must NOT depend on those keys for new code.
--
-- If you really want clean rows, this update prunes them. Comment
-- in the line below only if scan_history is small enough to take
-- the write hit.
-- ------------------------------------------------------------

-- update public.scan_history
-- set results = (results - 'city' - 'locality' - 'config' - 'priceTier')
-- where results ?| array['city', 'locality', 'config', 'priceTier'];

-- ------------------------------------------------------------
-- 3. Drop now-unused RE-only support tables
-- ------------------------------------------------------------
-- portal_submissions: mapping of (project, portal) → submitted/not.
-- refresh_queue: queued sitemap-discovered project URLs awaiting
--   onboarding accept/dismiss.
-- broken_links: per-project crawler output. The new dashboard
--   doesn't surface this yet; if a vertical-agnostic version is
--   built later, schema will be redesigned (sites-keyed, not
--   project-keyed) so dropping the existing table is correct.
-- ------------------------------------------------------------

drop table if exists public.portal_submissions cascade;
drop table if exists public.refresh_queue cascade;
drop table if exists public.broken_links cascade;

-- ============================================================
-- DONE — review and apply on staging first.
-- ============================================================

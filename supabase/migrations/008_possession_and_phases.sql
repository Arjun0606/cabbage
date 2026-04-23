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

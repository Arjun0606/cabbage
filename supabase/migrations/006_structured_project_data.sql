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

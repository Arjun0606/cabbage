-- ============================================================
-- 010 — Allow 'Pending Review' status on projects
-- ============================================================
--
-- The weekly /api/cron/project-sync auto-detects new project URLs on
-- the customer's sitemap and inserts them as status='Pending Review'.
-- The original CHECK constraint only allowed five status values
-- (Active / Pre-launch / Under Construction / Ready to Move / Sold Out)
-- so the insert would otherwise fail. This migration drops the old
-- CHECK and re-adds it with the new value included.
--
-- Idempotent — uses pg_constraint lookup so re-runs are safe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_status_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
  END IF;
END $$;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'Active',
    'Pre-launch',
    'Under Construction',
    'Ready to Move',
    'Sold Out',
    'Pending Review'
  ));

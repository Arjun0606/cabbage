-- Crawl jobs queue — chunked site crawls that span multiple invocations.
--
-- Vercel functions cap at 5 minutes. The site crawler is tuned for
-- ~2000 pages in that window. Scale-tier customers crawling up to
-- 3000 pages need the work split across multiple cron ticks; this
-- table holds the resumable state between ticks.
--
-- The /api/site-crawl entry point still runs inline for crawls
-- ≤1500 pages (Starter + Growth tiers), so the simple synchronous
-- request path doesn't change for the common case. Only crawls
-- bigger than that get a job row + worker handoff.
--
-- Status pipeline:
--   queued    → row created, waiting for first chunk
--   running   → worker is mid-crawl, state has partial pages
--   done      → crawl finished, result is final
--   failed    → an unrecoverable error happened mid-crawl
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  max_pages INT NOT NULL,
  -- The current resumable crawl state. Shape:
  --   { visited: string[], queue: string[], pages: CrawledPage[] }
  -- The agent rehydrates Sets from these arrays on each tick.
  state JSONB NOT NULL DEFAULT '{"visited":[],"queue":[],"pages":[]}'::jsonb,
  -- Cached metric for the UI's progress bar so we don't have to JSON-
  -- inspect the state column to render percent-complete.
  pages_done INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  failed_reason TEXT,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each cron tick stamps last_tick_at so a stuck job (the one we'd
  -- never recover from a crashed Lambda mid-write) can be detected
  -- and re-claimed after a generous timeout.
  last_tick_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_pending
  ON crawl_jobs(status, enqueued_at)
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_company
  ON crawl_jobs(company_id, enqueued_at DESC);

ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crawl_jobs_owner_read" ON crawl_jobs;
CREATE POLICY "crawl_jobs_owner_read" ON crawl_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = crawl_jobs.company_id
        AND companies.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "crawl_jobs_owner_write" ON crawl_jobs;
CREATE POLICY "crawl_jobs_owner_write" ON crawl_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = crawl_jobs.company_id
        AND companies.owner_id = auth.uid()
    )
  );

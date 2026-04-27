-- Article jobs queue — bulk autonomous article generation.
--
-- The dashboard lets a customer enqueue any number of buyer-query
-- suggestions (from the content queue, blind-spot list, decay refresh
-- queue, etc.). The worker cron pulls items from this table and runs
-- /api/article-writer end-to-end without per-article human review,
-- using the brand voice / project / city / RERA context that's
-- already on file.
--
-- Status pipeline:
--   queued   → enqueued, waiting for a worker tick
--   writing  → worker has claimed it (started_at set)
--   done     → article generated, draft saved (generated_article_id
--              points to the tracked_articles row)
--   failed   → article-writer rejected or threw (failed_reason set)
--   capped   → company hit articlesPerMonth before we got to it; the
--              UI flags this separately so the customer knows it's
--              quota-blocked rather than agent-failed
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS article_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- The buyer query that drove the suggestion. Same shape as
  -- runGeoFixForQuery's input — the worker routes this to an
  -- article_type via the same regex ladder the dashboard uses.
  query TEXT NOT NULL,
  -- Pre-routed article type, optional. When null the worker derives
  -- it from the query (locality_guide / landing_page / comparison /
  -- best_of_list / nri_guide / construction_update / etc.).
  article_type TEXT,
  -- Higher priority runs first. Default 0; refresh-decay rows enqueue
  -- at 10, blind-spot losses at 20, manual user pins at 30.
  priority INT NOT NULL DEFAULT 0,
  -- Status pipeline (see header).
  status TEXT NOT NULL DEFAULT 'queued',
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  -- When the worker writes, point at the resulting tracked_articles
  -- row so the UI can deep-link from the queue to the draft.
  generated_article_id UUID REFERENCES tracked_articles(id) ON DELETE SET NULL,
  -- Dedupe per (company, query) so accidental double-clicks on
  -- "Auto-write all" don't enqueue the same item twice.
  UNIQUE (company_id, query)
);

CREATE INDEX IF NOT EXISTS idx_article_jobs_pending
  ON article_jobs(company_id, status, priority DESC, enqueued_at)
  WHERE status IN ('queued', 'writing');

CREATE INDEX IF NOT EXISTS idx_article_jobs_company_status
  ON article_jobs(company_id, status, completed_at DESC);

ALTER TABLE article_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_jobs_owner_read" ON article_jobs;
CREATE POLICY "article_jobs_owner_read" ON article_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = article_jobs.company_id
        AND companies.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "article_jobs_owner_write" ON article_jobs;
CREATE POLICY "article_jobs_owner_write" ON article_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = article_jobs.company_id
        AND companies.owner_id = auth.uid()
    )
  );

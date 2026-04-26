-- Refresh queue — auto-queued articles whose freshness has dipped.
--
-- Populated by the weekly cron at /api/cron/freshness-refresh. The
-- dashboard's RefreshQueue widget reads this when present and falls
-- back to its on-the-fly computation otherwise. Persisting a queue
-- row (rather than recomputing every dashboard load) lets the cron
-- guarantee no article slips between scans, and gives the customer
-- a stable "refresh queue" they can work through.
--
-- Idempotent on (company_id, article_id) so the weekly sweep can
-- re-run without piling duplicates.

CREATE TABLE IF NOT EXISTS refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES tracked_articles(id) ON DELETE CASCADE,
  query TEXT,
  title TEXT,
  freshness_score INT,
  days_since_publish INT,
  reason TEXT,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  -- pending | refreshed | dismissed
  status TEXT DEFAULT 'pending',
  refreshed_at TIMESTAMPTZ,
  refreshed_article_id UUID REFERENCES tracked_articles(id) ON DELETE SET NULL,
  UNIQUE (company_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_queue_company ON refresh_queue(company_id, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_queue_status ON refresh_queue(company_id, status, queued_at DESC);

ALTER TABLE refresh_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refresh_queue'
      AND policyname = 'Users can read their own refresh queue'
  ) THEN
    CREATE POLICY "Users can read their own refresh queue"
      ON refresh_queue FOR SELECT
      USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refresh_queue'
      AND policyname = 'Users can update their own refresh queue rows'
  ) THEN
    CREATE POLICY "Users can update their own refresh queue rows"
      ON refresh_queue FOR UPDATE
      USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
  END IF;
END $$;

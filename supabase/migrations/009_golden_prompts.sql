-- Golden prompts: user-locked top buyer queries tracked across every scan.
--
-- Foundation Inc's GEO research found AI visibility swings 20-30% across
-- scan runs even when nothing has changed. A CMO who sees rank +8 / -6 / +3
-- with no baseline distrusts every number. The fix is a stable top-N set
-- the user locks in — same queries every week, so volatility is readable
-- as signal vs noise. The volatility per query is computed on the fly
-- from scan_history rows (last 10 runs), no extra storage needed.

CREATE TABLE IF NOT EXISTS golden_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, query)
);

CREATE INDEX IF NOT EXISTS idx_golden_prompts_company
  ON golden_prompts(company_id, pinned_at DESC);

-- Row Level Security — every other customer-data table follows this
-- pattern (user can access rows whose company they own). Without this
-- the anon key in the client bundle could read every brand's pinned
-- queries. Idempotent: the alter is a no-op if already enabled, and
-- the policy CREATEs are guarded.
ALTER TABLE golden_prompts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can read their own golden prompts'
  ) THEN
    CREATE POLICY "Users can read their own golden prompts"
      ON golden_prompts FOR SELECT
      USING (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can pin golden prompts to their own companies'
  ) THEN
    CREATE POLICY "Users can pin golden prompts to their own companies"
      ON golden_prompts FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'golden_prompts'
      AND policyname = 'Users can unpin their own golden prompts'
  ) THEN
    CREATE POLICY "Users can unpin their own golden prompts"
      ON golden_prompts FOR DELETE
      USING (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

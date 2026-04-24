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

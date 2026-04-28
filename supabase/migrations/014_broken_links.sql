-- Broken-link monitoring.
--
-- Site crawls produce CrawledPage[] with statusCode and fetchError per
-- URL. We extract the failing rows (statusCode >= 400 OR statusCode = 0
-- OR fetchError set) into this table at crawl-completion time so the
-- dashboard can render a stable, queryable list of broken URLs without
-- re-reading the JSONB blob in crawl_jobs.state.
--
-- Each crawl writes a fresh batch keyed by (company_id, crawled_at).
-- We don't deduplicate across crawls — same URL can appear in
-- successive batches and the panel renders the most-recent batch.

CREATE TABLE IF NOT EXISTS public.broken_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status_code INT NOT NULL,        -- 0 = network error, 4xx/5xx otherwise
  fetch_error TEXT,                -- nullable; populated on network errors
  source_url TEXT,                 -- the page that linked TO the broken url, when known
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Two indexes:
--   most-recent-per-company queries (the dashboard panel) — (company_id, crawled_at desc)
--   per-URL history (was this URL broken last week too?) — (company_id, url, crawled_at)
CREATE INDEX IF NOT EXISTS idx_broken_links_company_recent
  ON public.broken_links (company_id, crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_broken_links_company_url
  ON public.broken_links (company_id, url, crawled_at DESC);

ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own broken links" ON public.broken_links;
CREATE POLICY "own broken links" ON public.broken_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
        AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
  );

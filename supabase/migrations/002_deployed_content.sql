-- ============================================================
-- Deployed content — the universal-publish mechanism.
-- ============================================================
--
-- The schema-deploy pattern made publishing schema trivial on any CMS.
-- This extends it to arbitrary HTML content (articles, locality pages,
-- GBP-style blocks). Customer embeds a single <script> tag + a <div>
-- with a data-cabbge-slot attribute and Cabbge injects the content at
-- runtime. Works on WordPress, Drupal, custom React, bespoke stacks —
-- anywhere schema-deploy works.
--
-- Usage:
--   1. In Cabbge dashboard: generate article → click "Publish via Cabbge"
--   2. Cabbge stores HTML keyed by (site_url, slot) in this table.
--   3. Customer's site has:
--        <script defer src="https://cabbge.com/api/content-loader"></script>
--        <div data-cabbge-slot="blog/3bhk-gachibowli-guide"></div>
--   4. Loader fetches /api/content-deploy?url=<origin>&slot=<slot>,
--      injects the HTML into the div.

create table if not exists public.deployed_content (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  site_url text not null,
  slot text not null,
  content_type text not null check (content_type in ('article', 'gbp_post', 'locality_page', 'html_block')),
  html text not null,
  meta jsonb,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (site_url, slot)
);

create index if not exists idx_deployed_content_lookup on public.deployed_content(site_url, slot);
create index if not exists idx_deployed_content_company on public.deployed_content(company_id);

-- No RLS: service-role writes from the dashboard, public-read from the
-- customer site via the loader. Matches the deployed_schemas pattern.
alter table public.deployed_content enable row level security;

drop policy if exists "own deployed content" on public.deployed_content;
create policy "own deployed content" on public.deployed_content
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );

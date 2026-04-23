-- ============================================================
-- Cabbge Migration 007 — Portal submission tracker
-- ============================================================
-- Cabbge generates portal-specific listing copy (99acres, Magicbricks,
-- Housing, NoBroker, etc.) + GBP for every project. The "paste and
-- submit" step is manual, and the Authority tab now has a "Mark
-- submitted" toggle per project × portal. This table persists that
-- state so it survives across devices and doesn't only live in the
-- user's browser localStorage.
--
-- Idempotent. Re-running is safe.

create table if not exists public.portal_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  /** Project this submission belongs to. Empty string = company-level. */
  project_name text not null default '',
  /** Portal key — matches the slugifyPortal() output (e.g. "99acres", "magicbricks", "gbp"). */
  portal_key text not null,
  submitted_at timestamptz not null default now(),
  unique (company_id, project_name, portal_key)
);

create index if not exists idx_portal_submissions_company
  on public.portal_submissions(company_id);

-- RLS so a customer can only read/write their own submission rows.
alter table public.portal_submissions enable row level security;

drop policy if exists "own portal submissions" on public.portal_submissions;

create policy "own portal submissions" on public.portal_submissions
  for all using (
    exists (
      select 1 from public.companies c
      where c.id = portal_submissions.company_id
        and (c.owner_id = auth.uid() or c.owner_id is null)
    )
  );

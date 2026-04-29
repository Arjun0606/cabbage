-- ============================================================
-- Cabbge Migration 020 — Drop companies + reshape supporting tables
-- ============================================================
-- DRAFT — final of the four-migration pivot.21 sequence.
-- DO NOT APPLY UNTIL: 017, 018, 019 have all been applied AND
-- you have verified for at least 30 days of prod traffic that no
-- code path still reads from public.companies. The check:
--
--   select count(*) from public.companies;
--   select * from pg_stat_user_tables
--    where relname = 'companies' order by last_seq_scan desc;
--
-- If seq_scan / idx_scan numbers are still increasing, something
-- is still reading and dropping will break it.
--
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop the companies table
-- ------------------------------------------------------------
-- All referencing code paths have been migrated to public.sites.
-- All previously-cascading FK tables (projects, portal_submissions,
-- article_jobs, etc.) were already dropped in 018/019.
--
-- The remaining FK references (subscriptions.company_id, profiles
-- if it had one, etc.) need to be dropped or repointed first or
-- the cascade will take more than expected.
-- ------------------------------------------------------------

-- Belt-and-braces: drop FK constraints from any surviving table that
-- still references companies, before the actual drop.
do $$
declare
  rec record;
begin
  for rec in
    select tc.table_schema, tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
    join information_schema.constraint_column_usage ccu
      on rc.unique_constraint_name = ccu.constraint_name
    where ccu.table_schema = 'public' and ccu.table_name = 'companies'
  loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      rec.table_schema, rec.table_name, rec.constraint_name
    );
  end loop;
end$$;

drop table if exists public.companies cascade;

-- ------------------------------------------------------------
-- 2. Trim subscriptions of the now-orphaned company_id column
-- ------------------------------------------------------------
-- Subscriptions are user-keyed already (user_id is the unique).
-- company_id was a denormalisation that's no longer meaningful.
-- ------------------------------------------------------------

alter table public.subscriptions
  drop column if exists company_id;

-- ------------------------------------------------------------
-- 3. credit_usage was keyed by company_id — repoint to user_id
-- ------------------------------------------------------------
-- Some credit_usage rows may have a company_id but no user_id (the
-- legacy enforceCredits accepted a companyId arg). For those, we
-- can't recover the user without companies (just dropped), so we
-- delete them. credit_usage is a soft accounting log — losing the
-- history is acceptable and cleaner than carrying forward orphans.
-- ------------------------------------------------------------

delete from public.credit_usage
where user_id is null;

alter table public.credit_usage
  alter column user_id set not null,
  drop column if exists company_id;

-- ============================================================
-- DONE — companies is gone. Sites is the tenant boundary.
-- Update CLAUDE.md / docs/ARCHITECTURE.md to reflect.
-- ============================================================

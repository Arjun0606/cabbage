-- ============================================================
-- Cabbge Migration 005 — Drop the 14-day free trial
-- ============================================================
-- Cabbge is a paid product. A new signup lands on /pricing and only
-- gets a subscription row once they complete checkout. No more auto-
-- provisioned trial rows, no trial_ends_at clock.
--
-- What this migration does:
--   1. Drops the handle_new_profile trigger + function so new profiles
--      no longer auto-create a trialing subscription row.
--   2. Flips any still-trialing rows (from users who signed up before
--      this migration) to status='inactive' so the dashboard paywall
--      locks them out until they pay.
--   3. Updates the `subscriptions` column defaults so a manual insert
--      without a plan/status defaults to inactive.
--
-- Idempotent. Re-running is safe.

-- 1) Remove the auto-trial trigger.
drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.handle_new_profile();

-- 2) Demote anyone still on the old trial.
update public.subscriptions
   set status = 'inactive',
       plan = case when plan = 'trial' then 'none' else plan end,
       updated_at = now()
 where status = 'trialing';

-- 3) New rows default to inactive/none. The `trial_ends_at` column
--    stays (for backward compat with old queries) but no longer has a
--    14-day default — we explicitly set null.
alter table public.subscriptions
  alter column plan set default 'none';

alter table public.subscriptions
  alter column status set default 'inactive';

alter table public.subscriptions
  alter column trial_ends_at drop default;

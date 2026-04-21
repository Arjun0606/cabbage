-- ============================================================
-- Cabbge Migration 001 — Auth, Billing, Decay, Schema Deploy
-- ============================================================
-- Run this once in Supabase SQL Editor. Idempotent.
-- Enables: Supabase Auth integration, subscriptions, GSC decay
-- tracking, deployed schemas public lookup, user↔company linking.

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Profiles (one per auth.users row) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Link companies → users ----------
alter table public.companies
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

create index if not exists idx_companies_owner on public.companies(owner_id);

-- ---------- Subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  plan text not null default 'trial',      -- trial | starter | growth | enterprise
  status text not null default 'trialing', -- trialing | active | past_due | canceled | expired
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  razorpay_plan_id text,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_razorpay on public.subscriptions(razorpay_subscription_id);

-- Auto-create trial subscription when a profile is created
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ---------- GSC snapshots (content decay tracking) ----------
create table if not exists public.gsc_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  site_url text not null,
  captured_at timestamptz default now(),
  pages jsonb not null,
  queries jsonb,
  totals jsonb
);

create index if not exists idx_gsc_snapshots_site on public.gsc_snapshots(site_url, captured_at desc);

-- ---------- Deployed schemas (public schema loader endpoint) ----------
create table if not exists public.deployed_schemas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  site_url text not null,
  page_path text not null,
  schema_type text not null,
  schema_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(site_url, page_path)
);

create index if not exists idx_deployed_schemas_lookup on public.deployed_schemas(site_url, page_path);

-- ---------- Tracked articles (publish → rescan loop) ----------
create table if not exists public.tracked_articles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  query text not null,
  title text,
  content text,
  status text default 'draft',
  publish_url text,
  generated_at timestamptz default now(),
  published_at timestamptz,
  pre_score jsonb,
  post_score jsonb
);

create index if not exists idx_articles_company on public.tracked_articles(company_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.gsc_snapshots enable row level security;
alter table public.deployed_schemas enable row level security;
alter table public.tracked_articles enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.competitors enable row level security;
alter table public.scan_history enable row level security;
alter table public.credit_usage enable row level security;
alter table public.chat_messages enable row level security;
alter table public.generated_content enable row level security;
alter table public.integrations enable row level security;

-- Drop any previous permissive policies from earlier runs
drop policy if exists "own profile" on public.profiles;
drop policy if exists "own subscription read" on public.subscriptions;
drop policy if exists "own companies" on public.companies;
drop policy if exists "own projects" on public.projects;
drop policy if exists "own competitors" on public.competitors;
drop policy if exists "own scan history" on public.scan_history;
drop policy if exists "own gsc" on public.gsc_snapshots;
drop policy if exists "own articles" on public.tracked_articles;
drop policy if exists "own generated_content" on public.generated_content;
drop policy if exists "own credit usage" on public.credit_usage;
drop policy if exists "own chat" on public.chat_messages;
drop policy if exists "own integrations" on public.integrations;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own subscription read" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "own companies" on public.companies
  for all using (auth.uid() = owner_id or owner_id is null)
  with check (auth.uid() = owner_id);

create policy "own projects" on public.projects
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own competitors" on public.competitors
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own scan history" on public.scan_history
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own gsc" on public.gsc_snapshots
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own articles" on public.tracked_articles
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own generated_content" on public.generated_content
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own credit usage" on public.credit_usage
  for select using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "own chat" on public.chat_messages
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

create policy "own integrations" on public.integrations
  for all using (
    exists (select 1 from public.companies c where c.id = company_id and (c.owner_id = auth.uid() or c.owner_id is null))
  );

-- deployed_schemas: no RLS policy needed — our API routes use the service role
-- to both write (from dashboard) and serve (from public /api/schema-deploy GET).

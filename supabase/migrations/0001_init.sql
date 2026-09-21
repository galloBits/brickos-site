-- BrickOS core schema: profiles, catalog, subscriptions, renewal + follow-up
-- tracking. Run this in the Supabase SQL editor (or via `supabase db push`)
-- on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row, created automatically on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- catalog: bundles + agents. Public read-only; only ever written by the
-- Stripe product seed script (scripts/create-stripe-products.ts) via the
-- service-role key.
-- ---------------------------------------------------------------------------
create table public.bundles (
  id text primary key,
  title text not null,
  description text not null,
  monthly_price_cents integer not null,
  stripe_price_id text,
  sort_order integer not null default 0
);

create table public.agents (
  slug text primary key,
  bundle_id text not null references public.bundles (id),
  title text not null,
  monthly_price_cents integer not null,
  stripe_price_id text,
  sort_order integer not null default 0
);

alter table public.bundles enable row level security;
alter table public.agents enable row level security;

create policy "bundles: public read" on public.bundles for select using (true);
create policy "agents: public read" on public.agents for select using (true);

-- ---------------------------------------------------------------------------
-- subscriptions: one row per Stripe subscription. Only written server-side
-- (Stripe webhook handler using the service-role key) — no client insert/
-- update/delete policies are defined, so RLS denies those by default.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  plan_type text not null check (plan_type in ('agent', 'bundle', 'full')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Which agents a given subscription entitles the user to run.
-- For plan_type='full' this table is left empty; entitlement is implied.
create table public.subscription_agents (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  agent_slug text not null references public.agents (slug),
  primary key (subscription_id, agent_slug)
);

alter table public.subscription_agents enable row level security;

create policy "subscription_agents: read own"
  on public.subscription_agents for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_agents.subscription_id
        and s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- renewal_cycles: tracks each subscription's 90-day renewal window so the
-- cron job knows who's due a reminder.
-- ---------------------------------------------------------------------------
create table public.renewal_cycles (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  reminder_sent_at timestamptz,
  renewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.renewal_cycles enable row level security;

create policy "renewal_cycles: read own"
  on public.renewal_cycles for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = renewal_cycles.subscription_id
        and s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- follow_up_log: drip-sequence de-duplication. No client access at all;
-- service role only.
-- ---------------------------------------------------------------------------
create table public.follow_up_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  step text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, step)
);

alter table public.follow_up_log enable row level security;
-- Intentionally no policies: authenticated/anon roles get zero access,
-- only the service-role key (used exclusively server-side) can read/write.

-- Tables for the stateful Property Operations + Maintenance agents.
-- Every table is owner-scoped AND gated on the user actually holding the
-- relevant agent (Full OS plan, or a subscription that includes it), so
-- RLS enforces entitlement even for direct API calls, not just the UI.

create or replace function public.has_agent(agent text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status = 'active'
        and s.plan_type = 'full'
    )
    or exists (
      select 1
      from public.subscription_agents sa
      join public.subscriptions s on s.id = sa.subscription_id
      where s.user_id = auth.uid()
        and s.status = 'active'
        and sa.agent_slug = agent
    );
$$;

-- ---------------------------------------------------------------- leases
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_label text not null,
  unit text,
  tenant_name text not null,
  tenant_email text,
  lease_start date,
  lease_end date not null,
  monthly_rent numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.leases enable row level security;
create policy "leases: owner with agent"
  on public.leases for all
  using (auth.uid() = user_id and public.has_agent('lease-renewal-clock'))
  with check (auth.uid() = user_id and public.has_agent('lease-renewal-clock'));

-- Cron de-duplication; service role only (no policies).
create table public.lease_reminder_log (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  threshold_days integer not null,
  sent_at timestamptz not null default now(),
  unique (lease_id, threshold_days)
);
alter table public.lease_reminder_log enable row level security;

-- --------------------------------------------- vendors + work orders
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  trade text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.vendors enable row level security;
create policy "vendors: owner with agent"
  on public.vendors for all
  using (
    auth.uid() = user_id
    and (public.has_agent('work-order-router') or public.has_agent('vendor-dispatcher'))
  )
  with check (
    auth.uid() = user_id
    and (public.has_agent('work-order-router') or public.has_agent('vendor-dispatcher'))
  );

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_label text not null,
  unit text,
  title text not null,
  description text,
  trade text not null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'urgent', 'emergency')),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'dispatched', 'in_progress', 'done')),
  vendor_id uuid references public.vendors (id) on delete set null,
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.work_orders enable row level security;
create policy "work_orders: owner with agent"
  on public.work_orders for all
  using (
    auth.uid() = user_id
    and (public.has_agent('work-order-router') or public.has_agent('vendor-dispatcher'))
  )
  with check (
    auth.uid() = user_id
    and (public.has_agent('work-order-router') or public.has_agent('vendor-dispatcher'))
  );

-- ------------------------------------------------------------ inspections
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_label text not null,
  unit text,
  inspection_type text not null,
  inspected_on date not null default current_date,
  inspector text,
  overall_condition text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.inspections enable row level security;
create policy "inspections: owner with agent"
  on public.inspections for all
  using (auth.uid() = user_id and public.has_agent('inspection-logger'))
  with check (auth.uid() = user_id and public.has_agent('inspection-logger'));

-- ------------------------------------------------------------- turnovers
create table public.turnovers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_label text not null,
  unit text,
  move_out_date date,
  target_ready_date date,
  created_at timestamptz not null default now()
);
alter table public.turnovers enable row level security;
create policy "turnovers: owner with agent"
  on public.turnovers for all
  using (auth.uid() = user_id and public.has_agent('turnover-coordinator'))
  with check (auth.uid() = user_id and public.has_agent('turnover-coordinator'));

create table public.turnover_tasks (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references public.turnovers (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order integer not null default 0
);
alter table public.turnover_tasks enable row level security;
create policy "turnover_tasks: owner with agent"
  on public.turnover_tasks for all
  using (
    public.has_agent('turnover-coordinator')
    and exists (
      select 1 from public.turnovers t
      where t.id = turnover_tasks.turnover_id and t.user_id = auth.uid()
    )
  )
  with check (
    public.has_agent('turnover-coordinator')
    and exists (
      select 1 from public.turnovers t
      where t.id = turnover_tasks.turnover_id and t.user_id = auth.uid()
    )
  );

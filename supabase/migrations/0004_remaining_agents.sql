-- Tables for the remaining stateful agents. Same rules as 0003: owner-
-- scoped and gated on holding the specific agent via public.has_agent().

-- --------------------------------------------------------- checklists
-- Shared by every checklist-style agent (Due Diligence List, Closing
-- Checklist, Inspection Scheduler, Data Room Builder, Audit Prep,
-- Disposition Sequencer, K-1 Organizer). agent_slug says which one.
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  agent_slug text not null references public.agents (slug),
  label text not null,
  key_date date,
  created_at timestamptz not null default now()
);
alter table public.checklists enable row level security;
create policy "checklists: owner with agent"
  on public.checklists for all
  using (auth.uid() = user_id and public.has_agent(agent_slug))
  with check (auth.uid() = user_id and public.has_agent(agent_slug));

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_date date,
  sort_order integer not null default 0
);
alter table public.checklist_items enable row level security;
create policy "checklist_items: owner with agent"
  on public.checklist_items for all
  using (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_items.checklist_id
        and c.user_id = auth.uid()
        and public.has_agent(c.agent_slug)
    )
  )
  with check (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_items.checklist_id
        and c.user_id = auth.uid()
        and public.has_agent(c.agent_slug)
    )
  );

-- ---------------------------------------------------------- follow-ups
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_name text not null,
  phone text,
  email text,
  property_label text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'negotiating', 'offer_sent', 'under_contract', 'dead')),
  cadence_days integer not null default 7 check (cadence_days between 1 and 365),
  next_follow_up date not null default current_date,
  last_contacted_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.follow_ups enable row level security;
create policy "follow_ups: owner with agent"
  on public.follow_ups for all
  using (auth.uid() = user_id and public.has_agent('follow-up-clock'))
  with check (auth.uid() = user_id and public.has_agent('follow-up-clock'));

-- ------------------------------------------------------------- raises
create table public.raises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2),
  created_at timestamptz not null default now()
);
alter table public.raises enable row level security;
create policy "raises: owner with agent"
  on public.raises for all
  using (auth.uid() = user_id and public.has_agent('fundraising-tracker'))
  with check (auth.uid() = user_id and public.has_agent('fundraising-tracker'));

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  raise_id uuid not null references public.raises (id) on delete cascade,
  investor_name text not null,
  investor_email text,
  committed_amount numeric(14, 2) not null default 0,
  funded_amount numeric(14, 2) not null default 0,
  status text not null default 'soft'
    check (status in ('soft', 'hard', 'funded', 'declined')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.commitments enable row level security;
create policy "commitments: owner with agent"
  on public.commitments for all
  using (
    public.has_agent('fundraising-tracker')
    and exists (select 1 from public.raises r where r.id = commitments.raise_id and r.user_id = auth.uid())
  )
  with check (
    public.has_agent('fundraising-tracker')
    and exists (select 1 from public.raises r where r.id = commitments.raise_id and r.user_id = auth.uid())
  );

-- ------------------------------------------------------- digest log
-- One digest email per user, per agent, per day. Service role only.
create table public.digest_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  agent_slug text not null,
  sent_on date not null,
  unique (user_id, agent_slug, sent_on)
);
alter table public.digest_log enable row level security;

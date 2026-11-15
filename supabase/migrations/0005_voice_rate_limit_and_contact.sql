-- Rate-limit events: one row per limited request, so the limit holds across
-- Vercel's many serverless instances (in-memory counters would not). Written
-- only by API routes using the service role; no public access.
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_lookup
  on public.rate_limit_events (bucket, ip, created_at);
alter table public.rate_limit_events enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) touches it.

-- Contact messages left through the site's voice widget. Saved here first so a
-- lead is never lost even if email delivery is down or unconfigured.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  message text not null,
  ip text,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
-- No policies on purpose: only the service role can read/write these.

-- Tags each subscription with which payment provider created it, so
-- multiple providers (Stripe today, others later) can coexist. Existing
-- rows default to 'stripe' since that's the only provider wired up so far.
alter table public.subscriptions
  add column provider text not null default 'stripe';

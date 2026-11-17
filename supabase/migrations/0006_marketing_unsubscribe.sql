-- Opt-out flag for the onboarding/marketing drip emails. Transactional email
-- (billing/renewal reminders, Follow-Up Clock digests for a user's own leads)
-- is unaffected — only the marketing drip checks this.
alter table public.profiles
  add column if not exists marketing_unsubscribed boolean not null default false;

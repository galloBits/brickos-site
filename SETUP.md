# BrickOS — subscription platform setup

This repo is a Next.js 16 app: Supabase for auth/DB, Stripe for billing,
Resend for email, deployed on Vercel with two daily cron jobs. The app
builds and type-checks with zero credentials configured — nothing here
runs for real until you complete the steps below.

## 1. Supabase

1. Create a project at supabase.com (free tier is fine to start).
2. Project Settings → API: copy the **Project URL**, **anon public key**,
   and **service_role key**.
3. SQL Editor → paste the contents of `supabase/migrations/0001_init.sql`
   and run it. This creates all tables, RLS policies, and the
   auto-profile-on-signup trigger.
4. Authentication → Providers: email/password is on by default, which is
   all this app uses. (Email confirmation is on by default too — turn it
   off in Authentication → Settings if you want instant signup during
   testing.)

## 2. Stripe

1. Create/use a Stripe account. Start in **test mode**.
2. Developers → API keys: copy the **Secret key**.
3. Locally, create `.env.local` (never commit this — it's gitignored) with
   at minimum `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and
   `SUPABASE_SERVICE_ROLE_KEY` from step 1.
4. Run `npm install` then `npm run stripe:setup`. This creates 58 agent
   products, 8 bundle products, and the Full OS product/price in your
   Stripe account, and writes the resulting price IDs into Supabase. It
   prints a `STRIPE_PRICE_FULL_OS` value at the end — save it.
5. Developers → Webhooks → Add endpoint:
   `https://brickos.thecoopdao.xyz/api/stripe/webhook`, listening for
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the **signing secret**
   (`whsec_...`).
6. When ready for real payments, repeat steps 2–5 in **live mode** and
   swap the env vars on Vercel.

## 3. Resend (email)

1. Create an account at resend.com, verify the `thecoopdao.xyz` domain
   (or use their shared test sender while developing).
2. Create an API key, copy it.

## 4. Vercel environment variables

In the `brickos-site` Vercel project → Settings → Environment Variables,
add everything from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_FULL_OS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET` — any random string you generate yourself; Vercel
  automatically sends it as a Bearer token to your cron routes once this
  var exists (see `vercel.json`)
- `NEXT_PUBLIC_SITE_URL` — `https://brickos.thecoopdao.xyz`

Redeploy after adding them.

## 5. Cron jobs

Already wired up in `vercel.json`:

- `/api/cron/renewal` — daily at 13:00 UTC. Emails anyone within 7 days of
  their 90-day renewal cycle end.
- `/api/cron/followup` — daily at 14:00 UTC. Sends the day 1/3/7/14
  onboarding drip to every signed-up user, exactly once each.

Nothing to do here beyond setting `CRON_SECRET` — Vercel schedules these
automatically once the project is deployed with a `vercel.json` present.

## 6. Local development

```bash
npm install
npm run dev
```

Needs `.env.local` populated per steps 1–3 to actually authenticate,
checkout, or send email — without it the app still runs, but those
features no-op or error at the point of use (never at build/boot time).

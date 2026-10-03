// Setup script. Run locally with your OWN credentials in .env.local (this
// script never runs on Vercel and your keys never leave your machine):
//
//   npm run stripe:setup                 # uses whichever Stripe key is in .env.local
//   npm run stripe:setup -- --dry-run    # read-only: shows what it WOULD do
//   npm run stripe:setup -- --live       # required to write when the key is a LIVE key
//
// For each of the 58 agents, 8 bundles and the Full OS plan it makes sure a
// recurring monthly Stripe Price exists in the account the key belongs to,
// then writes those price IDs into the Supabase `agents` / `bundles` tables.
//
// It is safe to re-run and safe to switch between test and live: instead of
// trusting IDs already stored in the database (which belong to one Stripe
// mode and don't exist in the other), it looks each price up in the current
// account by metadata and only creates what's missing. Switching modes just
// re-points the database at the other mode's prices.

import { config } from "dotenv";
config({ path: ".env.local" });
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { AGENTS, BUNDLES, FULL_OS_MONTHLY_PRICE_CENTS } from "../lib/catalog";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const allowLive = args.has("--live");

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key) throw new Error("Set STRIPE_SECRET_KEY in .env.local before running this script.");
const isLive = key.startsWith("sk_live_");
const mode = isLive ? "LIVE" : "TEST/SANDBOX";

if (isLive && !dryRun && !allowLive) {
  console.error(
    "STRIPE_SECRET_KEY is a LIVE key. This would create live products and point your database at live prices.\n" +
      "Re-run with --live if that's what you want, or with --dry-run to preview without changing anything.",
  );
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Kind = "agent" | "bundle" | "full";
const stats = { found: 0, created: 0 };

async function findOrCreatePrice(kind: Kind, id: string | null, name: string, cents: number, storedId?: string | null) {
  const metaKey = kind === "agent" ? "agentSlug" : kind === "bundle" ? "bundleId" : "type";
  const metaVal = kind === "full" ? "full" : id!;

  const found = await stripe.prices.search({
    query: `active:'true' AND metadata['${metaKey}']:'${metaVal}'`,
    limit: 20,
  });
  const matches = found.data.filter(
    (p) =>
      p.unit_amount === cents &&
      p.currency === "usd" &&
      p.recurring?.interval === "month" &&
      p.metadata.type === kind,
  );
  const match = matches.find((p) => p.id === storedId) ?? matches[0];
  if (match) {
    stats.found++;
    return match.id;
  }

  stats.created++;
  if (dryRun) return `(would create ${kind} ${id ?? ""} at ${cents}c)`;

  const metadata: Record<string, string> = { type: kind, ...(kind === "full" ? {} : { [metaKey]: metaVal }) };
  const product = await stripe.products.create({ name, metadata });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: cents,
    recurring: { interval: "month" },
    metadata,
  });
  return price.id;
}

async function main() {
  console.log(`Stripe mode: ${mode}${dryRun ? " (dry run: nothing will be written)" : ""}`);
  console.log(`Ensuring prices for ${BUNDLES.length} bundles, ${AGENTS.length} agents, and the Full OS plan...\n`);

  // Bundles first so agents can reference bundle_id.
  for (const bundle of BUNDLES) {
    const { data: row } = await supabase.from("bundles").select("stripe_price_id").eq("id", bundle.id).maybeSingle();
    const priceId = await findOrCreatePrice("bundle", bundle.id, `BrickOS Bundle: ${bundle.title}`, bundle.monthlyPriceCents, row?.stripe_price_id);
    if (!dryRun) {
      const { error } = await supabase.from("bundles").upsert({
        id: bundle.id,
        title: bundle.title,
        description: bundle.description,
        monthly_price_cents: bundle.monthlyPriceCents,
        stripe_price_id: priceId,
      });
      if (error) throw new Error(`save bundle ${bundle.id}: ${error.message}`);
    }
    console.log(`  bundle ${bundle.id} -> ${priceId}`);
  }

  for (const agent of AGENTS) {
    const { data: row } = await supabase.from("agents").select("stripe_price_id").eq("slug", agent.slug).maybeSingle();
    const priceId = await findOrCreatePrice("agent", agent.slug, `BrickOS Agent: ${agent.title}`, agent.monthlyPriceCents, row?.stripe_price_id);
    if (!dryRun) {
      const { error } = await supabase.from("agents").upsert({
        slug: agent.slug,
        bundle_id: agent.bundleId,
        title: agent.title,
        monthly_price_cents: agent.monthlyPriceCents,
        stripe_price_id: priceId,
      });
      if (error) throw new Error(`save agent ${agent.slug}: ${error.message}`);
    }
    console.log(`  agent ${agent.slug} -> ${priceId}`);
  }

  const fullOsPriceId = await findOrCreatePrice("full", null, "BrickOS Full OS (all agents)", FULL_OS_MONTHLY_PRICE_CENTS);

  console.log(`\n${stats.found} prices already existed in this Stripe account, ${stats.created} ${dryRun ? "would be created" : "created"}.`);
  console.log(`\nFull OS price (${mode}): ${fullOsPriceId}`);
  console.log("Set this as STRIPE_PRICE_FULL_OS in Vercel and .env.local. It differs between test and live.");
  console.log(dryRun ? "\nDry run complete. Nothing was changed." : "\nDone. Price IDs are saved in the Supabase bundles/agents tables.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-time setup script. Run locally with your OWN credentials in
// .env.local (this script never runs on Vercel and your keys never leave
// your machine):
//
//   npm run stripe:setup
//
// It creates a Stripe Product + recurring monthly Price for each of the 58
// agents, each of the 8 bundles, and the Full OS plan, then writes the
// resulting price IDs into the Supabase `agents`/`bundles` tables so the
// checkout route can look them up. Safe to re-run — it skips anything that
// already has a stripe_price_id set in Supabase.

import { config } from "dotenv";
config({ path: ".env.local" });
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  AGENTS,
  BUNDLES,
  FULL_OS_MONTHLY_PRICE_CENTS,
} from "../lib/catalog";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function upsertPrice(name: string, unitAmountCents: number, metadata: Record<string, string>) {
  const product = await stripe.products.create({ name, metadata });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: unitAmountCents,
    recurring: { interval: "month" },
    metadata,
  });
  return price.id;
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Set STRIPE_SECRET_KEY in .env.local before running this script.");
  }

  console.log(`Seeding ${BUNDLES.length} bundles, ${AGENTS.length} agents, and the Full OS plan...`);

  // Bundles first (also upserts the row so agents can reference bundle_id).
  for (const bundle of BUNDLES) {
    const { data: existing } = await supabase
      .from("bundles")
      .select("stripe_price_id")
      .eq("id", bundle.id)
      .maybeSingle();

    const priceId =
      existing?.stripe_price_id ??
      (await upsertPrice(`BrickOS Bundle: ${bundle.title}`, bundle.monthlyPriceCents, {
        type: "bundle",
        bundleId: bundle.id,
      }));

    await supabase.from("bundles").upsert({
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      monthly_price_cents: bundle.monthlyPriceCents,
      stripe_price_id: priceId,
    });
    console.log(`  bundle ${bundle.id} -> ${priceId}`);
  }

  // Agents.
  for (const agent of AGENTS) {
    const { data: existing } = await supabase
      .from("agents")
      .select("stripe_price_id")
      .eq("slug", agent.slug)
      .maybeSingle();

    const priceId =
      existing?.stripe_price_id ??
      (await upsertPrice(`BrickOS Agent: ${agent.title}`, agent.monthlyPriceCents, {
        type: "agent",
        agentSlug: agent.slug,
      }));

    await supabase.from("agents").upsert({
      slug: agent.slug,
      bundle_id: agent.bundleId,
      title: agent.title,
      monthly_price_cents: agent.monthlyPriceCents,
      stripe_price_id: priceId,
    });
    console.log(`  agent ${agent.slug} -> ${priceId}`);
  }

  // Full OS (all 58 agents), stored as an env var since there's no table row for it.
  const fullOsPriceId = await upsertPrice("BrickOS Full OS (58 agents)", FULL_OS_MONTHLY_PRICE_CENTS, {
    type: "full",
  });
  console.log(`\nFull OS price created: ${fullOsPriceId}`);
  console.log("Add this to your env vars as STRIPE_PRICE_FULL_OS (Vercel + .env.local).");

  console.log("\nDone. All product/price IDs are stored in Supabase (bundles/agents tables).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

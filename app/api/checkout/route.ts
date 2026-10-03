import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPaymentProvider, type PlanType } from "@/lib/payments";
import { packList } from "@/lib/payments/metadata";

export async function POST(request: Request) {
  // Safety valve: with a live Stripe key, real cards are charged. Refuse to
  // take payments in live mode until it's been explicitly switched on
  // (STRIPE_LIVE_ENABLED=true) after the live webhook is verified, so a
  // customer can never be charged without the webhook that grants access.
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") && process.env.STRIPE_LIVE_ENABLED !== "true") {
    return NextResponse.json({ error: "Payments aren't open yet. Please check back soon." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const { planType } = body as { planType: PlanType };

  const admin = createServiceRoleClient();
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;

  let priceRefs: string[] = [];
  const metadata: Record<string, string> = { supabaseUserId: user.id, planType };

  if (planType === "full") {
    if (!process.env.STRIPE_PRICE_FULL_OS) {
      return NextResponse.json({ error: "Full OS price not configured" }, { status: 500 });
    }
    priceRefs = [process.env.STRIPE_PRICE_FULL_OS];
  } else if (planType === "bundle") {
    const { bundleId } = body as { bundleId: string };
    const { data: bundle } = await admin.from("bundles").select("stripe_price_id").eq("id", bundleId).single();
    if (!bundle?.stripe_price_id) {
      return NextResponse.json({ error: "Bundle not found or not seeded in Stripe yet" }, { status: 400 });
    }
    priceRefs = [bundle.stripe_price_id];
    metadata.bundleId = bundleId;
  } else if (planType === "agent") {
    const { agentSlugs: rawSlugs } = body as { agentSlugs: string[] };
    const agentSlugs = Array.isArray(rawSlugs) ? Array.from(new Set(rawSlugs.filter((s) => typeof s === "string"))) : [];
    if (!agentSlugs.length) {
      return NextResponse.json({ error: "No agents selected" }, { status: 400 });
    }
    const { data: agents } = await admin.from("agents").select("slug, stripe_price_id").in("slug", agentSlugs);
    const missing = agentSlugs.filter((s) => !agents?.find((a) => a.slug === s)?.stripe_price_id);
    if (missing.length) {
      return NextResponse.json({ error: `Not seeded in Stripe yet: ${missing.join(", ")}` }, { status: 400 });
    }
    priceRefs = (agents ?? []).map((a) => a.stripe_price_id!);
    Object.assign(metadata, packList("agents", agentSlugs));
  } else {
    return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
  }

  // Reuse an existing customer id for this user/provider if we have one.
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).single();

  const { redirectUrl } = await getPaymentProvider().createCheckoutSession({
    userId: user.id,
    userEmail: user.email!,
    existingCustomerId: profile?.stripe_customer_id,
    planType,
    priceRefs,
    successUrl: `${origin}/dashboard?checkout=success`,
    cancelUrl: `${origin}/pricing?checkout=cancelled`,
    metadata,
  });

  return NextResponse.json({ url: redirectUrl });
}

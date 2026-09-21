import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const { planType } = body as { planType: "agent" | "bundle" | "full" };

  const admin = createServiceRoleClient();
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;

  let lineItems: { price: string; quantity: number }[] = [];
  let metadata: Record<string, string> = { supabaseUserId: user.id, planType };

  if (planType === "full") {
    if (!process.env.STRIPE_PRICE_FULL_OS) {
      return NextResponse.json({ error: "Full OS price not configured" }, { status: 500 });
    }
    lineItems = [{ price: process.env.STRIPE_PRICE_FULL_OS, quantity: 1 }];
  } else if (planType === "bundle") {
    const { bundleId } = body as { bundleId: string };
    const { data: bundle } = await admin.from("bundles").select("stripe_price_id").eq("id", bundleId).single();
    if (!bundle?.stripe_price_id) {
      return NextResponse.json({ error: "Bundle not found or not seeded in Stripe yet" }, { status: 400 });
    }
    lineItems = [{ price: bundle.stripe_price_id, quantity: 1 }];
    metadata.bundleId = bundleId;
  } else if (planType === "agent") {
    const { agentSlugs } = body as { agentSlugs: string[] };
    if (!agentSlugs?.length) {
      return NextResponse.json({ error: "No agents selected" }, { status: 400 });
    }
    const { data: agents } = await admin.from("agents").select("slug, stripe_price_id").in("slug", agentSlugs);
    const missing = agentSlugs.filter((s) => !agents?.find((a) => a.slug === s)?.stripe_price_id);
    if (missing.length) {
      return NextResponse.json({ error: `Not seeded in Stripe yet: ${missing.join(", ")}` }, { status: 400 });
    }
    lineItems = (agents ?? []).map((a) => ({ price: a.stripe_price_id!, quantity: 1 }));
    metadata.agentSlugs = agentSlugs.join(",");
  } else {
    return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
  }

  // Reuse an existing Stripe customer for this user if we have one.
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).single();

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata,
    subscription_data: { metadata },
  });

  return NextResponse.json({ url: session.url });
}

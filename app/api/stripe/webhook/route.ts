import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { applySubscriptionEvent } from "@/lib/subscriptions";
import type { PlanType } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabaseUserId;
      if (!userId || !session.subscription || !session.customer) break;

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
      const planType = (session.metadata?.planType ?? "agent") as PlanType;

      let entitledSlugs = (session.metadata?.agentSlugs ?? "").split(",").filter(Boolean);
      if (planType === "bundle" && session.metadata?.bundleId) {
        const admin = createServiceRoleClient();
        const { data: agentsInBundle } = await admin
          .from("agents")
          .select("slug")
          .eq("bundle_id", session.metadata.bundleId);
        entitledSlugs = (agentsInBundle ?? []).map((a) => a.slug);
      }

      await applySubscriptionEvent({
        kind: "activated",
        provider: "stripe",
        providerSubscriptionId: subscription.id,
        providerCustomerId: session.customer as string,
        providerPriceId: subscription.items.data[0]?.price.id ?? "",
        userId,
        planType,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        entitledAgentSlugs: entitledSlugs,
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await applySubscriptionEvent({
        kind: "updated",
        providerSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await applySubscriptionEvent({ kind: "canceled", providerSubscriptionId: subscription.id });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

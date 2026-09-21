import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabaseUserId;
      if (!userId || !session.subscription) break;

      if (session.customer) {
        await supabase.from("profiles").update({ stripe_customer_id: session.customer as string }).eq("id", userId);
      }

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
      const planType = (session.metadata?.planType ?? "agent") as "agent" | "bundle" | "full";

      const { data: subRow } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price.id ?? "",
            plan_type: planType,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          { onConflict: "stripe_subscription_id" },
        )
        .select("id")
        .single();

      if (subRow) {
        const agentSlugs = (session.metadata?.agentSlugs ?? "").split(",").filter(Boolean);
        let entitledSlugs = agentSlugs;

        if (planType === "bundle" && session.metadata?.bundleId) {
          const { data: agentsInBundle } = await supabase
            .from("agents")
            .select("slug")
            .eq("bundle_id", session.metadata.bundleId);
          entitledSlugs = (agentsInBundle ?? []).map((a) => a.slug);
        }

        if (entitledSlugs.length) {
          await supabase
            .from("subscription_agents")
            .insert(entitledSlugs.map((slug) => ({ subscription_id: subRow.id, agent_slug: slug })));
        }

        const now = Date.now();
        await supabase.from("renewal_cycles").insert({
          subscription_id: subRow.id,
          cycle_start: new Date(now).toISOString(),
          cycle_end: new Date(now + NINETY_DAYS_MS).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

// Provider-agnostic subscription bookkeeping. Every payment provider's
// webhook route normalizes its own event payload into a
// NormalizedSubscriptionEvent and calls this — it is the only code that
// writes to the subscriptions/subscription_agents/renewal_cycles tables.
//
// Two properties matter because this is where a customer's payment turns
// into access:
//  1. Every database write is checked. A failed write throws, so the webhook
//     returns an error and the payment provider retries (supabase-js returns
//     errors instead of throwing, so unchecked writes fail silently).
//  2. It is idempotent. Providers deliver webhooks at least once, so the same
//     event can arrive twice; replaying it must not duplicate or break rows.

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { NormalizedSubscriptionEvent } from "@/lib/payments/types";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

type Db = ReturnType<typeof createServiceRoleClient>;

function must<T extends { error: { message: string } | null }>(result: T, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result;
}

export async function applySubscriptionEvent(event: NormalizedSubscriptionEvent, db: Db = createServiceRoleClient()) {
  if (event.kind === "activated") {
    must(
      await db.from("profiles").update({ stripe_customer_id: event.providerCustomerId }).eq("id", event.userId),
      "save billing customer id",
    );

    const upserted = await db
      .from("subscriptions")
      .upsert(
        {
          user_id: event.userId,
          stripe_subscription_id: event.providerSubscriptionId,
          stripe_price_id: event.providerPriceId,
          provider: event.provider,
          plan_type: event.planType,
          status: event.status,
          current_period_start: event.currentPeriodStart,
          current_period_end: event.currentPeriodEnd,
          cancel_at_period_end: event.cancelAtPeriodEnd,
        },
        { onConflict: "stripe_subscription_id" },
      )
      .select("id")
      .single();
    must(upserted, "save subscription");
    const subscriptionId = upserted.data?.id;
    if (!subscriptionId) throw new Error("save subscription: no row returned");

    if (event.entitledAgentSlugs.length) {
      must(
        await db.from("subscription_agents").upsert(
          event.entitledAgentSlugs.map((slug) => ({ subscription_id: subscriptionId, agent_slug: slug })),
          { onConflict: "subscription_id,agent_slug", ignoreDuplicates: true },
        ),
        "save agent entitlements",
      );
    }

    const existingCycle = must(
      await db.from("renewal_cycles").select("id").eq("subscription_id", subscriptionId).limit(1),
      "check renewal cycle",
    );
    if (!existingCycle.data?.length) {
      const now = Date.now();
      must(
        await db.from("renewal_cycles").insert({
          subscription_id: subscriptionId,
          cycle_start: new Date(now).toISOString(),
          cycle_end: new Date(now + NINETY_DAYS_MS).toISOString(),
        }),
        "create renewal cycle",
      );
    }
    return;
  }

  if (event.kind === "updated") {
    must(
      await db
        .from("subscriptions")
        .update({
          status: event.status,
          current_period_start: event.currentPeriodStart,
          current_period_end: event.currentPeriodEnd,
          cancel_at_period_end: event.cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", event.providerSubscriptionId),
      "update subscription",
    );
    return;
  }

  must(
    await db
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", event.providerSubscriptionId),
    "cancel subscription",
  );
}

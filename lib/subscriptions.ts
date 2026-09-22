// Provider-agnostic subscription bookkeeping. Every payment provider's
// webhook route normalizes its own event payload into a
// NormalizedSubscriptionEvent and calls one of these — this is the only
// code that writes to the subscriptions/subscription_agents/renewal_cycles
// tables, so the DB stays consistent no matter which processor fired.

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { NormalizedSubscriptionEvent } from "@/lib/payments/types";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function applySubscriptionEvent(event: NormalizedSubscriptionEvent) {
  const supabase = createServiceRoleClient();

  if (event.kind === "activated") {
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: event.providerCustomerId })
      .eq("id", event.userId);

    const { data: subRow } = await supabase
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

    if (subRow && event.entitledAgentSlugs.length) {
      await supabase
        .from("subscription_agents")
        .insert(event.entitledAgentSlugs.map((slug) => ({ subscription_id: subRow.id, agent_slug: slug })));
    }

    if (subRow) {
      const now = Date.now();
      await supabase.from("renewal_cycles").insert({
        subscription_id: subRow.id,
        cycle_start: new Date(now).toISOString(),
        cycle_end: new Date(now + NINETY_DAYS_MS).toISOString(),
      });
    }
    return;
  }

  if (event.kind === "updated") {
    await supabase
      .from("subscriptions")
      .update({
        status: event.status,
        current_period_start: event.currentPeriodStart,
        current_period_end: event.currentPeriodEnd,
        cancel_at_period_end: event.cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", event.providerSubscriptionId);
    return;
  }

  if (event.kind === "canceled") {
    await supabase
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", event.providerSubscriptionId);
  }
}

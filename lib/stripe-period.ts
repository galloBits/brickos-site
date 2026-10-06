import type Stripe from "stripe";

type Period = { current_period_start?: number; current_period_end?: number };

const iso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString();

// Older Stripe API versions put the billing period on the subscription;
// newer ones (2025-03-31 and later) put it on each subscription item. The
// shape depends on the API version the webhook destination is pinned to, so
// accept either rather than crashing (and being retried forever) on a change.
export function billingPeriod(sub: Stripe.Subscription): { start: string; end: string } {
  const top = sub as unknown as Period;
  const item = sub.items?.data?.[0] as unknown as Period | undefined;
  const start = top.current_period_start ?? item?.current_period_start;
  const end = top.current_period_end ?? item?.current_period_end;
  if (typeof start !== "number" || typeof end !== "number") {
    throw new Error(`subscription ${sub.id} has no billing period on the subscription or its items`);
  }
  return { start: iso(start), end: iso(end) };
}

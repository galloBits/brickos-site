import Stripe from "stripe";

// Lazy singleton: avoids constructing the Stripe client (which throws if
// STRIPE_SECRET_KEY is unset) during Next.js's build-time route collection,
// where env vars for a not-yet-configured deployment may not be present yet.
let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

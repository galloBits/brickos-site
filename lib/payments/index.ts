import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe-provider";

// Add new providers here as they're built (e.g. a lumino-provider.ts) and
// register them in this map. Switching which one is active for new
// checkouts is then just the PAYMENT_PROVIDER env var — no other code
// changes. Existing subscriptions keep working under whichever provider
// they were created with, since each subscriptions row records its own
// `provider` value.
const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
};

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "stripe";
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown PAYMENT_PROVIDER "${name}". Available: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}

export type { CheckoutRequest, CheckoutResult, NormalizedSubscriptionEvent, PlanType } from "./types";

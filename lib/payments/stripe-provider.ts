import { getStripe } from "@/lib/stripe";
import type { CheckoutRequest, CheckoutResult, PaymentProvider } from "./types";

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResult> {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: req.priceRefs.map((price) => ({ price, quantity: 1 })),
      customer: req.existingCustomerId ?? undefined,
      customer_email: req.existingCustomerId ? undefined : req.userEmail,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      metadata: req.metadata,
      subscription_data: { metadata: req.metadata },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return { redirectUrl: session.url };
  },
};

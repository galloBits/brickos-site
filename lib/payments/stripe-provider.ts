import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type { CheckoutRequest, CheckoutResult, PaymentProvider } from "./types";

// A saved customer id belongs to one Stripe mode. After switching from test
// to live (or if a customer was deleted in Stripe) it no longer exists, and
// reusing it makes checkout fail with "No such customer". Treat a missing
// customer as "no customer" so checkout creates a fresh one; the webhook then
// saves the new id on the profile.
export async function usableCustomerId(stripe: Pick<Stripe, "customers">, id: string | null | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  try {
    const customer = await stripe.customers.retrieve(id);
    return "deleted" in customer && customer.deleted ? undefined : id;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return undefined;
    throw error;
  }
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResult> {
    const stripe = getStripe();
    const customer = await usableCustomerId(stripe, req.existingCustomerId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: req.priceRefs.map((price) => ({ price, quantity: 1 })),
      customer,
      customer_email: customer ? undefined : req.userEmail,
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

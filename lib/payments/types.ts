// Provider-agnostic payment layer. Every payment processor (Stripe today,
// Lumino or anything else later) implements this same interface, so
// checkout/webhook routes and the dashboard never call a provider's SDK
// directly — they go through lib/payments/index.ts.

export type PlanType = "agent" | "bundle" | "full";

export type CheckoutRequest = {
  userId: string;
  userEmail: string;
  existingCustomerId?: string | null;
  planType: PlanType;
  // Provider-neutral price references, resolved by the caller from the
  // agents/bundles catalog (or a flat env var for the full-OS plan).
  priceRefs: string[];
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutResult = {
  redirectUrl: string;
};

// Normalized shape every provider's webhook handler maps its own event
// payload into before handing off to lib/subscriptions.ts. This is what
// makes the DB-writing logic identical regardless of which processor fired
// the webhook.
export type NormalizedSubscriptionEvent =
  | {
      kind: "activated";
      provider: string;
      providerSubscriptionId: string;
      providerCustomerId: string;
      providerPriceId: string;
      userId: string;
      planType: PlanType;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      entitledAgentSlugs: string[];
    }
  | {
      kind: "updated";
      providerSubscriptionId: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    }
  | {
      kind: "canceled";
      providerSubscriptionId: string;
    };

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResult>;
}

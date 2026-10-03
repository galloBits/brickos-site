import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

// Opens Stripe's hosted billing portal (cancel, update card, invoices) for
// the signed-in user's own Stripe customer. The customer id is read through
// the user's own session (RLS), never accepted from the request body, so one
// user can't open another's portal.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "You don't have a paid subscription to manage yet." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get("origin");
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${base}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal session failed", error);
    if (error instanceof Stripe.errors.StripeInvalidRequestError && /configuration/i.test(error.message)) {
      return NextResponse.json(
        { error: "Self-service billing isn't set up yet. Email hello@thecoopdao.xyz and we'll take care of it." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Couldn't open billing right now. Please try again." }, { status: 502 });
  }
}

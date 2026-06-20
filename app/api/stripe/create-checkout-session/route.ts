import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { pricingPlans } from "@/lib/plans";

export async function POST(request: Request) {
  const stripe = getStripe();
  const formData = await request.formData();
  const priceKey = String(formData.get("priceKey") ?? "");
  const plan = pricingPlans.find((item) => item.key === priceKey);
  const priceId = plan ? process.env[plan.stripePriceEnv] : null;

  if (!stripe || !plan || !priceId) {
    return NextResponse.json(
      {
        error: "Stripe n'est pas configuré. Renseigne STRIPE_SECRET_KEY et les price IDs."
      },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getBaseUrl()}/dashboard?checkout=success`,
    cancel_url: `${getBaseUrl()}/pricing?checkout=cancel`,
    allow_promotion_codes: true
  });

  return NextResponse.redirect(session.url ?? `${getBaseUrl()}/pricing`);
}

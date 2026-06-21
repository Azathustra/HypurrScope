import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = createSupabaseAdminClient();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();

  if (!stripe || !supabase || !signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const item = subscription.items.data[0];
    const periodStart = item?.current_period_start ?? Math.floor(Date.now() / 1000);
    const periodEnd = item?.current_period_end ?? periodStart;

    await supabase.from("subscriptions").upsert(
      {
        stripe_customer_id: String(subscription.customer),
        stripe_subscription_id: subscription.id,
        stripe_price_id: item?.price.id,
        plan: mapPriceToPlan(item?.price.id),
        status: subscription.status,
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      },
      { onConflict: "stripe_subscription_id" }
    );
  }

  if (event.type === "checkout.session.completed") {
    // Link user_id via session.client_reference_id when auth checkout is wired.
  }

  return NextResponse.json({ received: true });
}

function mapPriceToPlan(priceId?: string): string {
  if (!priceId) return "member";
  if (priceId === process.env.STRIPE_PRICE_PORTFOLIO_ALERTS_MONTHLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PORTFOLIO_ALERTS_YEARLY) return "pro";
  return "member";
}

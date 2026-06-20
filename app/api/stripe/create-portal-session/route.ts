import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  const stripe = getStripe();
  const viewer = await getViewer();
  const supabase = await createSupabaseServerClient();

  if (!stripe || !supabase || !viewer.id) {
    return NextResponse.json({ error: "Stripe/Supabase ou session utilisateur manquant." }, { status: 400 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "Aucun customer Stripe trouvé." }, { status: 404 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${getBaseUrl()}/account/billing`
  });

  return NextResponse.redirect(portal.url);
}

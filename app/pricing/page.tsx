import { PublicNavbar } from "@/components/saas/public-navbar";
import { PricingCard } from "@/components/saas/cards";
import { SectionHeading } from "@/components/saas/section-heading";
import { pricingFeatures, pricingPlans } from "@/lib/plans";

export default function PricingPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="Abonnements"
          title="Choisir son accès Insider Crypto"
          description="Stripe Billing gère le paiement, le renouvellement et le portail client. Les accès premium sont vérifiés côté serveur."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.key}
              name={plan.name}
              price={plan.price}
              cadence={plan.cadence}
              highlight={plan.highlight}
              features={pricingFeatures}
              priceKey={plan.key}
            />
          ))}
        </div>
      </main>
    </>
  );
}

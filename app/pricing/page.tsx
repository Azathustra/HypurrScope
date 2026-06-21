import { PricingCard } from "@/components/saas/cards";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";
import { pricingPlans } from "@/lib/plans";

export default function PricingPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="Abonnements"
          title="Choisir son acces Crypto Hold-Up"
          description="Trois offres simples : theses d'investissement, portefeuille avec alertes, ou formule annuelle avec 20% de reduction."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.key}
              name={plan.name}
              price={plan.price}
              cadence={plan.cadence}
              description={plan.description}
              highlight={plan.highlight}
              features={plan.features}
              priceKey={plan.key}
            />
          ))}
        </div>
      </main>
    </>
  );
}

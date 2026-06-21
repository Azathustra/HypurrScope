import Link from "next/link";
import { CreditCard } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";

export default function BillingSettingsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Billing" title="Abonnement et factures" description="Portail Stripe, plan actif, historique et changement d'offre." />
      <section className="premium-card rounded-[22px] p-5">
        <CreditCard className="text-accent" size={22} />
        <h2 className="mt-4 text-xl font-semibold text-white">Plan actuel</h2>
        <p className="mt-2 text-sm leading-6 text-muted">La synchronisation Stripe se fera via webhook puis table subscriptions.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <form action="/api/stripe/create-portal-session" method="POST">
            <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Ouvrir le portail Stripe</button>
          </form>
          <Link href="/pricing" className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-white">Voir les offres</Link>
        </div>
      </section>
    </div>
  );
}

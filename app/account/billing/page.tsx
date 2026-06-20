import { SectionHeading } from "@/components/saas/section-heading";

export default function BillingPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Billing" title="Gestion de l'abonnement" description="Ouverture du Stripe Customer Portal." />
      <form action="/api/stripe/create-portal-session" method="POST" className="premium-card rounded-[20px] p-5">
        <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Gérer mon abonnement</button>
      </form>
    </div>
  );
}

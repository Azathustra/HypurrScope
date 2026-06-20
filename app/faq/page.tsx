import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";

const faqs = [
  ["Comment fonctionne l'accès premium ?", "Stripe met à jour Supabase via webhook. Les routes privées vérifient ensuite l'abonnement côté serveur."],
  ["Puis-je gérer mon abonnement ?", "Oui, la page Billing ouvre le Stripe Customer Portal."],
  ["Est-ce un conseil financier ?", "Non. Le contenu est informatif et éducatif, sans recommandation personnalisée."]
];

export default function FaqPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        {faqs.map(([question, answer]) => (
          <div key={question} className="premium-card rounded-[20px] p-5">
            <h2 className="font-semibold text-white">{question}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{answer}</p>
          </div>
        ))}
      </main>
    </>
  );
}

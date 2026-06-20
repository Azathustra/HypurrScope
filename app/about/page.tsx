import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";

export default function AboutPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="À propos"
          title="Insider Crypto, terminal research privé"
          description="Un produit média/SaaS pour agréger recherche, portefeuilles modèles, formations et signaux crypto dans une interface premium."
        />
        <div className="premium-card mt-8 rounded-[20px] p-6 text-sm leading-7 text-muted">
          Contenu fourni à titre informatif et éducatif. Ne constitue pas un conseil en investissement personnalisé. Les crypto-actifs sont risqués.
        </div>
      </main>
    </>
  );
}

import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";

export function LegalPage({ title }: { title: string }) {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <SectionHeading eyebrow="Légal" title={title} />
        <div className="premium-card mt-8 rounded-[20px] p-6 text-sm leading-7 text-muted">
          Contenu fourni à titre informatif et éducatif. Ne constitue pas un conseil en investissement personnalisé. Les crypto-actifs sont risqués. Les performances passées ne préjugent pas des performances futures.
        </div>
      </main>
    </>
  );
}

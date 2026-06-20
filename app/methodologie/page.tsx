import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";

const pillars = [
  "Liquidité et flux observables",
  "Thèse fondamentale et revenus protocole",
  "Risque, invalidation et taille de position",
  "Comparaison systématique face au Bitcoin"
];

export default function MethodologiePage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="Méthodologie"
          title="Un cadre de décision, pas des promesses"
          description="Nos analyses structurent les informations utiles aux investisseurs crypto exigeants, sans conseil personnalisé ni promesse de performance."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {pillars.map((pillar) => (
            <div key={pillar} className="premium-card rounded-[20px] p-6">
              <h2 className="text-lg font-semibold text-white">{pillar}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Chaque note explicite les hypothèses, les signaux surveillés, les risques et les conditions d'invalidation.
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

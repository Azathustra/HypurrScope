import { PortfolioCard } from "@/components/saas/cards";
import { SectionHeading } from "@/components/saas/section-heading";
import { portfolios } from "@/lib/mock-saas-data";

export default function PortfoliosPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Portefeuilles" title="Portefeuilles modèles" description="Allocations mockées réalistes avec benchmark Bitcoin, risque et thèses." />
      <div className="grid gap-4 xl:grid-cols-2">
        {portfolios.map((portfolio) => <PortfolioCard key={portfolio.id} portfolio={portfolio} />)}
      </div>
    </div>
  );
}

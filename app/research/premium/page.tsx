import { AlphaSignalCard } from "@/components/saas/cards";
import { SectionHeading } from "@/components/saas/section-heading";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { alphaSignals } from "@/lib/mock-saas-data";

export default function PremiumResearchPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Research premium" title="Notes reservees aux membres" description="Signaux, theses et plans d'invalidation pour les membres payants." />
        <DemoDataBadge />
      </div>
      <div className="grid gap-4">
        {alphaSignals.filter((signal) => signal.requiredPlan !== "free").map((signal) => (
          <AlphaSignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

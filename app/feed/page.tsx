import { AlphaSignalCard } from "@/components/saas/cards";
import { SectionHeading } from "@/components/saas/section-heading";
import { alphaSignals } from "@/lib/mock-saas-data";

export default function FeedPage() {
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Research"
        title="Convictions et notes marche"
        description="Lecture Crypto Hold-Up des setups, invalidations, horizons et niveaux de risque."
      />
      <div className="flex flex-wrap gap-2">
        {["All", "Research", "Watchlist", "Risk", "Macro"].map((filter) => (
          <span key={filter} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">{filter}</span>
        ))}
      </div>
      <div className="grid gap-4">
        {alphaSignals.map((signal) => <AlphaSignalCard key={signal.id} signal={signal} />)}
      </div>
    </div>
  );
}

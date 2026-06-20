import Link from "next/link";
import { SectionHeading } from "@/components/saas/section-heading";
import { StatCard } from "@/components/stat-card";
import { ResearchCard, AlphaSignalCard } from "@/components/saas/cards";
import { SubscriptionBadge } from "@/components/saas/badges";
import { alphaSignals, portfolios, researchPosts } from "@/lib/mock-saas-data";
import { getViewer } from "@/lib/auth";

export default async function DashboardPage() {
  const viewer = await getViewer();

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Dashboard" title="Research terminal" description="Dernières analyses, signaux et portefeuilles modèles." />
        <SubscriptionBadge status={viewer.subscriptionStatus} />
      </div>
      {viewer.plan === "free" ? (
        <div className="premium-card rounded-[20px] p-6">
          <h2 className="text-xl font-semibold text-white">Passez membre pour débloquer le terminal complet</h2>
          <p className="mt-2 text-sm text-muted">Les statuts active et trialing donnent accès aux contenus premium.</p>
          <Link href="/pricing" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Upgrade</Link>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Plan" value={viewer.plan.toUpperCase()} detail="Accès courant" />
        <StatCard label="Analyses" value="12" detail="Research disponible" />
        <StatCard label="Signaux" value="10" detail="Alpha feed actif" tone="positive" />
        <StatCard label="Portefeuilles" value="4" detail="Modèles suivis" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {researchPosts.slice(0, 2).map((post) => <ResearchCard key={post.id} post={post} />)}
      </div>
      <AlphaSignalCard signal={alphaSignals[0]} />
      <div className="premium-card rounded-[20px] p-5">
        <h2 className="text-xl font-semibold text-white">Watchlist</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {["BTC", "ETH", "SOL", "HYPE", "TAO", "NVDA"].map((asset) => (
            <span key={asset} className="rounded-full border border-line px-3 py-1 text-sm text-white">{asset}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

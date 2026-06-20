import { PublicNavbar } from "@/components/saas/public-navbar";
import { ResearchCard } from "@/components/saas/cards";
import { SectionHeading } from "@/components/saas/section-heading";
import { researchPosts } from "@/lib/mock-saas-data";

const filters = ["Bitcoin", "L1", "DeFi", "AI", "Hyperliquid", "Macro", "TradFi"];

export default function ResearchPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-7xl space-y-7 px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="Research"
          title="Analyses crypto et macro"
          description="Les contenus free sont lisibles entièrement. Les notes premium affichent un extrait puis un paywall si le visiteur n'a pas l'abonnement requis."
        />
        <div className="premium-card rounded-[20px] p-4">
          <input className="h-12 w-full rounded-2xl border border-line bg-black/20 px-4 text-white" placeholder="Rechercher Bitcoin, Hyperliquid, ETF, AI..." />
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <span key={filter} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">{filter}</span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {researchPosts.map((post) => (
            <ResearchCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </>
  );
}

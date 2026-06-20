import { notFound } from "next/navigation";
import { PerformanceChart } from "@/components/performance-chart";
import { SectionHeading } from "@/components/saas/section-heading";
import { portfolios, portfolioTransactions } from "@/lib/mock-saas-data";

export default async function PortfolioDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = portfolios.find((item) => item.slug === slug);

  if (!portfolio) notFound();

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Portfolio" title={portfolio.name} description={portfolio.description} />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="premium-card rounded-[20px] p-5">
          <h2 className="text-xl font-semibold text-white">Allocation</h2>
          <div className="mt-4 space-y-3">
            {portfolio.allocations.map((allocation) => (
              <div key={allocation.ticker} className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.025] p-4">
                <div>
                  <p className="font-semibold text-white">{allocation.assetName}</p>
                  <p className="text-sm text-muted">{allocation.ticker} · {allocation.assetType}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{allocation.weight}%</p>
                  <p className="text-sm text-positive">+{allocation.performance}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="premium-card rounded-[20px] p-5">
          <h2 className="text-xl font-semibold text-white">Performance vs Bitcoin</h2>
          <PerformanceChart />
        </section>
      </div>
      <section className="premium-card rounded-[20px] p-5">
        <h2 className="text-xl font-semibold text-white">Transactions</h2>
        <div className="mt-4 grid gap-3">
          {portfolioTransactions.filter((tx) => tx.portfolioSlug === portfolio.slug).slice(0, 8).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.025] p-4">
              <p className="text-white">{tx.action} {tx.ticker}</p>
              <p className="text-muted">${tx.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

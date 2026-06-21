import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PlanBadge, RiskBadge, ConvictionBadge } from "@/components/saas/badges";
import type { AlphaSignal, ModelPortfolio, ResearchPost } from "@/lib/mock-saas-data";

export function PricingCard({
  name,
  price,
  cadence,
  description,
  highlight,
  features,
  priceKey
}: {
  name: string;
  price: string;
  cadence: string;
  description?: string;
  highlight?: boolean;
  features: string[];
  priceKey: string;
}) {
  return (
    <form action="/api/stripe/create-checkout-session" method="POST" className="h-full">
      <input type="hidden" name="priceKey" value={priceKey} />
      <div className="premium-card flex h-full flex-col rounded-[20px] p-6">
        {highlight ? <span className="mb-4 w-fit rounded-full bg-positive/10 px-3 py-1 text-xs font-semibold text-positive">Meilleur choix</span> : null}
        <h3 className="text-xl font-semibold text-white">{name}</h3>
        <p className="mt-4 text-4xl font-semibold text-white">{price}</p>
        <p className="mt-1 text-sm text-muted">{cadence}</p>
        {description ? <p className="mt-3 text-sm leading-6 text-muted">{description}</p> : null}
        <div className="mt-6 space-y-3">
          {features.map((feature) => (
            <p key={feature} className="flex items-center gap-2 text-sm text-white">
              <CheckCircle2 size={16} className="text-positive" />
              {feature}
            </p>
          ))}
        </div>
        <button className="mt-7 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">
          S'abonner
        </button>
      </div>
    </form>
  );
}

export function ResearchCard({ post }: { post: ResearchPost }) {
  return (
    <Link href={`/research/${post.slug}`} className="premium-card block rounded-[20px] p-5 transition hover:border-white/16 hover:bg-panelSoft">
      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge plan={post.requiredPlan} />
        <RiskBadge risk={post.riskLevel} />
        <ConvictionBadge conviction={post.conviction} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">{post.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{post.excerpt}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
        Lire l'analyse <ArrowRight size={15} />
      </div>
    </Link>
  );
}

export function AlphaSignalCard({ signal }: { signal: AlphaSignal }) {
  return (
    <article className="premium-card rounded-[20px] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge plan={signal.requiredPlan} />
        <RiskBadge risk={signal.riskLevel} />
        <ConvictionBadge conviction={`${signal.conviction}/100`} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{signal.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{signal.thesis}</p>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <p><span className="text-muted">Trigger</span><br /><span className="text-white">{signal.trigger}</span></p>
        <p><span className="text-muted">Invalidation</span><br /><span className="text-white">{signal.invalidation}</span></p>
        <p><span className="text-muted">Horizon</span><br /><span className="text-white">{signal.timeframe}</span></p>
      </div>
    </article>
  );
}

export function PortfolioCard({ portfolio }: { portfolio: ModelPortfolio }) {
  const totalReturn = ((portfolio.currentValue / portfolio.initialValue - 1) * 100).toFixed(1);
  const vsBtc = ((portfolio.currentValue / portfolio.btcBenchmarkValue - 1) * 100).toFixed(1);

  return (
    <Link href={`/portfolios/${portfolio.slug}`} className="premium-card block rounded-[20px] p-5 transition hover:border-white/16 hover:bg-panelSoft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PlanBadge plan={portfolio.requiredPlan} />
          <h3 className="mt-4 text-xl font-semibold text-white">{portfolio.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{portfolio.description}</p>
        </div>
        <span className="rounded-full bg-accent/12 px-3 py-1 text-sm font-semibold text-white">Risque {portfolio.riskScore}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Valeur" value={`$${Math.round(portfolio.currentValue / 1000)}K`} />
        <Metric label="Rendement" value={`+${totalReturn}%`} positive />
        <Metric label="Vs BTC" value={`+${vsBtc}%`} positive />
      </div>
    </Link>
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.025] p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={positive ? "mt-2 text-lg font-semibold text-positive" : "mt-2 text-lg font-semibold text-white"}>{value}</p>
    </div>
  );
}

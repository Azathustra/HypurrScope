import Link from "next/link";
import { BriefcaseBusiness, GraduationCap, LockKeyhole, Radar } from "lucide-react";
import { AccessCta } from "@/components/access-cta";
import { AssetIcon } from "@/components/asset-icon";
import { StatCard } from "@/components/stat-card";
import { allocations, formationTracks, latestSignals, portfolioSummary } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="subtle-grid overflow-hidden rounded-[24px] border border-line bg-panel p-6 shadow-glow lg:p-9">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-white">
            <Radar size={15} className="text-accent" />
            Research terminal privé
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white lg:text-6xl">
            Le terminal crypto pour suivre les portefeuilles, les signaux et l'alpha on-chain.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted lg:text-lg">
            Une interface dense et lisible pour piloter allocations, signaux marché et thèses d'investissement avec le niveau
            d'exigence d'un desk crypto.
          </p>
          <div className="mt-7">
            <AccessCta />
          </div>
          <div className="mt-7 inline-flex max-w-2xl items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm text-muted">
            <LockKeyhole size={16} className="shrink-0 text-accent" />
            Les données, portefeuilles, formations et signaux sont accessibles après connexion premium.
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Portefeuilles suivis" value="12" detail="3 modèles premium actifs" />
        <StatCard label="Performance YTD" value="+74.8%" detail="Sur le portefeuille principal" tone="positive" />
        <StatCard label="Assets monitorés" value="148" detail="Crypto, TradFi, commodities" />
        <StatCard label="Signaux actifs" value="27" detail="Mis à jour en continu" tone="positive" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="premium-card rounded-[20px] p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Derniers signaux</h2>
              <p className="mt-1 text-sm text-muted">Alertes research, flux et marché.</p>
            </div>
            <Link href="/feed" className="text-sm font-medium text-accent">
              Tout voir
            </Link>
          </div>
          <div className="space-y-3">
            {latestSignals.map((signal) => (
              <div key={`${signal.asset}-${signal.signal}`} className="rounded-2xl border border-line bg-white/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <AssetIcon ticker={signal.asset} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{signal.signal}</p>
                    <p className="text-xs text-muted">{signal.date} · Impact {signal.impact.toLowerCase()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card rounded-[20px] p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <BriefcaseBusiness className="text-accent" size={20} />
            <div>
              <h2 className="text-xl font-semibold text-white">Portefeuilles en vedette</h2>
              <p className="mt-1 text-sm text-muted">Allocation modèle suivie par Insider Crypto.</p>
            </div>
          </div>
          <Link
            href="/portfolio"
            className="block rounded-[18px] border border-line bg-white/[0.025] p-5 transition hover:border-white/16 hover:bg-white/[0.045]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">{portfolioSummary.name}</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Portefeuille multi-actifs combinant beta Bitcoin, revenus on-chain Hyperliquid et couvertures TradFi.
                </p>
              </div>
              <span className="rounded-full bg-positive/12 px-3 py-1 text-sm font-semibold text-positive">
                {portfolioSummary.totalReturn}
              </span>
            </div>
            <div className="mt-5 flex items-center">
              {allocations.slice(0, 5).map((asset, index) => (
                <AssetIcon key={asset.ticker} ticker={asset.ticker} className={index ? "-ml-2" : ""} />
              ))}
            </div>
          </Link>
        </div>
      </section>

      <section className="premium-card rounded-[20px] p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <GraduationCap className="text-accent" size={22} />
          <div>
            <h2 className="text-xl font-semibold text-white">Formation</h2>
            <p className="mt-1 text-sm text-muted">
              Parcours structurés pour progresser du niveau débutant au research avancé.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {formationTracks.map((track) => (
            <Link
              href="/formation"
              key={track.title}
              className="rounded-2xl border border-line bg-white/[0.025] p-4 transition hover:border-white/16 hover:bg-white/[0.045]"
            >
              <span className="rounded-full bg-accent/14 px-3 py-1 text-xs font-semibold text-white">{track.level}</span>
              <p className="mt-4 text-base font-semibold text-white">{track.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{track.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

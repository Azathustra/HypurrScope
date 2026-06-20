"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  allocations,
  portfolioSummary,
  transactions,
  type AllocationType
} from "@/lib/mock-data";
import { AllocationRow } from "@/components/allocation-row";
import { AssetIcon } from "@/components/asset-icon";
import { PerformanceChart } from "@/components/performance-chart";
import { cn } from "@/lib/utils";

const allocationGroups: AllocationType[] = ["Crypto", "TradFi", "Cash"];

const analysisTabs = [
  "Thèse d'investissement",
  "Bull/Bear",
  "Actus & Alpha",
  "Note d'analyse"
] as const;

export function PortfolioCard() {
  const [mainTab, setMainTab] = useState<"Allocations" | "Transactions">("Allocations");
  const [analysisTab, setAnalysisTab] = useState<(typeof analysisTabs)[number]>("Thèse d'investissement");

  return (
    <div className="space-y-6">
      <section className="premium-card overflow-hidden rounded-[20px]">
        <div className="border-b border-line p-5 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/12 text-xl font-bold text-white">
                {portfolioSummary.riskScore}
                <span className="absolute -bottom-1 rounded-full border border-line bg-ink px-2 py-0.5 text-[10px] text-muted">
                  risque
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">{portfolioSummary.name}</h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted">
                    {portfolioSummary.assets} assets
                  </span>
                </div>
                <div className="mt-3 flex items-center">
                  {allocations.slice(0, 5).map((asset, index) => (
                    <AssetIcon
                      key={asset.ticker}
                      ticker={asset.ticker}
                      className={cn(index > 0 && "-ml-2")}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-positive/20 bg-positive/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-positive/80">Rendement total</p>
              <p className="mt-1 text-3xl font-semibold text-positive">{portfolioSummary.totalReturn}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-line p-5 lg:p-6 xl:border-b-0 xl:border-r">
            <div className="mb-5 flex rounded-full border border-line bg-black/20 p-1">
              {(["Allocations", "Transactions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMainTab(tab)}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-sm font-medium transition",
                    mainTab === tab ? "bg-white text-ink" : "text-muted hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {mainTab === "Allocations" ? (
              <>
                <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-white/8">
                  {allocations.map((allocation) => (
                    <span
                      key={allocation.ticker}
                      style={{
                        width: `${allocation.weight}%`,
                        backgroundColor: allocation.color
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-5">
                  {allocationGroups.map((group) => (
                    <div key={group}>
                      <p className="mb-3 text-sm font-semibold text-white">
                        {group === "Crypto"
                          ? "Allocations Crypto"
                          : group === "TradFi"
                            ? "Allocations TradFi"
                            : "Cash"}
                      </p>
                      <div className="space-y-2">
                        {allocations
                          .filter((allocation) => allocation.type === group)
                          .map((allocation) => (
                            <AllocationRow key={allocation.ticker} allocation={allocation} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-accent" size={18} />
                    <span className="text-sm text-muted">Risque</span>
                  </div>
                  <span className="rounded-full bg-accent/14 px-3 py-1 text-sm font-semibold text-white">
                    Score {portfolioSummary.riskScore}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={`${transaction.date}-${transaction.asset}`}
                    className="rounded-2xl border border-line bg-white/[0.025] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {transaction.action} {transaction.asset}
                        </p>
                        <p className="mt-1 text-xs text-muted">{transaction.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{transaction.amount}</p>
                        <p className="text-xs text-muted">{transaction.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 lg:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Performance du Portefeuille</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Valeur du portefeuille depuis son lancement, comparée à un buy-and-hold Bitcoin de même valeur initiale.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Investissement initial", portfolioSummary.initialInvestment],
                ["Lancé le", portfolioSummary.launchDate],
                ["Valeur actuelle hypothétique", portfolioSummary.currentValue]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-white/[0.025] p-4">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <PerformanceChart />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Rendement total", portfolioSummary.totalReturn],
                ["Rendement annualisé", portfolioSummary.annualizedReturn],
                ["Performance vs Bitcoin", portfolioSummary.vsBitcoin]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-white/[0.025] p-4">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-positive">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="premium-card rounded-[20px] p-5 lg:p-6">
        <div className="flex gap-2 overflow-x-auto rounded-full border border-line bg-black/20 p-1">
          {analysisTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setAnalysisTab(tab)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                analysisTab === tab ? "bg-white text-ink" : "text-muted hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-6">{renderAnalysisContent(analysisTab)}</div>
      </section>
    </div>
  );
}

function renderAnalysisContent(tab: (typeof analysisTabs)[number]) {
  if (tab === "Thèse d'investissement") {
    return (
      <div className="max-w-4xl space-y-4 text-sm leading-7 text-muted">
        <p>
          Le portefeuille combine un coeur Bitcoin liquide, une exposition asymétrique à Hyperliquid, et un panier TradFi défensif
          conçu pour amortir les périodes de contraction de liquidité. La stratégie privilégie les actifs où le flux de revenus,
          la profondeur de marché ou la rareté monétaire peuvent être suivis avec des signaux observables.
        </p>
        <p>
          L'allocation n'est pas pensée comme une chasse permanente au narratif. Elle cherche plutôt à maintenir un beta crypto
          élevé lorsque la liquidité est favorable, tout en conservant de l'or, du S&P 500, NVIDIA et du cash pour financer les
          rééquilibrages après stress de marché.
        </p>
        <p>
          Les décisions de rotation sont déclenchées par trois familles de signaux : tendance de revenus on-chain, flux institutionnels
          et compression de volatilité. Cette discipline permet de comparer chaque position à une alternative simple : conserver du Bitcoin.
        </p>
      </div>
    );
  }

  if (tab === "Bull/Bear") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-positive/20 bg-positive/8 p-5">
          <h3 className="text-base font-semibold text-white">Arguments haussiers</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Flux ETF Bitcoin persistants et profondeur de marché en amélioration.</li>
            <li>Hyperliquid capte une part croissante des volumes perpétuels on-chain.</li>
            <li>Le panier TradFi réduit la dépendance à un unique régime de marché.</li>
            <li>Réserve de cash disponible pour racheter les drawdowns de qualité.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-negative/20 bg-negative/8 p-5">
          <h3 className="text-base font-semibold text-white">Risques baissiers</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Retournement de liquidité dollar ou hausse brutale des taux réels.</li>
            <li>Compression des frais Hyperliquid si la concurrence perpétuelle s'intensifie.</li>
            <li>Corrélation plus forte que prévu entre crypto, IA et actions croissance.</li>
            <li>Risque opérationnel ou réglementaire sur les infrastructures on-chain.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (tab === "Actus & Alpha") {
    const items = [
      ["20 juin 2026", "HYPE", "Impact élevé", "Les revenus annualisés accélèrent avec le retour des volumes BTC/ETH."],
      ["19 juin 2026", "BTC", "Impact élevé", "Nouvelle séquence d'entrées ETF sur trois séances consécutives."],
      ["18 juin 2026", "GOLD", "Impact moyen", "Les achats banques centrales maintiennent un support macro."],
      ["17 juin 2026", "NVDA", "Impact moyen", "La guidance data center soutient l'exposition IA du portefeuille."]
    ];

    return (
      <div className="space-y-3">
        {items.map(([date, asset, impact, text]) => (
          <div key={`${date}-${asset}`} className="rounded-2xl border border-line bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <AssetIcon ticker={asset} className="h-7 w-7 text-[9px]" />
              <span className="text-sm font-semibold text-white">{asset}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-muted">{date}</span>
              <span className="rounded-full bg-accent/14 px-2 py-0.5 text-xs text-white">{impact}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[
        ["Note globale", "8.7/10"],
        ["Conviction", "Forte"],
        ["Horizon", "12-24 mois"],
        ["Niveau de risque", "Modéré"]
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-line bg-white/[0.025] p-5">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-3 text-xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

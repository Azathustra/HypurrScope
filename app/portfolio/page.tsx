import { PortfolioCard } from "@/components/portfolio-card";

export default function PortfolioPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Portefeuilles</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">
          Portefeuilles Insider Crypto
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted">
          Allocations construites par Insider Crypto, avec thèse, profil de risque et performance historique face au Bitcoin.
        </p>
      </div>
      <PortfolioCard />
    </div>
  );
}

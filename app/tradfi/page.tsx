import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { tradfiFallbackRows } from "@/lib/market-data";

export default function TradFiPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Donnees TradFi</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Marches suivis</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Indices, actions et couvertures macro suivis avec prix live et score Insider.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Univers suivi" value="6 actifs" detail="Indices, tech, or" />
        <StatCard label="Momentum moyen 7j" value="+2.9%" detail="Watchlist TradFi" tone="positive" />
        <StatCard label="Score median" value="80" detail="Trend, flux, risque" />
      </div>
      <DataTable rows={tradfiFallbackRows} endpoint="/api/markets/tradfi" />
    </div>
  );
}

import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { tradfiFallbackRows } from "@/lib/market-data";

export default function TradFiPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Donnees TradFi</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Watchlist TradFi live</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Indices, ETF, actions tech, banques, energie et proxies crypto avec variations 24h, 7j, 30j et tendance.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Univers suivi" value="29 actifs" detail="Indices, ETF, actions" />
        <StatCard label="Frequence" value="Live" detail="Yahoo Finance" tone="positive" />
        <StatCard label="Tendance" value="30j" detail="Sparkline par actif" />
      </div>
      <DataTable rows={tradfiFallbackRows} endpoint="/api/markets/tradfi" />
    </div>
  );
}

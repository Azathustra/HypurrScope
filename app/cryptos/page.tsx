import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { cryptoFallbackRows } from "@/lib/market-data";

export default function CryptosPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Donnees crypto</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Top 100 cryptos par capitalisation</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Flux live avec logos, prix, capitalisation, variations 24h, 7j, 30j et graphique de tendance.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Univers" value="Top 100" detail="Classement par market cap" />
        <StatCard label="Frequence" value="Live" detail="WebSocket Binance + fallback" tone="positive" />
        <StatCard label="Tendance" value="7j" detail="Sparkline par actif" />
      </div>
      <DataTable
        rows={cryptoFallbackRows}
        endpoint="/api/markets/crypto"
        refreshMs={60000}
        liveEndpoint="/api/markets/crypto/live"
        liveRefreshMs={2000}
        liveStream="binance"
      />
    </div>
  );
}

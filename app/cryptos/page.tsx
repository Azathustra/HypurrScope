import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { cryptoFallbackRows } from "@/lib/market-data";

export default function CryptosPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Donnees crypto</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Cryptos monitorees</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Prix live, momentum et score Crypto Hold-Up sur les actifs suivis par l'equipe research.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Capitalisation suivie" value="$2.89T" detail="Top actifs liquides" />
        <StatCard label="Momentum moyen 7j" value="+5.8%" detail="Univers watchlist" tone="positive" />
        <StatCard label="Score median" value="79" detail="Qualite, flux, risque" />
      </div>
      <DataTable rows={cryptoFallbackRows} endpoint="/api/markets/crypto" />
    </div>
  );
}

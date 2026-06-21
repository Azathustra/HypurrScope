import { CryptoTreasuriesDashboard } from "@/components/crypto-treasuries-dashboard";
import { StatCard } from "@/components/stat-card";
import { getCryptoTreasuryData } from "@/lib/treasury-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CryptoTreasuriesPage() {
  const data = await getCryptoTreasuryData();
  const bitcoin = data.assets.find((asset) => asset.symbol === "BTC");
  const ethereum = data.assets.find((asset) => asset.symbol === "ETH");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Donnees TradFi</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Crypto treasuries</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          ETF, societes et gouvernements qui accumulent Bitcoin et Ethereum, avec NAV, mNAV et distribution.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="BTC total tracked" value={`${bitcoin?.totalAmount ?? "-"} BTC`} detail={bitcoin?.supplyShare ? `${bitcoin.supplyShare} of supply` : "Supply share"} />
        <StatCard label="ETH total tracked" value={`${ethereum?.totalAmount ?? "-"} ETH`} detail={ethereum?.supplyShare ? `${ethereum.supplyShare} of supply` : "Supply share"} />
        <StatCard label="Spot live" value={bitcoin?.price ?? "-"} detail={`ETH ${ethereum?.price ?? "-"}`} tone="positive" />
      </div>

      <CryptoTreasuriesDashboard data={data} />
    </div>
  );
}

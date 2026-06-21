import { ExternalLink } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getCryptoTreasuryData, type TreasuryItem, type TreasurySection } from "@/lib/treasury-data";

export const dynamic = "force-dynamic";
export const revalidate = 300;

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
          Suivi des ETF, fonds, entreprises et gouvernements exposes a Bitcoin et Ethereum.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="BTC trackers" value={countRows(bitcoin?.sections[0])} detail="ETF, ETP, trusts, exchanges" />
        <StatCard label="BTC gouvernements" value={countRows(bitcoin?.sections[2])} detail="Pays et entites publiques" />
        <StatCard label="ETH entities" value={countRows(ethereum?.sections[1])} detail="Societes et institutions" tone="positive" />
      </div>

      {data.assets.map((asset) => (
        <section key={asset.symbol} className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{asset.symbol}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{asset.name}</h2>
            </div>
            <p className="text-xs text-muted">Derniere synchro {formatDate(data.updatedAt)}</p>
          </div>

          <div className="grid gap-5">
            {asset.sections.map((section) => (
              <TreasuryTable key={`${asset.symbol}-${section.title}`} section={section} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TreasuryTable({ section }: { section: TreasurySection }) {
  return (
    <div className="premium-card overflow-hidden rounded-[20px]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{section.title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{section.description}</p>
        </div>
        <a
          href={section.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-muted transition hover:border-white/20 hover:text-white"
        >
          {section.sourceLabel}
          <ExternalLink size={13} />
        </a>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[48px_minmax(280px,1.8fr)_110px_150px_150px_100px] border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <span>#</span>
            <span>Nom</span>
            <span>Pays</span>
            <span className="text-right">{section.unit}</span>
            <span className="text-right">Valeur / emetteur</span>
            <span className="text-right">Part</span>
          </div>
          {section.rows.map((row) => (
            <TreasuryRow key={`${section.title}-${row.rank}-${row.name}`} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TreasuryRow({ row }: { row: TreasuryItem }) {
  return (
    <div className="grid min-h-[68px] grid-cols-[48px_minmax(280px,1.8fr)_110px_150px_150px_100px] items-center border-b border-line px-5 py-4 last:border-b-0 hover:bg-white/[0.025]">
      <span className="text-sm font-semibold text-white">{row.rank}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white" title={row.name}>
          {row.name}
        </p>
        {row.ticker ? <p className="text-xs font-semibold uppercase text-muted">{row.ticker}</p> : null}
        {row.note ? <p className="mt-1 text-xs leading-5 text-muted">{row.note}</p> : null}
      </div>
      <span className="text-sm text-muted">{row.country ?? "-"}</span>
      <span className="text-right text-sm font-semibold text-white">{row.amount}</span>
      <span className="text-right text-sm font-semibold text-white">{row.usdValue}</span>
      <span className="text-right text-sm text-muted">{row.share ?? "-"}</span>
    </div>
  );
}

function countRows(section?: TreasurySection) {
  return String(section?.rows.length ?? 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

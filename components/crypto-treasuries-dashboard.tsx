"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CryptoTreasuryData, TreasuryAsset, TreasuryCategory, TreasuryItem, TreasurySection } from "@/lib/treasury-data";

const colors = ["#2F9BFF", "#FF5B4D", "#7DD87A"];

export function CryptoTreasuriesDashboard({ data }: { data: CryptoTreasuryData }) {
  const [assetSymbol, setAssetSymbol] = useState<"BTC" | "ETH">("BTC");
  const [category, setCategory] = useState<TreasuryCategory>("etfs");
  const asset = data.assets.find((item) => item.symbol === assetSymbol) ?? data.assets[0];
  const activeSection = asset.sections.find((section) => section.id === category) ?? asset.sections[0];
  const topRows = useMemo(
    () =>
      [...asset.sections.flatMap((section) => section.rows)]
        .filter((row) => row.amountValue)
        .sort((a, b) => (b.amountValue ?? 0) - (a.amountValue ?? 0))
        .slice(0, 7),
    [asset]
  );

  return (
    <div className="premium-card overflow-hidden rounded-[18px]">
      <div className="border-b border-line px-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Crypto Treasuries</h2>
            <p className="mt-0.5 text-sm text-muted">
              Latest Total: {asset.totalAmount} {asset.symbol} ({asset.supplyShare} of supply)
            </p>
          </div>
          <p className="text-xs text-muted">Synchro {formatDate(data.updatedAt)}</p>
        </div>

        <div className="mt-3 flex gap-6 overflow-x-auto">
          {data.assets.map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                setAssetSymbol(item.symbol);
                setCategory("etfs");
              }}
              className={cn(
                "border-b-2 px-1 pb-2 text-sm font-semibold transition",
                asset.symbol === item.symbol ? "border-accent text-accent" : "border-transparent text-muted hover:text-white"
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 border-b border-line p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,0.9fr)]">
        <HoldingsByCategory asset={asset} />
        <TopHolders rows={topRows} unit={asset.symbol} />
        <Distribution asset={asset} />
      </div>

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Detailed {asset.name} Holdings</h3>
          <div className="flex flex-wrap gap-2">
            {asset.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCategory(section.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  activeSection.id === section.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 text-muted hover:border-white/20 hover:text-white"
                )}
              >
                {section.shortTitle}
                <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white">{section.totalAmount} {asset.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        <TreasuryTable section={activeSection} />
      </div>
    </div>
  );
}

function HoldingsByCategory({ asset }: { asset: TreasuryAsset }) {
  const max = Math.max(...asset.sections.map((section) => section.totalAmountValue), 1);

  return (
    <div className="h-fit rounded-[14px] border border-line bg-black/20 p-3">
      <p className="text-sm font-semibold text-white">Holdings by category</p>
      <p className="mt-1 text-xs text-muted">Spot price {asset.price}</p>
      <div className="mt-4 space-y-3">
        {asset.sections.map((section, index) => (
          <div key={section.id}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{section.shortTitle}</span>
              <span className="text-muted">{section.totalAmount} {asset.symbol}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (section.totalAmountValue / max) * 100)}%`, backgroundColor: colors[index % colors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopHolders({ rows, unit }: { rows: TreasuryItem[]; unit: string }) {
  const max = Math.max(...rows.map((row) => row.amountValue ?? 0), 1);

  return (
    <div className="h-fit rounded-[14px] border border-line bg-black/20 p-3">
      <p className="text-sm font-semibold text-white">Top holders</p>
      <p className="mt-1 text-xs text-muted">Classement courant par reserves</p>
      <div className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div key={`${row.rank}-${row.name}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate font-semibold text-white">{row.name}</span>
              <span className="shrink-0 text-muted">{row.amount} {unit}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, ((row.amountValue ?? 0) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Distribution({ asset }: { asset: TreasuryAsset }) {
  const total = asset.sections.reduce((sum, section) => sum + section.totalAmountValue, 0) || 1;
  let offset = 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="h-fit rounded-[14px] border border-line bg-black/20 p-3">
      <p className="text-sm font-semibold text-white">{asset.name} distribution</p>
      <p className="mt-1 text-xs text-muted">Largest category: {largestSection(asset).shortTitle}</p>
      <div className="mt-4 flex items-center justify-center gap-5">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="18" />
          {asset.sections.map((section, index) => {
            const length = (section.totalAmountValue / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const element = (
              <circle
                key={section.id}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="18"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </svg>
        <div className="space-y-2.5">
          {asset.sections.map((section, index) => (
            <div key={section.id} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-white">{section.shortTitle}</span>
              <span className="text-muted">{((section.totalAmountValue / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreasuryTable({ section }: { section: TreasurySection }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{section.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{section.description}</p>
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
        <div className="min-w-[1040px]">
          <div className="grid grid-cols-[46px_minmax(280px,1.7fr)_90px_116px_126px_118px_118px_84px] border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <span>#</span>
            <span>Name</span>
            <span>Country</span>
            <span className="text-right">Mkt Price</span>
            <span className="text-right">Mkt Cap</span>
            <span className="text-right">{section.unit}</span>
            <span className="text-right">NAV</span>
            <span className="text-right">mNAV</span>
          </div>
          {section.rows.map((row) => (
            <div
              key={`${section.id}-${row.rank}-${row.name}`}
              className="grid min-h-[62px] grid-cols-[46px_minmax(280px,1.7fr)_90px_116px_126px_118px_118px_84px] items-center border-b border-line px-4 py-3 last:border-b-0 hover:bg-white/[0.025]"
            >
              <span className="text-sm font-semibold text-white">{row.rank}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white" title={row.name}>{row.name}</p>
                {row.ticker ? <p className="text-xs font-semibold uppercase text-muted">{row.ticker}</p> : null}
                {row.note ? <p className="mt-1 text-xs leading-5 text-muted">{row.note}</p> : null}
              </div>
              <span className="text-sm text-muted">{row.country ?? "-"}</span>
              <span className="text-right text-sm font-semibold text-white">{row.marketPrice}</span>
              <span className="text-right text-sm font-semibold text-white">{row.marketCap}</span>
              <span className="text-right text-sm font-semibold text-white">{row.amount}</span>
              <span className="text-right text-sm font-semibold text-white">{row.nav}</span>
              <span className="text-right text-sm text-muted">{row.mnav}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function largestSection(asset: TreasuryAsset) {
  return [...asset.sections].sort((a, b) => b.totalAmountValue - a.totalAmountValue)[0];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

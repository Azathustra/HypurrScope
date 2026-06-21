"use client";

import { useEffect, useState } from "react";
import { AssetIcon } from "@/components/asset-icon";
import { cn } from "@/lib/utils";
import type { MarketRow } from "@/lib/market-data";

export function DataTable({ rows, endpoint }: { rows: MarketRow[]; endpoint?: string }) {
  const [tableRows, setTableRows] = useState(rows);
  const [source, setSource] = useState(endpoint ? "Chargement live..." : "Dossier Crypto Hold-Up");

  useEffect(() => {
    if (!endpoint) return;

    let active = true;

    fetch(endpoint)
      .then((response) => response.json())
      .then((payload: { rows?: MarketRow[]; source?: string }) => {
        if (!active || !payload.rows?.length) return;
        setTableRows(payload.rows);
        setSource(payload.source === "fallback" ? "Donnees de secours" : "Flux marche live");
      })
      .catch(() => {
        if (active) setSource("Donnees de secours");
      });

    return () => {
      active = false;
    };
  }, [endpoint]);

  return (
    <div className="premium-card overflow-x-auto rounded-[20px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{source}</p>
        {endpoint ? <p className="text-xs text-muted">Mise a jour automatique</p> : null}
      </div>
      <div className="min-w-[1260px]">
        <div className="grid grid-cols-[0.35fr_2fr_0.85fr_0.7fr_0.7fr_0.7fr_1fr_1.45fr] border-b border-line px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          <span>#</span>
          <span>Nom</span>
          <span className="text-right">Prix</span>
          <span className="text-right">24h %</span>
          <span className="text-right">7j %</span>
          <span className="text-right">30j %</span>
          <span className="text-right">Capitalisation</span>
          <span className="text-right">Derniere tendance</span>
        </div>
        {tableRows.map((row, index) => (
          <div
            key={`${row.ticker}-${index}`}
            className="grid grid-cols-[0.35fr_2fr_0.85fr_0.7fr_0.7fr_0.7fr_1fr_1.45fr] items-center border-b border-line px-5 py-4 last:border-b-0 hover:bg-white/[0.025]"
          >
            <span className="text-sm font-semibold text-white">{row.rank ?? index + 1}</span>
            <div className="flex items-center gap-3">
              <AssetIcon ticker={row.ticker} imageUrl={row.logoUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                <p className="text-xs font-semibold uppercase text-muted">{row.ticker}</p>
              </div>
            </div>
            <span className="text-right text-sm font-semibold text-white">{row.price}</span>
            <Percent value={row.day} />
            <Percent value={row.week} />
            <Percent value={row.month ?? 0} muted={row.month === undefined} />
            <span className="text-right text-sm font-semibold text-white">{row.cap}</span>
            <div className="flex justify-end">
              <Sparkline values={row.sparkline} trend={row.week || row.day} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Percent({ value, muted = false }: { value: number; muted?: boolean }) {
  if (muted) {
    return <span className="text-right text-sm font-medium text-muted">-</span>;
  }

  return (
    <span className={cn("text-right text-sm font-semibold", value >= 0 ? "text-positive" : "text-negative")}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function Sparkline({ values, trend }: { values?: number[]; trend: number }) {
  const cleanValues = values?.filter((value) => typeof value === "number" && Number.isFinite(value)).slice(-80) ?? [];

  if (cleanValues.length < 2) {
    return <div className="h-12 w-44 rounded-xl border border-line bg-white/[0.025]" />;
  }

  const width = 176;
  const height = 48;
  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  const range = max - min || 1;
  const points = cleanValues
    .map((value, index) => {
      const x = (index / (cleanValues.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const color = trend >= 0 ? "#23C782" : "#FF5B4D";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-44 overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

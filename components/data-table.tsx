"use client";

import Link from "next/link";
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
        setSource(payload.source === "fallback" ? "Données de secours" : "Prix live");
      })
      .catch(() => {
        if (active) setSource("Données de secours");
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
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[1.25fr_0.8fr_0.65fr_0.65fr_0.85fr_0.75fr_0.55fr] border-b border-line px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          <span>Nom</span>
          <span>Ticker</span>
          <span>24h</span>
          <span>7j</span>
          <span>Market cap</span>
          <span>Score</span>
          <span />
        </div>
        {tableRows.map((row) => (
          <div
            key={row.ticker}
            className="grid grid-cols-[1.25fr_0.8fr_0.65fr_0.65fr_0.85fr_0.75fr_0.55fr] items-center border-b border-line px-5 py-4 last:border-b-0 hover:bg-white/[0.025]"
          >
            <div className="flex items-center gap-3">
              <AssetIcon ticker={row.ticker} />
              <div>
                <p className="text-sm font-semibold text-white">{row.name}</p>
                <p className="text-xs text-muted">{row.price}</p>
              </div>
            </div>
            <span className="text-sm text-muted">{row.ticker}</span>
            <Percent value={row.day} />
            <Percent value={row.week} />
            <span className="text-sm text-white">{row.cap}</span>
            <span className="w-fit rounded-full bg-accent/14 px-3 py-1 text-sm font-semibold text-white">
              {row.score}
            </span>
            <Link
              href="/feed"
              className="rounded-full border border-line px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:border-white/16"
            >
              Voir
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function Percent({ value }: { value: number }) {
  return (
    <span className={cn("text-sm font-medium", value >= 0 ? "text-positive" : "text-negative")}>
      {value >= 0 ? "+" : ""}
      {value}%
    </span>
  );
}

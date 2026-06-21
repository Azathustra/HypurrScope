"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetIcon } from "@/components/asset-icon";
import { cn } from "@/lib/utils";
import type { MarketRow } from "@/lib/market-data";

type SortKey = "rank" | "name" | "price" | "day" | "week" | "month" | "cap";
type SortDirection = "asc" | "desc";

const tableColumns = "grid-cols-[42px_minmax(250px,2fr)_92px_76px_76px_76px_120px_144px]";

export function DataTable({ rows, endpoint }: { rows: MarketRow[]; endpoint?: string }) {
  const [tableRows, setTableRows] = useState(rows);
  const [source, setSource] = useState(endpoint ? "Chargement live..." : "Dossier Crypto Hold-Up");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "rank",
    direction: "asc"
  });

  useEffect(() => {
    if (!endpoint) return;

    let active = true;

    const loadRows = () => {
      fetch(endpoint, { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { rows?: MarketRow[]; source?: string }) => {
          if (!active || !payload.rows?.length) return;
          setTableRows(payload.rows);
          setSource(payload.source === "fallback" ? "Donnees de secours" : "Flux marche live");
        })
        .catch(() => {
          if (active) setSource("Donnees de secours");
        });
    };

    loadRows();
    const refresh = window.setInterval(loadRows, 30000);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [endpoint]);

  const sortedRows = useMemo(() => {
    return [...tableRows].sort((first, second) => {
      const firstValue = getSortValue(first, sort.key);
      const secondValue = getSortValue(second, sort.key);

      if (typeof firstValue === "string" || typeof secondValue === "string") {
        return sort.direction === "asc"
          ? String(firstValue).localeCompare(String(secondValue))
          : String(secondValue).localeCompare(String(firstValue));
      }

      const firstNumber = typeof firstValue === "number" && Number.isFinite(firstValue) ? firstValue : -Infinity;
      const secondNumber = typeof secondValue === "number" && Number.isFinite(secondValue) ? secondValue : -Infinity;
      return sort.direction === "asc" ? firstNumber - secondNumber : secondNumber - firstNumber;
    });
  }, [tableRows, sort]);

  const changeSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  };

  return (
    <div className="premium-card overflow-hidden rounded-[20px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{source}</p>
        {endpoint ? <p className="text-xs text-muted">Mise a jour auto 30s</p> : null}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[978px]">
          <div
            className={cn(
              "grid border-b border-line px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted",
              tableColumns
            )}
          >
            <SortHeader label="#" sortKey="rank" activeSort={sort} onSort={changeSort} />
            <SortHeader label="Nom" sortKey="name" activeSort={sort} onSort={changeSort} />
            <SortHeader label="Prix" sortKey="price" activeSort={sort} onSort={changeSort} align="right" />
            <SortHeader label="24h %" sortKey="day" activeSort={sort} onSort={changeSort} align="right" />
            <SortHeader label="7j %" sortKey="week" activeSort={sort} onSort={changeSort} align="right" />
            <SortHeader label="30j %" sortKey="month" activeSort={sort} onSort={changeSort} align="right" />
            <SortHeader label="Capitalisation" sortKey="cap" activeSort={sort} onSort={changeSort} align="right" />
            <span className="text-right">Tendance</span>
          </div>
          {sortedRows.map((row, index) => (
            <div
              key={`${row.ticker}-${index}`}
              className={cn(
                "grid min-h-[72px] items-center border-b border-line px-5 py-4 last:border-b-0 hover:bg-white/[0.025]",
                tableColumns
              )}
            >
              <span className="text-sm font-semibold text-white">{row.rank ?? index + 1}</span>
              <div className="flex min-w-0 items-center gap-3">
                <AssetIcon ticker={row.ticker} imageUrl={row.logoUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white" title={row.name}>
                    {row.name}
                  </p>
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
    </div>
  );
}

function getSortValue(row: MarketRow, key: SortKey) {
  if (key === "rank") return row.rank ?? Number.MAX_SAFE_INTEGER;
  if (key === "name") return row.name;
  if (key === "price") return row.priceValue ?? parseDisplayNumber(row.price);
  if (key === "day") return row.day;
  if (key === "week") return row.week;
  if (key === "month") return row.month ?? -Infinity;
  return row.capValue ?? parseDisplayNumber(row.cap);
}

function parseDisplayNumber(value: string) {
  const match = value.replaceAll("$", "").replaceAll(",", "").trim().match(/^(-?\d+(?:\.\d+)?)([TBM])?$/i);
  if (!match) return -Infinity;

  const amount = Number(match[1]);
  const unit = match[2]?.toUpperCase();

  if (unit === "T") return amount * 1_000_000_000_000;
  if (unit === "B") return amount * 1_000_000_000;
  if (unit === "M") return amount * 1_000_000;
  return amount;
}

function SortHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  align = "left"
}: {
  label: string;
  sortKey: SortKey;
  activeSort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = activeSort.key === sortKey;
  const marker = active ? (activeSort.direction === "desc" ? "v" : "^") : "+";

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] transition hover:text-white",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
        active ? "text-white" : "text-muted"
      )}
    >
      <span className="truncate">{label}</span>
      <span className="text-[10px] leading-none text-muted">{marker}</span>
    </button>
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
    return <div className="h-10 w-32 rounded-xl border border-line bg-white/[0.025]" />;
  }

  const width = 128;
  const height = 40;
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-32 overflow-visible">
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

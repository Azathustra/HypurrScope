"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AssetIcon } from "@/components/asset-icon";
import { cn } from "@/lib/utils";
import type { MarketRow } from "@/lib/market-data";

type SortKey = "rank" | "name" | "price" | "day" | "week" | "month" | "cap";
type SortDirection = "asc" | "desc";

const tableColumns = "grid-cols-[42px_minmax(250px,2fr)_92px_76px_76px_76px_120px_144px]";

type LivePrice = {
  ticker: string;
  price: string;
  priceValue: number;
  day?: number;
};

export function DataTable({
  rows,
  endpoint,
  refreshMs = 30000,
  liveEndpoint,
  liveRefreshMs = 5000,
  liveStream
}: {
  rows: MarketRow[];
  endpoint?: string;
  refreshMs?: number;
  liveEndpoint?: string;
  liveRefreshMs?: number;
  liveStream?: "binance";
}) {
  const [tableRows, setTableRows] = useState(rows);
  const [source, setSource] = useState(endpoint ? "Chargement live..." : "Dossier Crypto Hold-Up");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const tableRowsRef = useRef(tableRows);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "rank",
    direction: "asc"
  });

  useEffect(() => {
    tableRowsRef.current = tableRows;
  }, [tableRows]);

  useEffect(() => {
    if (!endpoint) return;

    let active = true;

    const loadRows = () => {
      fetch(endpoint, { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { rows?: MarketRow[]; source?: string; updatedAt?: string }) => {
          if (!active || !payload.rows?.length) return;
          setTableRows(payload.rows);
          setSource(payload.source === "fallback" ? "Donnees de secours" : "Flux marche live");
          setUpdatedAt(formatUpdateTime(payload.updatedAt));
        })
        .catch(() => {
          if (active) setSource("Donnees de secours");
        });
    };

    loadRows();
    const refresh = window.setInterval(loadRows, refreshMs);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [endpoint, refreshMs]);

  useEffect(() => {
    if (!liveEndpoint) return;

    let active = true;

    const loadLivePrices = () => {
      const symbols = [...new Set(tableRowsRef.current.map((row) => row.ticker).filter(Boolean))];
      if (!symbols.length) return;

      const url = new URL(liveEndpoint, window.location.origin);
      url.searchParams.set("symbols", symbols.join(","));

      fetch(url.toString(), { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { prices?: LivePrice[]; updatedAt?: string }) => {
          if (!active || !payload.prices?.length) return;

          const prices = new Map(payload.prices.map((price) => [price.ticker, price]));
          setTableRows((current) =>
            current.map((row) => {
              const live = prices.get(row.ticker);
              if (!live) return row;

              return {
                ...row,
                price: live.price,
                priceValue: live.priceValue,
                day: typeof live.day === "number" ? live.day : row.day
              };
            })
          );
          setSource("Flux prix live");
          setUpdatedAt(formatUpdateTime(payload.updatedAt));
        })
        .catch(() => {
          if (active) setUpdatedAt(formatUpdateTime());
        });
    };

    loadLivePrices();
    const refresh = window.setInterval(loadLivePrices, liveRefreshMs);

    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, [liveEndpoint, liveRefreshMs]);

  const streamSymbolsKey = useMemo(() => {
    if (liveStream !== "binance") return "";

    return [
      ...new Set(
        tableRows
          .map((row) => binanceStreamTicker(row.ticker))
          .filter((ticker): ticker is string => Boolean(ticker))
          .slice(0, 80)
      )
    ].join(",");
  }, [liveStream, tableRows]);

  useEffect(() => {
    if (liveStream !== "binance" || !streamSymbolsKey) return;

    let active = true;
    const streams = streamSymbolsKey
      .split(",")
      .map((ticker) => `${ticker.toLowerCase()}usdt@ticker`)
      .join("/");
    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    socket.onopen = () => {
      if (!active) return;
      setSource("Flux WebSocket live");
      setUpdatedAt(formatUpdateTime());
    };

    socket.onmessage = (event) => {
      if (!active) return;

      try {
        const payload = JSON.parse(event.data) as { data?: { s?: string; c?: string; P?: string } };
        const symbol = payload.data?.s;
        const priceValue = Number(payload.data?.c);
        const dayValue = Number(payload.data?.P);
        if (!symbol || !Number.isFinite(priceValue) || priceValue <= 0) return;

        const ticker = symbol.replace(/USDT$/, "");
        setTableRows((current) =>
          current.map((row) => {
            if (binanceStreamTicker(row.ticker) !== ticker) return row;

            return {
              ...row,
              price: formatLiveUsd(priceValue),
              priceValue,
              day: Number.isFinite(dayValue) ? Number(dayValue.toFixed(2)) : row.day
            };
          })
        );
        setUpdatedAt(formatUpdateTime());
      } catch {
        return;
      }
    };

    socket.onerror = () => {
      if (!active) return;
      setSource("Flux prix live");
    };

    return () => {
      active = false;
      socket.close();
    };
  }, [liveStream, streamSymbolsKey]);

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
        {endpoint ? (
          <p className="text-xs text-muted">
            {liveStream === "binance"
              ? "Prix WebSocket live"
              : liveEndpoint
                ? `Prix live ${Math.round(liveRefreshMs / 1000)}s`
                : `Mise a jour auto ${Math.round(refreshMs / 1000)}s`}
            {updatedAt ? ` - ${updatedAt}` : ""}
          </p>
        ) : null}
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

function binanceStreamTicker(ticker: string) {
  const normalized = ticker.toUpperCase();
  const aliases: Record<string, string> = {
    WBTC: "BTC",
    WETH: "ETH",
    STETH: "ETH",
    WBETH: "ETH"
  };
  const supported = new Set([
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP",
    "DOGE",
    "TRX",
    "ADA",
    "LINK",
    "AVAX",
    "SUI",
    "LTC",
    "BCH",
    "DOT",
    "UNI",
    "AAVE",
    "PEPE",
    "SHIB",
    "NEAR",
    "APT",
    "ARB",
    "OP",
    "ETC",
    "XLM",
    "HBAR",
    "ICP",
    "FIL",
    "ATOM",
    "INJ",
    "WIF",
    "TIA",
    "SEI",
    "FET",
    "RENDER",
    "MKR",
    "RUNE",
    "ALGO",
    "VET",
    "JUP",
    "PENDLE",
    "ENA",
    "CRV",
    "LDO",
    "GRT",
    "IMX",
    "MNT"
  ]);
  const resolved = aliases[normalized] ?? normalized;

  return supported.has(resolved) ? resolved : null;
}

function formatLiveUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1 ? 2 : 0,
    maximumFractionDigits: value >= 1 ? 2 : 6
  }).format(value);
}

function formatUpdateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
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

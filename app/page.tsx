import { headers } from "next/headers";
import HypurrScopeClient from "./hypurrscope-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ApiCoin = "BTC" | "ETH" | "HYPE";

type MarketCtx = {
  price: number | null;
  prevPrice: number | null;
  midPx: number | null;
  fundingPct: number | null;
  premium: number | null;
  openInterestRaw: number | null;
  oiUsd: number | null;
  volume24hUsd: number | null;
  oraclePx: number | null;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeUsd: number;
};

type Book = {
  bids: Array<{ price: number; size: number; usd: number }>;
  asks: Array<{ price: number; size: number; usd: number }>;
  bestBid: number;
  bestAsk: number;
  spreadBps: number | null;
  depth10Bps: number | null;
  depth25Bps: number | null;
  depth50Bps: number | null;
};

type OiHistoryResponse = {
  ok: boolean;
  asset: ApiCoin;
  currentOiUsd: number | null;
  oiUsd15mAgo: number | null;
  oiUsd1hAgo: number | null;
  oiUsd4hAgo: number | null;
  oiChange15mPct: number | null;
  oiChange1hPct: number | null;
  oiChange4hPct: number | null;
  availableHistoryMinutes: number;
  requiredHistoryMinutes: { oi15m: number; oi1h: number; oi4h: number };
  snapshotCount?: number;
  status: "ready" | "warming_up" | "insufficient_history" | "error";
  message?: string;
  error?: string;
  updatedAt?: string;
};

type InitialAssetState = {
  market: MarketCtx;
  candles: Candle[];
  book: Book | null;
  trades: [];
  oiHistory: [];
  fundingHistory: [];
  freshness: Partial<Record<"meta" | "candles" | "book" | "trades" | "ws", number>>;
  sourceUpdatedAt: number | null;
  sourceUpdatedAtIso: string | null;
  missingFields: string[];
  dataError: string | null;
  candleError: string | null;
  bookError: string | null;
  backendOi: OiHistoryResponse | null;
  requestFailed: boolean;
};

const ASSETS: ApiCoin[] = ["BTC", "ETH", "HYPE"];
const EMPTY_MARKET: MarketCtx = {
  price: null,
  prevPrice: null,
  midPx: null,
  fundingPct: null,
  premium: null,
  openInterestRaw: null,
  oiUsd: null,
  volume24hUsd: null,
  oraclePx: null,
};

function n(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyInitialAsset(): InitialAssetState {
  return {
    market: { ...EMPTY_MARKET },
    candles: [],
    book: null,
    trades: [],
    oiHistory: [],
    fundingHistory: [],
    freshness: {},
    sourceUpdatedAt: null,
    sourceUpdatedAtIso: null,
    missingFields: [],
    dataError: null,
    candleError: null,
    bookError: null,
    backendOi: null,
    requestFailed: false,
  };
}

function initialAssets() {
  return {
    BTC: emptyInitialAsset(),
    ETH: emptyInitialAsset(),
    HYPE: emptyInitialAsset(),
  } satisfies Record<ApiCoin, InitialAssetState>;
}

function requestOrigin() {
  const headerList = headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost || headerList.get("host") || process.env.VERCEL_URL || "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function fetchJson<T>(origin: string, path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${origin}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json" },
    });
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeCandles(payload: any): Candle[] {
  const rows = Array.isArray(payload?.candles) ? payload.candles : [];
  return rows
    .map((row: any) => {
      const close = n(row.c ?? row.close);
      const open = n(row.o ?? row.open) ?? close;
      const high = n(row.h ?? row.high) ?? close;
      const low = n(row.l ?? row.low) ?? close;
      const time = n(row.t ?? row.time);
      const volume = n(row.v ?? row.volume);
      if (time === null || close === null || open === null || high === null || low === null || volume === null) return null;
      return { time, open, high, low, close, volumeUsd: volume * close };
    })
    .filter((row: Candle | null): row is Candle => row !== null)
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-1500);
}

function normalizeBook(payload: any): Book | null {
  const bestBid = n(payload?.bestBid);
  const bestAsk = n(payload?.bestAsk);
  if (bestBid === null || bestAsk === null) return null;
  return {
    bids: [],
    asks: [],
    bestBid,
    bestAsk,
    spreadBps: n(payload?.spreadBps),
    depth10Bps: n(payload?.depth10bpsUsd),
    depth25Bps: n(payload?.depth25bpsUsd),
    depth50Bps: n(payload?.depth25bpsUsd),
  };
}

function applyMarkets(assets: Record<ApiCoin, InitialAssetState>, payload: any) {
  if (!payload?.ok || !Array.isArray(payload.assets)) {
    const error = payload?.error || "/api/hl/markets unavailable during server render";
    ASSETS.forEach((coin) => {
      assets[coin].dataError = error;
      assets[coin].requestFailed = true;
    });
    return;
  }

  payload.assets.forEach((row: any) => {
    if (!ASSETS.includes(row.apiCoin)) return;
    const coin = row.apiCoin as ApiCoin;
    const updatedAtIso = row.updatedAt || payload.updatedAt || null;
    const updatedAt = updatedAtIso ? Date.parse(updatedAtIso) : NaN;
    assets[coin] = {
      ...assets[coin],
      market: {
        price: n(row.markPx),
        prevPrice: n(row.prevDayPx),
        midPx: n(row.midPx),
        fundingPct: n(row.fundingPctHourly),
        premium: null,
        openInterestRaw: n(row.openInterestRaw),
        oiUsd: n(row.openInterestUsdComputed),
        volume24hUsd: n(row.dayNtlVlm),
        oraclePx: n(row.oraclePx),
      },
      freshness: {
        ...assets[coin].freshness,
        meta: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      },
      sourceUpdatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
      sourceUpdatedAtIso: updatedAtIso,
      missingFields: Array.isArray(row.missingFields) ? row.missingFields : [],
      dataError: null,
      requestFailed: false,
    };
  });
}

async function buildInitialAssets() {
  const origin = requestOrigin();
  const assets = initialAssets();

  const markets = await fetchJson<any>(origin, "/api/hl/markets");
  applyMarkets(assets, markets);

  await fetchJson(origin, "/api/cron/snapshot", { method: "POST", body: "{}" });

  const [candleRows, bookRows, oiRows] = await Promise.all([
    Promise.all(ASSETS.map(async (coin) => [coin, await fetchJson<any>(origin, `/api/hl/candles?coin=${coin}&interval=1m&hours=24`)] as const)),
    Promise.all(ASSETS.map(async (coin) => [coin, await fetchJson<any>(origin, `/api/hl/book?coin=${coin}`)] as const)),
    Promise.all(ASSETS.map(async (coin) => [coin, await fetchJson<OiHistoryResponse>(origin, `/api/hl/oi-history?asset=${coin}`)] as const)),
  ]);

  candleRows.forEach(([coin, payload]) => {
    if (payload?.ok) {
      const updatedAt = Date.parse(payload.updatedAt || "");
      assets[coin].candles = normalizeCandles(payload);
      assets[coin].freshness = {
        ...assets[coin].freshness,
        candles: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      };
      assets[coin].candleError = null;
    } else if (payload?.error) {
      assets[coin].candleError = payload.error;
    }
  });

  bookRows.forEach(([coin, payload]) => {
    if (payload?.ok) {
      const updatedAt = Date.parse(payload.updatedAt || "");
      assets[coin].book = normalizeBook(payload);
      assets[coin].freshness = {
        ...assets[coin].freshness,
        book: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      };
      assets[coin].bookError = null;
    } else if (payload?.error) {
      assets[coin].bookError = payload.error;
    }
  });

  oiRows.forEach(([coin, payload]) => {
    if (payload?.ok) {
      assets[coin].backendOi = payload;
      assets[coin].market = {
        ...assets[coin].market,
        oiUsd: n(payload.currentOiUsd) ?? assets[coin].market.oiUsd,
      };
    } else if (payload?.error) {
      assets[coin].backendOi = payload;
    }
  });

  return assets;
}

export default async function Page() {
  const seededAssets = await buildInitialAssets();
  return <HypurrScopeClient initialAssets={seededAssets} />;
}

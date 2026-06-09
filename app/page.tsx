"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type View = "overview" | "watchlist" | "flow" | "alerts" | "wallet";
type ConnectionState = "loading" | "live" | "stale" | "failed";
type SignalKind = "Fresh Long" | "Fresh Short" | "Crowded Long" | "Crowded Short";
type ChartMode = "price" | "oi" | "cvd" | "funding";
type ChartInterval = "1m" | "5m" | "15m" | "1h";
type AlertFilter = "All" | ApiCoin | "Enabled" | "Disabled";
type AlertDestination = "Browser" | "Telegram" | "Discord" | "Webhook";
type TriggerMode = "all" | "any";

type AssetConfig = {
  apiCoin: ApiCoin;
  displayName: string;
  shortName: string;
  bucket: string;
  thresholds: {
    largeTradeUsd: number;
    flow5mUsd: number;
    oi15mPct: number;
    oi4hPct: number;
    price15mPct: number;
    fundingPct: number;
    minDepthUsd: number;
  };
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeUsd: number;
};

type Trade = {
  id: string;
  time: number;
  side: "Buy" | "Sell";
  price: number;
  size: number;
  notionalUsd: number;
};

type BookLevel = {
  price: number;
  size: number;
  usd: number;
};

type Book = {
  bids: BookLevel[];
  asks: BookLevel[];
  bestBid: number;
  bestAsk: number;
  spreadBps: number | null;
  depth50Bps: number | null;
};

type MarketCtx = {
  price: number | null;
  prevPrice: number | null;
  fundingPct: number | null;
  oiUsd: number | null;
  volume24hUsd: number | null;
  oraclePx: number | null;
};

type OiPoint = {
  time: number;
  oiUsd: number;
};

type FundingPoint = {
  time: number;
  fundingPct: number;
};

type ChartPoint = {
  time: number;
  value: number;
};

type ChartDataset =
  | {
      kind: "candles";
      label: string;
      valueLabel: string;
      points: Candle[];
      min: number;
      max: number;
      latest: number | null;
      emptyReason: string;
    }
  | {
      kind: "line";
      label: string;
      valueLabel: string;
      points: ChartPoint[];
      min: number;
      max: number;
      latest: number | null;
      emptyReason: string;
    };

type LogicalRange = {
  from: number;
  to: number;
};

type ValueRange = {
  min: number;
  max: number;
};

type ChartDragState = {
  area: "plot" | "xAxis" | "yAxis";
  startX: number;
  startY: number;
  startRange: LogicalRange;
  startYRange: ValueRange;
};

type FreshnessMap = Partial<Record<"meta" | "candles" | "book" | "trades" | "ws", number>>;

type AssetState = {
  market: MarketCtx;
  candles: Candle[];
  book: Book | null;
  trades: Trade[];
  oiHistory: OiPoint[];
  fundingHistory: FundingPoint[];
  freshness: FreshnessMap;
  requestFailed: boolean;
};

type MetricBundle = {
  price15m: number | null;
  price1h: number | null;
  price24h: number | null;
  oi15m: number | null;
  oi1h: number | null;
  oi4h: number | null;
  takerBuy5m: number | null;
  takerSell5m: number | null;
  takerBuy15m: number | null;
  takerSell15m: number | null;
  netFlow5m: number | null;
  netFlow15m: number | null;
  buyRatio5m: number | null;
  sellRatio5m: number | null;
  cvd5m: number | null;
  cvd15m: number | null;
  cvd1h: number | null;
  relativeVolume5m: number | null;
  liquidityHealthy: boolean | null;
  spreadBps: number | null;
  depth50Bps: number | null;
  fundingAbsExtreme: boolean | null;
  fundingPct: number | null;
};

type SignalReadiness = {
  asset: ApiCoin;
  kind: SignalKind;
  score: number | null;
  active: boolean;
  passed: string[];
  missing: string[];
  explanation: string;
};

type FlowEvent = {
  id: string;
  time: number;
  asset: ApiCoin;
  event: string;
  side: "Buy" | "Sell" | "Mixed" | "-";
  size: string;
  context: string;
};

type AlertRule = {
  id: string;
  asset: ApiCoin;
  kind: string;
  alertType: "preset" | "custom" | "live";
  fingerprint: string;
  thresholds: Record<string, number | string>;
  triggerMode: TriggerMode;
  triggerCount: number;
  createdAt: number;
  enabled: boolean;
  destination: AlertDestination;
};

type CustomAlertDraft = {
  direction: SignalKind;
  price15mPct: number;
  oi15mPct: number;
  oi4hPct: number;
  fundingGreaterPct: number;
  fundingLowerPct: number;
  takerBuyRatioPct: number;
  takerSellRatioPct: number;
  netBuyFlow5mUsd: number;
  netSellFlow5mUsd: number;
  largeTradeUsd: number;
  spreadBps: number;
  depthUsd: number;
  triggerMode: TriggerMode;
  triggerCount: number;
  destination: AlertDestination;
};

const ASSETS: AssetConfig[] = [
  {
    apiCoin: "BTC",
    displayName: "BTC",
    shortName: "BTC",
    bucket: "Major",
    thresholds: {
      largeTradeUsd: 1_000_000,
      flow5mUsd: 10_000_000,
      oi15mPct: 0.8,
      oi4hPct: 3,
      price15mPct: 0.25,
      fundingPct: 0.006,
      minDepthUsd: 5_000_000,
    },
  },
  {
    apiCoin: "ETH",
    displayName: "ETH",
    shortName: "ETH",
    bucket: "Large cap",
    thresholds: {
      largeTradeUsd: 500_000,
      flow5mUsd: 6_000_000,
      oi15mPct: 1.25,
      oi4hPct: 4.5,
      price15mPct: 0.3,
      fundingPct: 0.008,
      minDepthUsd: 2_000_000,
    },
  },
  {
    apiCoin: "HYPE",
    displayName: "HYPE / high-beta",
    shortName: "HYPE",
    bucket: "High beta",
    thresholds: {
      largeTradeUsd: 100_000,
      flow5mUsd: 1_500_000,
      oi15mPct: 2.5,
      oi4hPct: 8,
      price15mPct: 0.6,
      fundingPct: 0.015,
      minDepthUsd: 350_000,
    },
  },
];

const ASSET_ORDER = ASSETS.map((asset) => asset.apiCoin);
const ASSET_BY_COIN = Object.fromEntries(ASSETS.map((asset) => [asset.apiCoin, asset])) as Record<ApiCoin, AssetConfig>;
const PRESET_KINDS: SignalKind[] = ["Fresh Long", "Fresh Short", "Crowded Long", "Crowded Short"];
const CHART_INTERVALS: Array<{ key: ChartInterval; label: string; ms: number }> = [
  { key: "1m", label: "1m", ms: 60_000 },
  { key: "5m", label: "5m", ms: 5 * 60_000 },
  { key: "15m", label: "15m", ms: 15 * 60_000 },
  { key: "1h", label: "1h", ms: 60 * 60_000 },
];
const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";
const EMPTY_MARKET: MarketCtx = {
  price: null,
  prevPrice: null,
  fundingPct: null,
  oiUsd: null,
  volume24hUsd: null,
  oraclePx: null,
};

function emptyAssetState(): AssetState {
  return {
    market: { ...EMPTY_MARKET },
    candles: [],
    book: null,
    trades: [],
    oiHistory: [],
    fundingHistory: [],
    freshness: {},
    requestFailed: false,
  };
}

function initialAssets(): Record<ApiCoin, AssetState> {
  return {
    BTC: emptyAssetState(),
    ETH: emptyAssetState(),
    HYPE: emptyAssetState(),
  };
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]) {
  const rows = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

function formatUsd(value: number | null, fallback = "Loading") {
  if (!Number.isFinite(value as number)) return fallback;
  const numberValue = value as number;
  const sign = numberValue < 0 ? "-" : "";
  const abs = Math.abs(numberValue);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(4)}`;
}

function formatPct(value: number | null, digits = 2, fallback = "Loading", signed = true) {
  if (!Number.isFinite(value as number)) return fallback;
  const numberValue = value as number;
  const sign = signed && numberValue > 0 ? "+" : "";
  return `${sign}${numberValue.toFixed(digits)}%`;
}

function formatFunding(value: number | null) {
  if (!Number.isFinite(value as number)) return "Loading";
  const numberValue = value as number;
  if (Math.abs(numberValue) < 0.0001) return numberValue < 0 ? "-<0.0001%" : "<0.0001%";
  return formatPct(numberValue, 4);
}

function directionClass(value: number | null) {
  if (!Number.isFinite(value as number)) return "";
  return (value as number) >= 0 ? "positive" : "negative";
}

function ageLabel(timestamp?: number) {
  if (!timestamp) return "Loading";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 90) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function freshnessState(timestamp?: number): ConnectionState {
  if (!timestamp) return "loading";
  const age = Date.now() - timestamp;
  if (age > 120_000) return "stale";
  return "live";
}

function Tooltip({ label, text }: { label: string; text: string }) {
  return <span className="radar-tip" title={text}>{label}</span>;
}

function Freshness({ timestamp }: { timestamp?: number }) {
  const state = freshnessState(timestamp);
  return <span className={`freshness ${state}`}>{state === "live" ? "Live" : state === "stale" ? "Stale" : "Loading"} {ageLabel(timestamp)}</span>;
}

async function postInfo(body: unknown) {
  const response = await fetch("/api/hyperliquid/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Hyperliquid info failed ${response.status}`);
  return response.json();
}

async function fetchMeta() {
  const response = await fetch("/api/hyperliquid/meta", { cache: "no-store" });
  if (!response.ok) throw new Error(`Meta failed ${response.status}`);
  return response.json();
}

async function fetchCandles(coin: ApiCoin) {
  const now = Date.now();
  const params = new URLSearchParams({
    coin,
    interval: "1m",
    startTime: String(now - 24 * 60 * 60 * 1000),
    endTime: String(now),
  });
  const response = await fetch(`/api/hyperliquid/candles?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Candles failed ${coin}`);
  return response.json();
}

function normalizeMeta(payload: unknown): Partial<Record<ApiCoin, MarketCtx>> {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as { universe?: Array<{ name: string }> };
  const contexts = tuple[1] as Array<Record<string, unknown>>;
  if (!Array.isArray(meta?.universe) || !Array.isArray(contexts)) return {};

  const result: Partial<Record<ApiCoin, MarketCtx>> = {};
  meta.universe.forEach((asset, index) => {
    if (!ASSET_ORDER.includes(asset.name as ApiCoin)) return;
    const ctx = contexts[index] || {};
    const price = n(ctx.markPx ?? ctx.midPx ?? ctx.oraclePx);
    const prevPrice = n(ctx.prevDayPx);
    const fundingRaw = n(ctx.funding);
    const openInterest = n(ctx.openInterest);
    result[asset.name as ApiCoin] = {
      price,
      prevPrice,
      fundingPct: fundingRaw === null ? null : fundingRaw * 100,
      oiUsd: openInterest !== null && price !== null ? openInterest * price : null,
      volume24hUsd: n(ctx.dayNtlVlm),
      oraclePx: n(ctx.oraclePx),
    };
  });
  return result;
}

function normalizeCandles(payload: unknown): Candle[] {
  const rows = Array.isArray((payload as any)?.candles)
    ? (payload as any).candles
    : Array.isArray(payload)
      ? payload
      : [];
  return rows
    .map((row: any) => {
      const close = n(row.c ?? row.close);
      const open = n(row.o ?? row.open) ?? close;
      const high = n(row.h ?? row.high) ?? close;
      const low = n(row.l ?? row.low) ?? close;
      const time = n(row.t ?? row.time);
      const volume = n(row.v ?? row.volume);
      if (time === null || close === null || open === null || high === null || low === null || volume === null) return null;
      return {
        time,
        open,
        high,
        low,
        close,
        volumeUsd: volume * close,
      } satisfies Candle;
    })
    .filter((row: Candle | null): row is Candle => row !== null)
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-1500) as Candle[];
}

function normalizeLevel(level: any): BookLevel | null {
  const price = n(level.px ?? level.price);
  const size = n(level.sz ?? level.size);
  if (price === null || size === null || price <= 0 || size <= 0) return null;
  return { price, size, usd: price * size };
}

function normalizeBook(payload: any): Book | null {
  const levels = payload?.levels || payload?.data?.levels;
  if (!Array.isArray(levels)) return null;
  const rawBids = Array.isArray(levels[0]) ? levels[0] : [];
  const rawAsks = Array.isArray(levels[1]) ? levels[1] : [];
  const bids: BookLevel[] = rawBids.map(normalizeLevel).filter((level: BookLevel | null): level is BookLevel => level !== null);
  const asks: BookLevel[] = rawAsks.map(normalizeLevel).filter((level: BookLevel | null): level is BookLevel => level !== null);
  if (!bids.length || !asks.length) return null;
  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const mid = (bestBid + bestAsk) / 2;
  const lower = mid * 0.995;
  const upper = mid * 1.005;
  const bidDepth = bids.filter((level) => level.price >= lower).reduce((sum, level) => sum + level.usd, 0);
  const askDepth = asks.filter((level) => level.price <= upper).reduce((sum, level) => sum + level.usd, 0);
  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    spreadBps: mid > 0 ? ((bestAsk - bestBid) / mid) * 10_000 : null,
    depth50Bps: bidDepth + askDepth,
  };
}

function normalizeTrade(row: any, index: number): Trade | null {
  const time = n(row.time ?? row.t);
  const price = n(row.px ?? row.price);
  const size = n(row.sz ?? row.size);
  if (time === null || price === null || size === null || price <= 0 || size <= 0) return null;
  const rawSide = String(row.side ?? row.dir ?? "");
  const side: "Buy" | "Sell" = rawSide === "B" || rawSide.toLowerCase().includes("buy") ? "Buy" : "Sell";
  return {
    id: String(row.hash ?? row.tid ?? row.id ?? `${time}-${index}`),
    time,
    side,
    price,
    size,
    notionalUsd: price * size,
  };
}

function normalizeFundingHistory(payload: unknown): FundingPoint[] {
  return (Array.isArray(payload) ? payload : [])
    .map((row: any) => {
      const time = n(row.time ?? row.t);
      const fundingRaw = n(row.fundingRate ?? row.funding);
      if (time === null || fundingRaw === null) return null;
      return { time, fundingPct: fundingRaw * 100 } satisfies FundingPoint;
    })
    .filter((row: FundingPoint | null): row is FundingPoint => row !== null)
    .sort((a: FundingPoint, b: FundingPoint) => a.time - b.time)
    .slice(-1000);
}

function mergeCandle(existing: Candle[], incoming: Candle) {
  const next = existing.filter((candle) => candle.time !== incoming.time).concat(incoming);
  return next.sort((a, b) => a.time - b.time).slice(-1500);
}

function appendTrades(existing: Trade[], incoming: Trade[]) {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const byId = new Map<string, Trade>();
  existing.concat(incoming).forEach((trade) => {
    if (trade.time >= cutoff) byId.set(trade.id, trade);
  });
  return Array.from(byId.values()).sort((a, b) => b.time - a.time).slice(0, 500);
}

function appendOi(existing: OiPoint[], oiUsd: number | null) {
  if (!Number.isFinite(oiUsd as number)) return existing;
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return existing.concat({ time: now, oiUsd: oiUsd as number }).filter((row) => row.time >= cutoff).slice(-400);
}

function appendFunding(existing: FundingPoint[], fundingPct: number | null) {
  if (!Number.isFinite(fundingPct as number)) return existing;
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return existing.concat({ time: now, fundingPct: fundingPct as number }).filter((row) => row.time >= cutoff).slice(-1000);
}

function priceChange(candles: Candle[], lookbackMs: number) {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const target = last.time - lookbackMs;
  const base = [...candles].reverse().find((candle) => candle.time <= target) || null;
  if (!base || base.close <= 0) return null;
  return ((last.close - base.close) / base.close) * 100;
}

function oiChange(history: OiPoint[], currentOi: number | null, lookbackMs: number) {
  if (!Number.isFinite(currentOi as number)) return null;
  const target = Date.now() - lookbackMs;
  const base = [...history].reverse().find((row) => row.time <= target) || null;
  if (!base || base.oiUsd <= 0) return null;
  return (((currentOi as number) - base.oiUsd) / base.oiUsd) * 100;
}

function windowTrades(trades: Trade[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  return trades.filter((trade) => trade.time >= cutoff);
}

function flowStats(trades: Trade[], windowMs: number) {
  const rows = windowTrades(trades, windowMs);
  if (!rows.length) return { buy: null, sell: null, net: null, buyRatio: null, sellRatio: null, cvd: null };
  const buy = rows.filter((trade) => trade.side === "Buy").reduce((sum, trade) => sum + trade.notionalUsd, 0);
  const sell = rows.filter((trade) => trade.side === "Sell").reduce((sum, trade) => sum + trade.notionalUsd, 0);
  const total = buy + sell;
  return {
    buy,
    sell,
    net: buy - sell,
    buyRatio: total > 0 ? (buy / total) * 100 : null,
    sellRatio: total > 0 ? (sell / total) * 100 : null,
    cvd: buy - sell,
  };
}

function relativeVolume5m(candles: Candle[]) {
  if (candles.length < 48) return null;
  const last = candles[candles.length - 1];
  const currentStart = last.time - 5 * 60_000;
  const current = candles.filter((candle) => candle.time >= currentStart).reduce((sum, candle) => sum + candle.volumeUsd, 0);
  const samples: number[] = [];
  for (let index = 0; index < candles.length; index += 5) {
    const bucket = candles.slice(index, index + 5);
    if (bucket.length === 5) samples.push(bucket.reduce((sum, candle) => sum + candle.volumeUsd, 0));
  }
  if (samples.length < 48) return null;
  const baseline = median(samples.slice(0, -1));
  if (!baseline || baseline <= 0) return null;
  return current / baseline;
}

function metricsFor(asset: AssetConfig, state: AssetState): MetricBundle {
  const five = flowStats(state.trades, 5 * 60_000);
  const fifteen = flowStats(state.trades, 15 * 60_000);
  const oneHour = flowStats(state.trades, 60 * 60_000);
  const spreadBps = state.book?.spreadBps ?? null;
  const depth50Bps = state.book?.depth50Bps ?? null;
  const liquidityHealthy =
    spreadBps === null || depth50Bps === null
      ? null
      : spreadBps <= 4 && depth50Bps >= asset.thresholds.minDepthUsd;
  const funding = state.market.fundingPct;
  return {
    price15m: priceChange(state.candles, 15 * 60_000),
    price1h: priceChange(state.candles, 60 * 60_000),
    price24h: state.market.price !== null && state.market.prevPrice ? ((state.market.price - state.market.prevPrice) / state.market.prevPrice) * 100 : null,
    oi15m: oiChange(state.oiHistory, state.market.oiUsd, 15 * 60_000),
    oi1h: oiChange(state.oiHistory, state.market.oiUsd, 60 * 60_000),
    oi4h: oiChange(state.oiHistory, state.market.oiUsd, 4 * 60 * 60_000),
    takerBuy5m: five.buy,
    takerSell5m: five.sell,
    takerBuy15m: fifteen.buy,
    takerSell15m: fifteen.sell,
    netFlow5m: five.net,
    netFlow15m: fifteen.net,
    buyRatio5m: five.buyRatio,
    sellRatio5m: five.sellRatio,
    cvd5m: five.cvd,
    cvd15m: fifteen.cvd,
    cvd1h: oneHour.cvd,
    relativeVolume5m: relativeVolume5m(state.candles),
    liquidityHealthy,
    spreadBps,
    depth50Bps,
    fundingAbsExtreme: funding === null ? null : Math.abs(funding) >= asset.thresholds.fundingPct * 2,
    fundingPct: funding,
  };
}

function componentScore(value: number, threshold: number, inverse = false) {
  if (!Number.isFinite(value) || threshold <= 0) return null;
  const ratio = inverse ? threshold / Math.max(threshold, value) : value / threshold;
  return clamp(ratio * 100, 0, 100);
}

function condition(ok: boolean | null, passLabel: string, missingLabel: string, passed: string[], missing: string[]) {
  if (ok === true) passed.push(passLabel);
  else missing.push(missingLabel);
}

function buildSignal(asset: AssetConfig, metrics: MetricBundle, kind: SignalKind): SignalReadiness {
  const passed: string[] = [];
  const missing: string[] = [];
  const t = asset.thresholds;
  const funding = metrics.fundingAbsExtreme;
  const liquidity = metrics.liquidityHealthy;
  let rawScores: number[] = [];

  if (kind === "Fresh Long") {
    const priceOk = metrics.price15m === null ? null : metrics.price15m > t.price15mPct;
    const oiOk = metrics.oi15m === null ? null : metrics.oi15m >= t.oi15mPct;
    const ratioOk = metrics.buyRatio5m === null ? null : metrics.buyRatio5m > 60;
    const flowOk = metrics.netFlow5m === null ? null : metrics.netFlow5m >= t.flow5mUsd;
    const fundingOk = funding === null ? null : !funding;
    condition(priceOk, "15m price confirms up", `price 15m > ${formatPct(t.price15mPct, 2, "", false)}`, passed, missing);
    condition(oiOk, "OI 15m expanding", `OI 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`, passed, missing);
    condition(ratioOk, "buyers dominate tape", "taker buy ratio > 60%", passed, missing);
    condition(flowOk, "aggressive buy flow threshold met", `net buy flow 5m >= ${formatUsd(t.flow5mUsd)}`, passed, missing);
    condition(liquidity, "liquidity healthy", "liquidity must be healthy", passed, missing);
    condition(fundingOk, "funding not extreme", "funding already extreme", passed, missing);
    if ([metrics.price15m, metrics.oi15m, metrics.buyRatio5m, metrics.netFlow5m].every((value) => value !== null) && liquidity !== null && funding !== null) {
      rawScores = [
        componentScore(Math.max(0, metrics.price15m as number), t.price15mPct) ?? 0,
        componentScore(metrics.oi15m as number, t.oi15mPct) ?? 0,
        componentScore(metrics.buyRatio5m as number, 60) ?? 0,
        componentScore(Math.max(0, metrics.netFlow5m as number), t.flow5mUsd) ?? 0,
        liquidity ? 100 : 0,
        funding ? 0 : 100,
      ];
    }
  }

  if (kind === "Fresh Short") {
    const priceOk = metrics.price15m === null ? null : metrics.price15m < -t.price15mPct;
    const oiOk = metrics.oi15m === null ? null : metrics.oi15m >= t.oi15mPct;
    const ratioOk = metrics.sellRatio5m === null ? null : metrics.sellRatio5m > 60;
    const flowOk = metrics.netFlow5m === null ? null : metrics.netFlow5m <= -t.flow5mUsd;
    const fundingOk = funding === null ? null : !funding;
    condition(priceOk, "15m price confirms down", `price 15m < -${formatPct(t.price15mPct, 2, "", false)}`, passed, missing);
    condition(oiOk, "OI 15m expanding", `OI 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`, passed, missing);
    condition(ratioOk, "sellers dominate tape", "taker sell ratio > 60%", passed, missing);
    condition(flowOk, "aggressive sell flow threshold met", `net sell flow 5m >= ${formatUsd(t.flow5mUsd)}`, passed, missing);
    condition(liquidity, "liquidity healthy", "liquidity must be healthy", passed, missing);
    condition(fundingOk, "funding not extreme", "funding already extreme", passed, missing);
    if ([metrics.price15m, metrics.oi15m, metrics.sellRatio5m, metrics.netFlow5m].every((value) => value !== null) && liquidity !== null && funding !== null) {
      rawScores = [
        componentScore(Math.abs(metrics.price15m as number), t.price15mPct) ?? 0,
        componentScore(metrics.oi15m as number, t.oi15mPct) ?? 0,
        componentScore(metrics.sellRatio5m as number, 60) ?? 0,
        componentScore(Math.abs(Math.min(0, metrics.netFlow5m as number)), t.flow5mUsd) ?? 0,
        liquidity ? 100 : 0,
        funding ? 0 : 100,
      ];
    }
  }

  if (kind === "Crowded Long") {
    const fundingOk = metrics.fundingPct === null ? null : metrics.fundingPct >= t.fundingPct;
    const oiOk = metrics.oi4h === null ? null : metrics.oi4h >= t.oi4hPct;
    const priceOk = metrics.price15m === null ? null : metrics.price15m <= t.price15mPct * 0.35;
    const positioningOk = metrics.buyRatio5m === null ? null : metrics.buyRatio5m >= 55 || (metrics.netFlow15m ?? 0) > 0;
    condition(fundingOk, "positive funding is stretched", `funding > ${formatFunding(t.fundingPct)}`, passed, missing);
    condition(oiOk, "OI 4h elevated", `OI 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`, passed, missing);
    condition(priceOk, "price momentum stalled", "price must stall or fade", passed, missing);
    condition(positioningOk, "long-side pressure visible", "long-side positioning not crowded yet", passed, missing);
    if ([metrics.oi4h, metrics.price15m, metrics.buyRatio5m, metrics.netFlow15m].every((value) => value !== null) && metrics.fundingAbsExtreme !== null) {
      rawScores = [
        fundingOk ? 100 : 0,
        componentScore(metrics.oi4h as number, t.oi4hPct) ?? 0,
        priceOk ? 100 : 0,
        positioningOk ? 100 : 0,
      ];
    }
  }

  if (kind === "Crowded Short") {
    const fundingOk = metrics.fundingPct === null ? null : metrics.fundingPct <= -t.fundingPct;
    const oiOk = metrics.oi4h === null ? null : metrics.oi4h >= t.oi4hPct;
    const priceOk = metrics.price15m === null ? null : metrics.price15m >= -t.price15mPct * 0.35;
    const positioningOk = metrics.sellRatio5m === null ? null : metrics.sellRatio5m >= 55 || (metrics.netFlow15m ?? 0) < 0;
    condition(fundingOk, "negative funding is stretched", `funding < -${formatPct(t.fundingPct, 4, "", false)}`, passed, missing);
    condition(oiOk, "OI 4h elevated", `OI 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`, passed, missing);
    condition(priceOk, "downside momentum stalled", "price must stall or bounce", passed, missing);
    condition(positioningOk, "short-side pressure visible", "short-side positioning not crowded yet", passed, missing);
    if ([metrics.oi4h, metrics.price15m, metrics.sellRatio5m, metrics.netFlow15m].every((value) => value !== null) && metrics.fundingAbsExtreme !== null) {
      rawScores = [
        fundingOk ? 100 : 0,
        componentScore(metrics.oi4h as number, t.oi4hPct) ?? 0,
        priceOk ? 100 : 0,
        positioningOk ? 100 : 0,
      ];
    }
  }

  const score = rawScores.length ? Math.round(rawScores.reduce((sum, value) => sum + value, 0) / rawScores.length) : null;
  const active = score !== null && missing.length === 0;
  return {
    asset: asset.apiCoin,
    kind,
    score,
    active,
    passed,
    missing,
    explanation: active ? `${asset.shortName} has an active ${kind.toLowerCase()} setup.` : missing[0] || "insufficient history",
  };
}

function allSignals(asset: AssetConfig, metrics: MetricBundle) {
  return PRESET_KINDS.map((kind) => buildSignal(asset, metrics, kind));
}

function bestSignal(signals: SignalReadiness[]) {
  const active = signals.filter((signal) => signal.active).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (active) return active;
  return [...signals].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0] || null;
}

function signalBadge(signal: SignalReadiness | null) {
  if (!signal) return "No active signal";
  if (signal.active) return signal.kind;
  return "No active signal";
}

function buildFlowEvents(asset: AssetConfig, state: AssetState, metrics: MetricBundle): FlowEvent[] {
  const events: FlowEvent[] = [];
  const recentTrades = windowTrades(state.trades, 60 * 60_000);
  recentTrades
    .filter((trade) => trade.notionalUsd >= asset.thresholds.largeTradeUsd)
    .slice(0, 15)
    .forEach((trade) => {
      events.push({
        id: `${asset.apiCoin}-large-${trade.id}`,
        time: trade.time,
        asset: asset.apiCoin,
        event: "Large trade",
        side: trade.side,
        size: formatUsd(trade.notionalUsd),
        context: `threshold ${formatUsd(asset.thresholds.largeTradeUsd)}`,
      });
    });

  if (metrics.netFlow5m !== null && Math.abs(metrics.netFlow5m) >= asset.thresholds.flow5mUsd) {
    events.push({
      id: `${asset.apiCoin}-burst-${Math.round(Date.now() / 60_000)}`,
      time: Date.now(),
      asset: asset.apiCoin,
      event: "Flow burst",
      side: metrics.netFlow5m >= 0 ? "Buy" : "Sell",
      size: formatUsd(Math.abs(metrics.netFlow5m)),
      context: `5m threshold ${formatUsd(asset.thresholds.flow5mUsd)}`,
    });
  }

  if (metrics.oi15m !== null && metrics.oi15m >= asset.thresholds.oi15mPct) {
    events.push({
      id: `${asset.apiCoin}-oi15-${Math.round(Date.now() / 60_000)}`,
      time: Date.now(),
      asset: asset.apiCoin,
      event: "OI spike",
      side: "-",
      size: formatPct(metrics.oi15m),
      context: `15m threshold ${formatPct(asset.thresholds.oi15mPct, 2, "", false)}`,
    });
  }

  if (asset.apiCoin === "HYPE") {
    const sameSide = recentTrades.slice(0, 12);
    const buyCount = sameSide.filter((trade) => trade.side === "Buy").length;
    const sellCount = sameSide.filter((trade) => trade.side === "Sell").length;
    const dominantSide = buyCount >= sellCount ? "Buy" : "Sell";
    const dominant = sameSide.filter((trade) => trade.side === dominantSide);
    const sizes = dominant.map((trade) => trade.notionalUsd);
    const mid = median(sizes);
    const similar = mid ? dominant.filter((trade) => Math.abs(trade.notionalUsd - mid) / mid < 0.35).length : 0;
    if (dominant.length >= 6 && similar >= 4) {
      events.push({
        id: `HYPE-twap-${Math.round(Date.now() / 60_000)}`,
        time: Date.now(),
        asset: "HYPE",
        event: "TWAP-like heuristic",
        side: dominantSide,
        size: formatUsd(dominant.reduce((sum, trade) => sum + trade.notionalUsd, 0)),
        context: "same-side repeated trades with similar sizes",
      });
    }
  }

  return events.sort((a, b) => b.time - a.time).slice(0, 25);
}

function marketState(signals: SignalReadiness[], metricsByAsset: Record<ApiCoin, MetricBundle>) {
  const active = signals.filter((signal) => signal.active);
  if (ASSET_ORDER.some((coin) => metricsByAsset[coin].liquidityHealthy === false)) return "Liquidity Thin";
  if (active.some((signal) => signal.kind === "Crowded Long")) return "Crowded Long";
  if (active.some((signal) => signal.kind === "Crowded Short")) return "Crowded Short";
  if (active.some((signal) => signal.kind === "Fresh Long")) return "Risk-on";
  return "Neutral";
}

function marketSentence(signal: SignalReadiness | null, state: string) {
  if (signal?.active) return `${signal.asset} is the cleanest active setup: ${signal.kind.toLowerCase()}.`;
  if (state === "Liquidity Thin") return "Liquidity is thin on at least one watched asset; avoid treating wicks as clean signals.";
  return "No active setup is confirmed; closest setups are shown so the feed stays useful.";
}

function intervalMs(interval: ChartInterval) {
  return CHART_INTERVALS.find((row) => row.key === interval)?.ms || 5 * 60_000;
}

function aggregateCandles(candles: Candle[], interval: ChartInterval) {
  const bucketSize = intervalMs(interval);
  if (interval === "1m") return candles.slice(-360);
  const buckets = new Map<number, Candle[]>();
  candles.forEach((candle: Candle) => {
    const bucketTime = Math.floor(candle.time / bucketSize) * bucketSize;
    const group = buckets.get(bucketTime) || [];
    group.push(candle);
    buckets.set(bucketTime, group);
  });
  return Array.from(buckets.entries())
    .map(([time, rows]) => ({
      time,
      open: rows[0].open,
      high: Math.max(...rows.map((row: Candle) => row.high)),
      low: Math.min(...rows.map((row: Candle) => row.low)),
      close: rows[rows.length - 1].close,
      volumeUsd: rows.reduce((sum: number, row: Candle) => sum + row.volumeUsd, 0),
    }))
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-360);
}

function bucketLine(points: ChartPoint[], interval: ChartInterval) {
  const bucketSize = intervalMs(interval);
  const buckets = new Map<number, ChartPoint>();
  points.forEach((point: ChartPoint) => {
    const bucketTime = Math.floor(point.time / bucketSize) * bucketSize;
    buckets.set(bucketTime, { time: bucketTime, value: point.value });
  });
  return Array.from(buckets.values()).sort((a: ChartPoint, b: ChartPoint) => a.time - b.time).slice(-360);
}

function cvdPoints(trades: Trade[], interval: ChartInterval) {
  let cumulative = 0;
  const rows = [...trades]
    .sort((a: Trade, b: Trade) => a.time - b.time)
    .map((trade: Trade) => {
      cumulative += trade.side === "Buy" ? trade.notionalUsd : -trade.notionalUsd;
      return { time: trade.time, value: cumulative };
    });
  return bucketLine(rows, interval);
}

function lineBounds(points: ChartPoint[]) {
  const values = points.map((point: ChartPoint) => point.value).filter(Number.isFinite);
  if (!values.length) return { min: 0, max: 1, latest: null };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.max(Math.abs(max), 1) * 0.002);
  return { min: min - span * 0.08, max: max + span * 0.08, latest: points[points.length - 1]?.value ?? null };
}

function buildChartDataset(state: AssetState, mode: ChartMode, interval: ChartInterval): ChartDataset {
  if (mode === "price") {
    const candles = aggregateCandles(state.candles, interval);
    const values = candles.flatMap((candle: Candle) => [candle.high, candle.low]).filter(Number.isFinite);
    if (values.length < 2) {
      return { kind: "candles", label: "Price", valueLabel: "USD", points: [], min: 0, max: 1, latest: null, emptyReason: "Loading price candle backfill..." };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, max * 0.001);
    return {
      kind: "candles",
      label: "Price candles",
      valueLabel: "USD",
      points: candles,
      min: min - span * 0.08,
      max: max + span * 0.08,
      latest: candles[candles.length - 1]?.close ?? null,
      emptyReason: "Loading price candle backfill...",
    };
  }

  if (mode === "oi") {
    const points = bucketLine(state.oiHistory.map((row: OiPoint) => ({ time: row.time, value: row.oiUsd })), interval);
    const bounds = lineBounds(points);
    return { kind: "line", label: "Open Interest", valueLabel: "USD", points, ...bounds, emptyReason: "OI needs two live snapshots before the line can be drawn." };
  }

  if (mode === "cvd") {
    const points = cvdPoints(state.trades, interval);
    const bounds = lineBounds(points);
    return { kind: "line", label: "CVD", valueLabel: "USD", points, ...bounds, emptyReason: "CVD starts when live trades arrive from Hyperliquid." };
  }

  const points = bucketLine(state.fundingHistory.map((row: FundingPoint) => ({ time: row.time, value: row.fundingPct })), interval);
  const bounds = lineBounds(points);
  return { kind: "line", label: "Hourly Funding", valueLabel: "PCT", points, ...bounds, emptyReason: "Funding history is loading from Hyperliquid." };
}

function formatChartValue(value: number, mode: ChartMode) {
  if (mode === "funding") return formatFunding(value);
  return formatUsd(value, "");
}

function formatChartTime(time: number, interval: ChartInterval) {
  const date = new Date(time);
  if (interval === "1h") {
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" });
  }
  return date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}

function TradingChart({ state, mode, interval }: { state: AssetState; mode: ChartMode; interval: ChartInterval }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [logicalRange, setLogicalRange] = useState<LogicalRange | null>(null);
  const [manualYRange, setManualYRange] = useState<ValueRange | null>(null);
  const [drag, setDrag] = useState<ChartDragState | null>(null);
  const dataset = useMemo(() => buildChartDataset(state, mode, interval), [state, mode, interval]);
  const points = dataset.points;

  useEffect(() => {
    setHoverIndex(null);
    setLogicalRange(null);
    setManualYRange(null);
    setDrag(null);
  }, [mode, interval]);

  const needsMore = points.length < 2;
  if (needsMore) {
    return (
      <div className="radar-chart trading-chart empty-chart">
        <div>
          <strong>{dataset.label}</strong>
          <span>{dataset.emptyReason}</span>
        </div>
      </div>
    );
  }

  const width = 940;
  const height = 360;
  const plot = { left: 48, right: 92, top: 24, bottom: 46 };
  const chartRight = width - plot.right;
  const chartBottom = height - plot.bottom;
  const plotWidth = chartRight - plot.left;
  const plotHeight = chartBottom - plot.top;
  const minWindow = Math.min(Math.max(points.length - 1, 1), 18);
  const maxWindow = Math.max(points.length - 1, 1);
  const defaultBars = Math.min(points.length, interval === "1m" ? 170 : interval === "5m" ? 190 : 220);

  function normalizeRange(range: LogicalRange): LogicalRange {
    if (points.length <= 2) return { from: 0, to: points.length - 1 };
    const width = clamp(range.to - range.from, minWindow, maxWindow);
    let from = range.from;
    let to = from + width;
    if (from < 0) {
      from = 0;
      to = width;
    }
    if (to > points.length - 1) {
      to = points.length - 1;
      from = to - width;
    }
    return { from, to };
  }

  function zoomRange(range: LogicalRange, anchor: number, factor: number): LogicalRange {
    const current = normalizeRange(range);
    const width = Math.max(current.to - current.from, 1);
    const nextWidth = clamp(width * factor, minWindow, maxWindow);
    const ratio = clamp((anchor - current.from) / width, 0, 1);
    return normalizeRange({
      from: anchor - nextWidth * ratio,
      to: anchor + nextWidth * (1 - ratio),
    });
  }

  const currentRange = normalizeRange(logicalRange || { from: Math.max(0, points.length - defaultBars), to: points.length - 1 });
  const fromIndex = clamp(Math.floor(currentRange.from), 0, points.length - 1);
  const toIndex = clamp(Math.ceil(currentRange.to), fromIndex + 1, points.length - 1);
  const visiblePoints = points.slice(fromIndex, toIndex + 1);
  const visibleValues = dataset.kind === "candles"
    ? (visiblePoints as Candle[]).flatMap((candle: Candle) => [candle.high, candle.low])
    : (visiblePoints as ChartPoint[]).map((point: ChartPoint) => point.value);
  const visibleMin = Math.min(...visibleValues);
  const visibleMax = Math.max(...visibleValues);
  const autoSpan = Math.max(visibleMax - visibleMin, Math.max(Math.abs(visibleMax), 1) * 0.001);
  const autoYRange = { min: visibleMin - autoSpan * 0.08, max: visibleMax + autoSpan * 0.08 };
  const yRange = manualYRange || autoYRange;
  const span = Math.max(yRange.max - yRange.min, Math.max(Math.abs(yRange.max), 1) * 0.001);
  const x = (index: number) => plot.left + ((index - currentRange.from) / Math.max(1, currentRange.to - currentRange.from)) * plotWidth;
  const y = (value: number) => plot.top + (1 - (value - yRange.min) / span) * plotHeight;
  const valueAtY = (svgY: number) => yRange.min + (1 - clamp((svgY - plot.top) / plotHeight, 0, 1)) * span;
  const yTicks = [yRange.max, yRange.min + span * 0.75, yRange.min + span * 0.5, yRange.min + span * 0.25, yRange.min];
  const tickIndexes = Array.from(new Set([
    fromIndex,
    Math.round(fromIndex + (toIndex - fromIndex) * 0.25),
    Math.round(fromIndex + (toIndex - fromIndex) * 0.5),
    Math.round(fromIndex + (toIndex - fromIndex) * 0.75),
    toIndex,
  ]));
  const activeIndex = clamp(hoverIndex ?? toIndex, fromIndex, toIndex);
  const active = points[activeIndex];
  const activeValue = active ? dataset.kind === "candles" ? (active as Candle).close : (active as ChartPoint).value : null;
  const latestLabel = dataset.latest === null ? "Loading" : formatChartValue(dataset.latest, mode);
  const linePoints = dataset.kind === "line"
    ? (visiblePoints as ChartPoint[]).map((point: ChartPoint, index: number) => `${x(fromIndex + index)},${y(point.value)}`).join(" ")
    : "";
  const candleWidth = dataset.kind === "candles" ? clamp((plotWidth / Math.max(1, visiblePoints.length)) * 0.64, 2, 12) : 0;

  function svgPoint(event: React.PointerEvent<SVGSVGElement> | React.WheelEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      svgX: ((event.clientX - rect.left) / rect.width) * width,
      svgY: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function areaFor(svgX: number, svgY: number): "plot" | "xAxis" | "yAxis" {
    if (svgX >= chartRight) return "yAxis";
    if (svgY >= chartBottom) return "xAxis";
    return "plot";
  }

  function setRangeFromDrag(nextRange: LogicalRange) {
    setLogicalRange(normalizeRange(nextRange));
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const { svgX, svgY } = svgPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      area: areaFor(svgX, svgY),
      startX: svgX,
      startY: svgY,
      startRange: currentRange,
      startYRange: yRange,
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const { svgX, svgY } = svgPoint(event);
    if (drag) {
      const deltaX = svgX - drag.startX;
      const deltaY = svgY - drag.startY;
      const rangeWidth = Math.max(drag.startRange.to - drag.startRange.from, 1);

      if (drag.area === "plot" || drag.area === "xAxis") {
        const deltaBars = -(deltaX / plotWidth) * rangeWidth;
        setRangeFromDrag({ from: drag.startRange.from + deltaBars, to: drag.startRange.to + deltaBars });
      }

      if (drag.area === "plot") {
        const yShift = (deltaY / plotHeight) * Math.max(drag.startYRange.max - drag.startYRange.min, 1);
        setManualYRange({ min: drag.startYRange.min + yShift, max: drag.startYRange.max + yShift });
      }

      if (drag.area === "yAxis") {
        const center = (drag.startYRange.max + drag.startYRange.min) / 2;
        const nextSpan = Math.max((drag.startYRange.max - drag.startYRange.min) * Math.exp(deltaY / 180), Math.abs(center) * 0.0001, 0.000001);
        setManualYRange({ min: center - nextSpan / 2, max: center + nextSpan / 2 });
      }
      return;
    }

    const rawIndex = Math.round(currentRange.from + ((svgX - plot.left) / plotWidth) * (currentRange.to - currentRange.from));
    setHoverIndex(clamp(rawIndex, fromIndex, toIndex));
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const { svgX, svgY } = svgPoint(event);
    const area = areaFor(svgX, svgY);
    const currentYRange = manualYRange || autoYRange;

    if (area === "yAxis") {
      const anchor = valueAtY(svgY);
      const factor = event.deltaY > 0 ? 1.14 : 0.88;
      setManualYRange({
        min: anchor - (anchor - currentYRange.min) * factor,
        max: anchor + (currentYRange.max - anchor) * factor,
      });
      return;
    }

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const deltaBars = (event.deltaX / plotWidth) * Math.max(currentRange.to - currentRange.from, 1);
      setLogicalRange(normalizeRange({ from: currentRange.from + deltaBars, to: currentRange.to + deltaBars }));
      return;
    }

    const anchor = currentRange.from + clamp((svgX - plot.left) / plotWidth, 0, 1) * (currentRange.to - currentRange.from);
    setLogicalRange(zoomRange(currentRange, anchor, event.deltaY > 0 ? 1.16 : 0.86));
  }

  function resetChart() {
    setLogicalRange(null);
    setManualYRange(null);
    setHoverIndex(null);
    setDrag(null);
  }

  return (
    <div className="radar-chart trading-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${dataset.label} chart`}
        onDoubleClick={resetChart}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={() => { if (!drag) setHoverIndex(null); }}
        onWheel={handleWheel}
      >
        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} className="chart-plot-bg" />
        <rect x={chartRight} y={plot.top} width={plot.right - 8} height={plotHeight} className="chart-axis-zone y-axis" />
        <rect x={plot.left} y={chartBottom} width={plotWidth} height={plot.bottom - 8} className="chart-axis-zone x-axis" />
        {yTicks.map((tick: number) => {
          const yPos = y(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={plot.left} x2={chartRight} y1={yPos} y2={yPos} className="chart-grid" />
              <text x={chartRight + 10} y={yPos + 4} className="axis-label">{formatChartValue(tick, mode)}</text>
            </g>
          );
        })}
        {tickIndexes.map((index: number) => {
          const point = points[index];
          const xPos = x(index);
          return (
            <g key={`x-${point.time}-${index}`}>
              <line x1={xPos} x2={xPos} y1={plot.top} y2={chartBottom} className="chart-grid vertical" />
              <text x={xPos} y={height - 14} textAnchor="middle" className="axis-label">{formatChartTime(point.time, interval)}</text>
            </g>
          );
        })}
        {dataset.kind === "candles" && (visiblePoints as Candle[]).map((candle: Candle, index: number) => {
          const up = candle.close >= candle.open;
          const xPos = x(fromIndex + index);
          const openY = y(candle.open);
          const closeY = y(candle.close);
          return (
            <g className={up ? "candle up" : "candle down"} key={`${candle.time}-${index}`}>
              <line x1={xPos} x2={xPos} y1={y(candle.high)} y2={y(candle.low)} />
              <rect x={xPos - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(2, Math.abs(closeY - openY))} rx="1.5" />
            </g>
          );
        })}
        {dataset.kind === "line" && <polyline className={`chart-line ${mode}`} points={linePoints} />}
        {active && activeValue !== null && (
          <g className="chart-crosshair">
            <line x1={x(activeIndex)} x2={x(activeIndex)} y1={plot.top} y2={chartBottom} />
            <line x1={plot.left} x2={chartRight} y1={y(activeValue)} y2={y(activeValue)} />
            <circle cx={x(activeIndex)} cy={y(activeValue)} r="4" />
          </g>
        )}
      </svg>
      <div className="chart-meta">
        <span>{dataset.label} / {interval} / {points.length} bars</span>
        <span>{active && activeValue !== null ? `${formatChartTime(active.time, interval)} - ${formatChartValue(activeValue, mode)}` : "Move over chart"}</span>
        <span>Latest {latestLabel}</span>
      </div>
    </div>
  );
}

function AssetMetricCard({ label, value, meta, title, timestamp }: { label: string; value: string; meta: string; title?: string; timestamp?: number }) {
  return (
    <article className="metric-card" title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
      <Freshness timestamp={timestamp} />
    </article>
  );
}

function AssetCard({
  asset,
  state,
  metrics,
  signal,
  onOpen,
  onAlert,
}: {
  asset: AssetConfig;
  state: AssetState;
  metrics: MetricBundle;
  signal: SignalReadiness | null;
  onOpen: () => void;
  onAlert: () => void;
}) {
  return (
    <article className="asset-card">
      <button className="asset-open" onClick={onOpen}>
        <div>
          <span>{asset.bucket}</span>
          <strong>{asset.displayName}</strong>
        </div>
        <em className={signal?.active ? "signal-active" : ""}>{signalBadge(signal)}</em>
      </button>
      <div className="asset-card-grid">
        <div><span>Price</span><strong>{formatUsd(state.market.price)}</strong></div>
        <div><span>15m</span><strong className={directionClass(metrics.price15m)}>{formatPct(metrics.price15m, 2, "Loading")}</strong></div>
        <div><span>1h</span><strong className={directionClass(metrics.price1h)}>{formatPct(metrics.price1h, 2, "Loading")}</strong></div>
        <div><span>OI 15m</span><strong>{formatPct(metrics.oi15m, 2, "insufficient history")}</strong></div>
        <div><span>OI 4h</span><strong>{formatPct(metrics.oi4h, 2, "insufficient history")}</strong></div>
        <div><span>Funding</span><strong>{formatFunding(state.market.fundingPct)}</strong></div>
        <div><span>Taker 5m</span><strong>{metrics.netFlow5m === null ? "Loading" : formatUsd(metrics.netFlow5m)}</strong></div>
        <div><span>Depth</span><strong>{formatUsd(metrics.depth50Bps, "Loading")}</strong></div>
      </div>
      <button className="text-action" onClick={onAlert}>Create alert</button>
    </article>
  );
}

function SignalTable({ signals, onAlert }: { signals: SignalReadiness[]; onAlert: (signal: SignalReadiness) => void }) {
  const rows = [...signals].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.score ?? -1) - (a.score ?? -1);
  }).slice(0, 8);
  if (!rows.length) {
    return (
      <div className="compact-empty">
        Closest setups need live price, OI and flow history.
        <small>BTC, ETH and HYPE will appear here once enough data is available.</small>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Asset</th><th>Setup type</th><th>Score</th><th>Missing condition</th><th>Action</th></tr>
        </thead>
        <tbody>
          {rows.map((signal) => (
            <tr key={`${signal.asset}-${signal.kind}`}>
              <td><strong>{signal.asset}</strong></td>
              <td>{signal.kind}</td>
              <td>{signal.score === null ? "insufficient history" : `${signal.score}%`}</td>
              <td>{signal.active ? "All conditions passed" : signal.missing.slice(0, 2).join(", ") || "No active signal"}</td>
              <td><button className="table-action" onClick={() => onAlert(signal)}>Create alert</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowEventsTable({ events }: { events: FlowEvent[] }) {
  if (!events.length) {
    return (
      <div className="compact-empty">
        No events above thresholds in the last 60m.
        <small>Large trades: BTC $1M, ETH $500K, HYPE $100K. Flow bursts: BTC $10M, ETH $6M, HYPE $1.5M.</small>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Time</th><th>Asset</th><th>Event</th><th>Side</th><th>Size</th><th>Context</th></tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{new Date(event.time).toLocaleTimeString()}</td>
              <td><strong>{event.asset}</strong></td>
              <td>{event.event}</td>
              <td className={event.side === "Buy" ? "positive" : event.side === "Sell" ? "negative" : ""}>{event.side}</td>
              <td>{event.size}</td>
              <td>{event.context}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReadinessCard({ signal }: { signal: SignalReadiness }) {
  return (
    <article className={signal.active ? "readiness-card active" : "readiness-card"}>
      <div className="readiness-head">
        <strong>{signal.kind}</strong>
        <span>{signal.score === null ? "No score" : `${signal.score}%`}</span>
      </div>
      <em>{signal.active ? "active" : "inactive"}</em>
      <div className="check-list">
        {signal.passed.map((item) => <span className="passed" key={item}>OK {item}</span>)}
        {signal.missing.map((item) => <span className="missing" key={item}>Missing {item}</span>)}
      </div>
    </article>
  );
}

function presetRules(asset: AssetConfig, kind: SignalKind) {
  const t = asset.thresholds;
  if (kind === "Fresh Long") {
    return [
      `Net buy flow 5m >= ${formatUsd(t.flow5mUsd)}`,
      "Taker buy ratio 5m > 60%",
      `OI change 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`,
      `Price change 15m > ${formatPct(t.price15mPct, 2, "", false)}`,
      "Liquidity healthy and funding not extreme",
    ];
  }
  if (kind === "Fresh Short") {
    return [
      `Net sell flow 5m >= ${formatUsd(t.flow5mUsd)}`,
      "Taker sell ratio 5m > 60%",
      `OI change 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`,
      `Price change 15m < -${formatPct(t.price15mPct, 2, "", false)}`,
      "Liquidity healthy and funding not extreme",
    ];
  }
  if (kind === "Crowded Long") {
    return [
      `Hourly funding > +${formatPct(t.fundingPct, 3, "", false)}`,
      `OI change 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`,
      "Price momentum is stalling",
      "Long-side taker pressure visible",
    ];
  }
  return [
    `Hourly funding < -${formatPct(t.fundingPct, 3, "", false)}`,
    `OI change 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`,
    "Downside momentum is stalling",
    "Short-side taker pressure visible",
  ];
}

function presetThresholds(asset: AssetConfig, kind: SignalKind): Record<string, number | string> {
  const t = asset.thresholds;
  if (kind === "Fresh Long") {
    return {
      netBuyFlow5mUsd: t.flow5mUsd,
      takerBuyRatioPct: 60,
      oi15mPct: t.oi15mPct,
      price15mPct: t.price15mPct,
      liquidity: "healthy",
      funding: "not extreme",
    };
  }
  if (kind === "Fresh Short") {
    return {
      netSellFlow5mUsd: t.flow5mUsd,
      takerSellRatioPct: 60,
      oi15mPct: t.oi15mPct,
      price15mPct: -t.price15mPct,
      liquidity: "healthy",
      funding: "not extreme",
    };
  }
  if (kind === "Crowded Long") {
    return {
      fundingGreaterPct: t.fundingPct,
      oi4hPct: t.oi4hPct,
      momentum: "stalling",
      takerPressure: "long-side visible",
    };
  }
  return {
    fundingLowerPct: -t.fundingPct,
    oi4hPct: t.oi4hPct,
    momentum: "downside stalling",
    takerPressure: "short-side visible",
  };
}

function defaultCustomDraft(asset: AssetConfig): CustomAlertDraft {
  return {
    direction: "Fresh Long",
    price15mPct: asset.thresholds.price15mPct,
    oi15mPct: asset.thresholds.oi15mPct,
    oi4hPct: asset.thresholds.oi4hPct,
    fundingGreaterPct: asset.thresholds.fundingPct,
    fundingLowerPct: -asset.thresholds.fundingPct,
    takerBuyRatioPct: 60,
    takerSellRatioPct: 60,
    netBuyFlow5mUsd: asset.thresholds.flow5mUsd,
    netSellFlow5mUsd: asset.thresholds.flow5mUsd,
    largeTradeUsd: asset.thresholds.largeTradeUsd,
    spreadBps: 4,
    depthUsd: asset.thresholds.minDepthUsd,
    triggerMode: "all",
    triggerCount: 4,
    destination: "Browser",
  };
}

function customThresholds(draft: CustomAlertDraft): Record<string, number | string> {
  return {
    direction: draft.direction,
    price15mPct: draft.price15mPct,
    oi15mPct: draft.oi15mPct,
    oi4hPct: draft.oi4hPct,
    fundingGreaterPct: draft.fundingGreaterPct,
    fundingLowerPct: draft.fundingLowerPct,
    takerBuyRatioPct: draft.takerBuyRatioPct,
    takerSellRatioPct: draft.takerSellRatioPct,
    netBuyFlow5mUsd: draft.netBuyFlow5mUsd,
    netSellFlow5mUsd: draft.netSellFlow5mUsd,
    largeTradeUsd: draft.largeTradeUsd,
    spreadBps: draft.spreadBps,
    depthUsd: draft.depthUsd,
  };
}

function alertFingerprint(
  asset: ApiCoin,
  kind: string,
  thresholds: Record<string, number | string>,
  destination: AlertDestination,
  triggerMode: TriggerMode,
  triggerCount: number,
) {
  const thresholdKey = Object.keys(thresholds)
    .sort()
    .map((key) => `${key}:${thresholds[key]}`)
    .join("|");
  return `${asset}|${kind}|${destination}|${triggerMode}|${triggerCount}|${thresholdKey}`;
}

function AlertPresetGrid({
  asset,
  alerts,
  onCreate,
}: {
  asset: AssetConfig;
  alerts: AlertRule[];
  onCreate: (asset: AssetConfig, kind: SignalKind) => void;
}) {
  return (
    <div className="preset-grid">
      {PRESET_KINDS.map((kind) => {
        const thresholds = presetThresholds(asset, kind);
        const fingerprint = alertFingerprint(asset.apiCoin, kind, thresholds, "Browser", "all", Object.keys(thresholds).length);
        const alreadyCreated = alerts.some((alert: AlertRule) => alert.fingerprint === fingerprint);
        return (
          <article className="preset-card" key={kind}>
            <header>
              <div>
                <span>{asset.shortName} preset</span>
                <strong>{kind}</strong>
              </div>
              <em>Template</em>
            </header>
            <ul>
              {presetRules(asset, kind).map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <small>
              Calibration: large trade {formatUsd(asset.thresholds.largeTradeUsd)} / flow 5m {formatUsd(asset.thresholds.flow5mUsd)}
            </small>
            <button className="table-action" disabled={alreadyCreated} onClick={() => onCreate(asset, kind)}>
              {alreadyCreated ? "Already created" : "Create preset alert"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="builder-field">
      <span>{label}</span>
      <div>
        {prefix ? <em>{prefix}</em> : null}
        <input type="number" value={value} step="any" onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function CustomAlertBuilder({
  asset,
  draft,
  duplicate,
  onChange,
  onCreate,
}: {
  asset: AssetConfig;
  draft: CustomAlertDraft;
  duplicate: boolean;
  onChange: (draft: CustomAlertDraft) => void;
  onCreate: () => void;
}) {
  const conditionCount = Object.keys(customThresholds(draft)).length;
  return (
    <div className="custom-builder">
      <div className="builder-field">
        <span>Asset</span>
        <select value={asset.apiCoin} disabled>
          <option>{asset.shortName}</option>
        </select>
      </div>
      <label className="builder-field">
        <span>Setup direction</span>
        <select value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value as SignalKind })}>
          {PRESET_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
      </label>
      <NumberField label="Price 15m threshold" value={draft.price15mPct} suffix="%" onChange={(value) => onChange({ ...draft, price15mPct: value })} />
      <NumberField label="OI 15m threshold" value={draft.oi15mPct} suffix="%" onChange={(value) => onChange({ ...draft, oi15mPct: value })} />
      <NumberField label="OI 4h threshold" value={draft.oi4hPct} suffix="%" onChange={(value) => onChange({ ...draft, oi4hPct: value })} />
      <NumberField label="Funding greater than" value={draft.fundingGreaterPct} suffix="%" onChange={(value) => onChange({ ...draft, fundingGreaterPct: value })} />
      <NumberField label="Funding lower than" value={draft.fundingLowerPct} suffix="%" onChange={(value) => onChange({ ...draft, fundingLowerPct: value })} />
      <NumberField label="Taker buy ratio" value={draft.takerBuyRatioPct} suffix="%" onChange={(value) => onChange({ ...draft, takerBuyRatioPct: value })} />
      <NumberField label="Taker sell ratio" value={draft.takerSellRatioPct} suffix="%" onChange={(value) => onChange({ ...draft, takerSellRatioPct: value })} />
      <NumberField label="Net buy flow 5m" value={draft.netBuyFlow5mUsd} prefix="$" onChange={(value) => onChange({ ...draft, netBuyFlow5mUsd: value })} />
      <NumberField label="Net sell flow 5m" value={draft.netSellFlow5mUsd} prefix="$" onChange={(value) => onChange({ ...draft, netSellFlow5mUsd: value })} />
      <NumberField label="Large trade threshold" value={draft.largeTradeUsd} prefix="$" onChange={(value) => onChange({ ...draft, largeTradeUsd: value })} />
      <NumberField label="Spread threshold" value={draft.spreadBps} suffix="bps" onChange={(value) => onChange({ ...draft, spreadBps: value })} />
      <NumberField label="Depth threshold" value={draft.depthUsd} prefix="$" onChange={(value) => onChange({ ...draft, depthUsd: value })} />
      <label className="builder-field">
        <span>Trigger logic</span>
        <select value={draft.triggerMode} onChange={(event) => onChange({ ...draft, triggerMode: event.target.value as TriggerMode })}>
          <option value="all">All conditions</option>
          <option value="any">Any N conditions</option>
        </select>
      </label>
      <NumberField label="N conditions" value={draft.triggerCount} onChange={(value) => onChange({ ...draft, triggerCount: clamp(Math.round(value), 1, conditionCount) })} />
      <label className="builder-field">
        <span>Destination</span>
        <select value={draft.destination} onChange={(event) => onChange({ ...draft, destination: event.target.value as AlertDestination })}>
          <option value="Browser">Browser</option>
        </select>
      </label>
      <div className="builder-submit">
        <span>{duplicate ? "Already created" : `${asset.shortName} custom alert ready`}</span>
        <button className="primary-action" disabled={duplicate} onClick={onCreate}>{duplicate ? "Already created" : "Create custom alert"}</button>
      </div>
    </div>
  );
}

function MyAlertsTable({
  alerts,
  filter,
  onFilter,
  onToggle,
}: {
  alerts: AlertRule[];
  filter: AlertFilter;
  onFilter: (filter: AlertFilter) => void;
  onToggle: (id: string) => void;
}) {
  const filters: AlertFilter[] = ["All", "BTC", "ETH", "HYPE", "Enabled", "Disabled"];
  const rows = alerts.filter((alert: AlertRule) => {
    if (filter === "All") return true;
    if (filter === "Enabled") return alert.enabled;
    if (filter === "Disabled") return !alert.enabled;
    return alert.asset === filter;
  });
  return (
    <>
      <div className="alert-filter-row">
        {filters.map((item) => (
          <button className={filter === item ? "active" : ""} key={item} onClick={() => onFilter(item)}>{item}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Setup</th><th>Type</th><th>Logic</th><th>Destination</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((alert) => (
              <tr key={alert.id}>
                <td><strong>{alert.asset}</strong></td>
                <td>{alert.kind}</td>
                <td>{alert.alertType}</td>
                <td>{alert.triggerMode === "all" ? "All conditions" : `Any ${alert.triggerCount}`}</td>
                <td>{alert.destination}</td>
                <td>{alert.enabled ? "Enabled" : "Disabled"}</td>
                <td>{new Date(alert.createdAt).toLocaleString()}</td>
                <td><button className="table-action muted-action" onClick={() => onToggle(alert.id)}>{alert.enabled ? "Disable" : "Enable"}</button></td>
              </tr>
            )) : <tr><td colSpan={8}>No alerts match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Page() {
  const wsRef = useRef<WebSocket | null>(null);
  const [assets, setAssets] = useState<Record<ApiCoin, AssetState>>(initialAssets);
  const [selected, setSelected] = useState<ApiCoin>("HYPE");
  const [view, setView] = useState<View>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const [chartInterval, setChartInterval] = useState<ChartInterval>("5m");
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [backfillReady, setBackfillReady] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("All");
  const [customDraft, setCustomDraft] = useState<CustomAlertDraft>(() => defaultCustomDraft(ASSET_BY_COIN.HYPE));
  const [wallet, setWallet] = useState("");

  const patchAsset = (coin: ApiCoin, updater: (state: AssetState) => AssetState) => {
    setAssets((current) => ({ ...current, [coin]: updater(current[coin]) }));
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBackfill() {
      setConnection("loading");
      try {
        const requestTime = Date.now();
        const [metaPayload, candlePayloads, bookPayloads, fundingPayloads] = await Promise.all([
          fetchMeta(),
          Promise.all(ASSETS.map((asset) => fetchCandles(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const))),
          Promise.all(ASSETS.map((asset) => postInfo({ type: "l2Book", coin: asset.apiCoin, nSigFigs: 5 }).then((payload) => [asset.apiCoin, payload] as const))),
          Promise.all(ASSETS.map((asset) => postInfo({ type: "fundingHistory", coin: asset.apiCoin, startTime: requestTime - 24 * 60 * 60 * 1000, endTime: requestTime }).then((payload) => [asset.apiCoin, payload] as const).catch(() => [asset.apiCoin, []] as const))),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const meta = normalizeMeta(metaPayload);
        const next = initialAssets();
        ASSETS.forEach((asset) => {
          const market = meta[asset.apiCoin] || { ...EMPTY_MARKET };
          const candles = normalizeCandles(candlePayloads.find(([coin]) => coin === asset.apiCoin)?.[1]);
          const book = normalizeBook(bookPayloads.find(([coin]) => coin === asset.apiCoin)?.[1]);
          const fundingHistory = appendFunding(normalizeFundingHistory(fundingPayloads.find(([coin]) => coin === asset.apiCoin)?.[1]), market.fundingPct);
          next[asset.apiCoin] = {
            market,
            candles,
            book,
            trades: [],
            oiHistory: appendOi([], market.oiUsd),
            fundingHistory,
            freshness: {
              meta: market.price !== null ? now : undefined,
              candles: candles.length ? now : undefined,
              book: book ? now : undefined,
            },
            requestFailed: false,
          };
        });
        setAssets(next);
        setLastUpdate(now);
        setConnection("live");
        setBackfillReady(true);
      } catch {
        if (!cancelled) {
          setConnection("failed");
          setAssets((current) => {
            const next = { ...current };
            ASSET_ORDER.forEach((coin) => { next[coin] = { ...next[coin], requestFailed: true }; });
            return next;
          });
        }
      }
    }

    loadBackfill();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!backfillReady) return;
    const ws = new WebSocket(HYPERLIQUID_WS_URL);
    wsRef.current = ws;

    const send = (subscription: Record<string, unknown>) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "subscribe", subscription }));
    };

    ws.onopen = () => {
      setConnection("live");
      send({ type: "allMids" });
      ASSETS.forEach((asset) => {
        send({ type: "candle", coin: asset.apiCoin, interval: "1m" });
        send({ type: "trades", coin: asset.apiCoin });
        send({ type: "l2Book", coin: asset.apiCoin });
        send({ type: "activeAssetCtx", coin: asset.apiCoin });
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const channel = String(message.channel || "");
        const data = message.data;
        const now = Date.now();
        setLastUpdate(now);

        if (channel === "allMids" && data?.mids) {
          setAssets((current) => {
            const next = { ...current };
            ASSET_ORDER.forEach((coin) => {
              const price = n(data.mids[coin]);
              if (price !== null) {
                next[coin] = {
                  ...next[coin],
                  market: { ...next[coin].market, price },
                  freshness: { ...next[coin].freshness, meta: now, ws: now },
                };
              }
            });
            return next;
          });
        }

        if (channel === "candle") {
          const coin = data?.s || data?.coin;
          if (ASSET_ORDER.includes(coin)) {
            const candle = normalizeCandles([data]).slice(-1)[0];
            if (candle) patchAsset(coin, (state) => ({
              ...state,
              candles: mergeCandle(state.candles, candle),
              freshness: { ...state.freshness, candles: now, ws: now },
            }));
          }
        }

        if (channel === "trades") {
          const rawRows = Array.isArray(data) ? data : [];
          const coin = rawRows[0]?.coin || rawRows[0]?.s || message?.subscription?.coin;
          if (ASSET_ORDER.includes(coin)) {
            const trades = rawRows.map(normalizeTrade).filter((trade: Trade | null): trade is Trade => trade !== null);
            patchAsset(coin, (state) => ({
              ...state,
              trades: appendTrades(state.trades, trades),
              freshness: { ...state.freshness, trades: now, ws: now },
            }));
          }
        }

        if (channel === "l2Book") {
          const coin = data?.coin;
          if (ASSET_ORDER.includes(coin)) {
            const book = normalizeBook(data);
            if (book) patchAsset(coin, (state) => ({
              ...state,
              book,
              freshness: { ...state.freshness, book: now, ws: now },
            }));
          }
        }

        if (channel === "activeAssetCtx") {
          const coin = data?.coin || data?.ctx?.coin;
          const ctx = data?.ctx || data;
          if (ASSET_ORDER.includes(coin)) {
            const price = n(ctx.markPx ?? ctx.midPx ?? ctx.oraclePx);
            const fundingRaw = n(ctx.funding);
            const openInterest = n(ctx.openInterest);
            const oiUsd = openInterest !== null && price !== null ? openInterest * price : null;
            patchAsset(coin, (state) => ({
              ...state,
              market: {
                ...state.market,
                price: price ?? state.market.price,
                fundingPct: fundingRaw === null ? state.market.fundingPct : fundingRaw * 100,
                oiUsd: oiUsd ?? state.market.oiUsd,
                volume24hUsd: n(ctx.dayNtlVlm) ?? state.market.volume24hUsd,
                oraclePx: n(ctx.oraclePx) ?? state.market.oraclePx,
              },
              oiHistory: appendOi(state.oiHistory, oiUsd ?? state.market.oiUsd),
              fundingHistory: appendFunding(state.fundingHistory, fundingRaw === null ? state.market.fundingPct : fundingRaw * 100),
              freshness: { ...state.freshness, meta: now, ws: now },
            }));
          }
        }
      } catch {
        return;
      }
    };

    ws.onerror = () => setConnection("stale");
    ws.onclose = () => setConnection((current) => current === "failed" ? "failed" : "stale");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [backfillReady]);

  const metricsByAsset = useMemo(() => {
    return Object.fromEntries(ASSETS.map((asset) => [asset.apiCoin, metricsFor(asset, assets[asset.apiCoin])])) as Record<ApiCoin, MetricBundle>;
  }, [assets]);

  const signals = useMemo(() => {
    return ASSETS.flatMap((asset) => allSignals(asset, metricsByAsset[asset.apiCoin]));
  }, [metricsByAsset]);

  const activeSignals = signals.filter((signal) => signal.active);
  const best = bestSignal(signals);
  const state = marketState(signals, metricsByAsset);
  const selectedAsset = ASSET_BY_COIN[selected];
  const selectedState = assets[selected];
  const selectedMetrics = metricsByAsset[selected];
  const selectedSignals = allSignals(selectedAsset, selectedMetrics);
  const selectedBest = bestSignal(selectedSignals);
  const scoredSignals = signals.filter((signal: SignalReadiness) => signal.score !== null);
  const customFingerprint = alertFingerprint(
    selected,
    `Custom ${customDraft.direction}`,
    customThresholds(customDraft),
    customDraft.destination,
    customDraft.triggerMode,
    customDraft.triggerCount,
  );
  const customDuplicate = alerts.some((alert: AlertRule) => alert.fingerprint === customFingerprint);
  const flowEvents = ASSETS.flatMap((asset) => buildFlowEvents(asset, assets[asset.apiCoin], metricsByAsset[asset.apiCoin]))
    .sort((a, b) => b.time - a.time)
    .slice(0, 40);

  useEffect(() => {
    setCustomDraft(defaultCustomDraft(selectedAsset));
  }, [selectedAsset]);

  function saveAlert(rule: AlertRule) {
    setAlerts((current) => {
      if (current.some((alert: AlertRule) => alert.fingerprint === rule.fingerprint)) return current;
      return [rule].concat(current).slice(0, 60);
    });
    setView("alerts");
  }

  function createAlert(signal: SignalReadiness) {
    const asset = ASSET_BY_COIN[signal.asset];
    const thresholds = presetThresholds(asset, signal.kind);
    const triggerCount = Object.keys(thresholds).length;
    const rule: AlertRule = {
      id: `alert-${signal.asset}-${signal.kind}-${Date.now()}`,
      asset: signal.asset,
      kind: signal.kind,
      alertType: "live",
      fingerprint: alertFingerprint(signal.asset, signal.kind, thresholds, "Browser", "all", triggerCount),
      thresholds,
      triggerMode: "all",
      triggerCount,
      createdAt: Date.now(),
      enabled: true,
      destination: "Browser",
    };
    setSelected(signal.asset);
    saveAlert(rule);
  }

  function createPresetAlert(asset: AssetConfig, kind: SignalKind) {
    const thresholds = presetThresholds(asset, kind);
    const triggerCount = Object.keys(thresholds).length;
    saveAlert({
      id: `preset-${asset.apiCoin}-${kind}-${Date.now()}`,
      asset: asset.apiCoin,
      kind,
      alertType: "preset",
      fingerprint: alertFingerprint(asset.apiCoin, kind, thresholds, "Browser", "all", triggerCount),
      thresholds,
      triggerMode: "all",
      triggerCount,
      createdAt: Date.now(),
      enabled: true,
      destination: "Browser",
    });
  }

  function createCustomAlert() {
    saveAlert({
      id: `custom-${selected}-${Date.now()}`,
      asset: selected,
      kind: `Custom ${customDraft.direction}`,
      alertType: "custom",
      fingerprint: customFingerprint,
      thresholds: customThresholds(customDraft),
      triggerMode: customDraft.triggerMode,
      triggerCount: customDraft.triggerCount,
      createdAt: Date.now(),
      enabled: true,
      destination: customDraft.destination,
    });
  }

  function toggleAlert(id: string) {
    setAlerts((current) => current.map((alert: AlertRule) => alert.id === id ? { ...alert, enabled: !alert.enabled } : alert));
  }

  const connectionLabel =
    connection === "failed" ? "API request failed" :
    connection === "loading" ? "Loading" :
    connection === "stale" ? "Stale" :
    "Live";

  return (
    <main className="risk-shell">
      <aside className="risk-rail">
        <div className="risk-brand">
          <span>HS</span>
          <div>
            <strong>HypurrScope</strong>
            <small>BTC / ETH / HYPE Risk Radar</small>
          </div>
        </div>
        <nav>
          {[
            ["overview", "Overview"],
            ["watchlist", "Watchlist"],
            ["flow", "Recent Flow"],
            ["alerts", "Alerts"],
            ["wallet", "Wallet Scanner"],
          ].map(([key, label]) => (
            <button className={view === key ? "active" : ""} key={key} onClick={() => setView(key as View)}>{label}</button>
          ))}
        </nav>
        <div className="risk-rail-foot">
          <span className={`connection ${connection}`}>{connectionLabel}</span>
          <small>Last update {ageLabel(lastUpdate)}</small>
        </div>
      </aside>

      <section className="risk-page">
        <header className="risk-topbar">
          <div className="asset-switcher">
            {ASSETS.map((asset) => (
              <button className={selected === asset.apiCoin ? "active" : ""} key={asset.apiCoin} onClick={() => { setSelected(asset.apiCoin); setView((current) => current === "overview" ? "watchlist" : current); }}>
                {asset.shortName}
              </button>
            ))}
          </div>
          <span className={`connection ${connection}`}>{connectionLabel}</span>
          <button className="primary-action" onClick={() => best && createAlert(best)}>Create alert</button>
        </header>

        {view === "overview" && (
          <>
            <section className="risk-summary">
              <article>
                <span>Market State</span>
                <strong>{state}</strong>
                <small>{marketSentence(best, state)}</small>
              </article>
              <article>
                <span>Best setup now</span>
                <strong>{best?.active ? best.asset : "None"}</strong>
                <small>{best ? `${best.kind} ${best.score === null ? "needs history" : `${best.score}%`}` : "No active signal"}</small>
              </article>
              <article>
                <span>Status</span>
                <strong>{connectionLabel}</strong>
                <small>Last update {ageLabel(lastUpdate)}</small>
              </article>
            </section>

            <section className="asset-grid">
              {ASSETS.map((asset) => {
                const assetSignals = allSignals(asset, metricsByAsset[asset.apiCoin]);
                return (
                  <AssetCard
                    asset={asset}
                    state={assets[asset.apiCoin]}
                    metrics={metricsByAsset[asset.apiCoin]}
                    signal={bestSignal(assetSignals)}
                    key={asset.apiCoin}
                    onOpen={() => { setSelected(asset.apiCoin); setView("watchlist"); }}
                    onAlert={() => createAlert(bestSignal(assetSignals) || assetSignals[0])}
                  />
                );
              })}
            </section>

            <section className="two-panels">
              <Panel title="Closest setups" right={activeSignals.length ? `${activeSignals.length} active` : "No active signal"}>
                <SignalTable signals={scoredSignals} onAlert={createAlert} />
              </Panel>
              <Panel title="Recent Flow Events" right="last 60m">
                <FlowEventsTable events={flowEvents} />
              </Panel>
            </section>
          </>
        )}

        {view === "watchlist" && (
          <>
            <section className="asset-header">
              <div>
                <span>{selectedAsset.bucket}</span>
                <h1>{selectedAsset.displayName}</h1>
                <p>{selectedBest?.explanation || "No active signal. Closest setup is shown below."}</p>
              </div>
              <div>
                <strong>{formatUsd(selectedState.market.price)}</strong>
                <em className={selectedBest?.active ? "signal-active" : ""}>{signalBadge(selectedBest)}</em>
              </div>
            </section>

            <section className="metric-grid">
              <AssetMetricCard label="Price" value={formatUsd(selectedState.market.price)} meta={`15m ${formatPct(selectedMetrics.price15m)} / 1h ${formatPct(selectedMetrics.price1h)}`} timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="24h volume" value={formatUsd(selectedState.market.volume24hUsd)} meta={`RVOL 5m ${selectedMetrics.relativeVolume5m === null ? "insufficient history" : `${selectedMetrics.relativeVolume5m.toFixed(2)}x`}`} timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Open Interest" value={formatUsd(selectedState.market.oiUsd)} meta={`15m ${formatPct(selectedMetrics.oi15m, 2, "insufficient history")} / 4h ${formatPct(selectedMetrics.oi4h, 2, "insufficient history")}`} title="Open interest is the current notional value of open perp positions." timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Funding" value={formatFunding(selectedState.market.fundingPct)} meta="hourly funding displayed as percent" title="Funding shows which side pays to hold perp exposure." timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Taker pressure" value={selectedMetrics.netFlow5m === null ? "Loading" : formatUsd(selectedMetrics.netFlow5m)} meta={`5m buy ${formatPct(selectedMetrics.buyRatio5m, 1, "Loading", false)} / 15m ${formatUsd(selectedMetrics.netFlow15m)}`} title="Taker pressure estimates aggressive buy versus sell notional." timestamp={selectedState.freshness.trades} />
              <AssetMetricCard label="Liquidity" value={selectedMetrics.spreadBps === null ? "Loading" : `${selectedMetrics.spreadBps.toFixed(2)} bps`} meta={`depth +/-0.5% ${formatUsd(selectedMetrics.depth50Bps)}`} title="Liquidity uses spread and near-book depth from the order book." timestamp={selectedState.freshness.book} />
            </section>

            <Panel title={`${selectedAsset.shortName} chart`} right={<Freshness timestamp={selectedState.freshness.candles} />}>
              <div className="chart-toolbar chart-toolbar-split">
                <div className="toolbar-group">
                  {(["price", "oi", "cvd", "funding"] as ChartMode[]).map((mode) => (
                    <button className={chartMode === mode ? "active" : ""} key={mode} onClick={() => setChartMode(mode)}>
                      {mode === "cvd" ? <Tooltip label="CVD" text="Cumulative volume delta: aggressive buy notional minus aggressive sell notional." /> : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="toolbar-group">
                  {CHART_INTERVALS.map((row) => (
                    <button className={chartInterval === row.key ? "active" : ""} key={row.key} onClick={() => setChartInterval(row.key)}>
                      {row.label}
                    </button>
                  ))}
                </div>
              </div>
              <TradingChart state={selectedState} mode={chartMode} interval={chartInterval} />
            </Panel>

            <section className="two-panels">
              <Panel title="Signal Readiness" right={selectedBest?.active ? "active" : "inactive"}>
                <div className="readiness-grid">
                  {selectedSignals.map((signal) => <ReadinessCard signal={signal} key={signal.kind} />)}
                </div>
              </Panel>
              <Panel title={`${selectedAsset.shortName} recent flow`} right="last 60m">
                <FlowEventsTable events={buildFlowEvents(selectedAsset, selectedState, selectedMetrics)} />
              </Panel>
            </section>
          </>
        )}

        {view === "flow" && (
          <>
            <PageHead title="Recent Flow" subtitle="Large trades, flow bursts, OI spikes and HYPE TWAP-like heuristics." />
            <Panel title="All watched assets" right="BTC / ETH / HYPE">
              <FlowEventsTable events={flowEvents} />
            </Panel>
          </>
        )}

        {view === "alerts" && (
          <>
            <PageHead title="Alerts" subtitle="Presets and custom rules are controlled by the selected BTC / ETH / HYPE asset." />
            <section className="alert-stack">
              <Panel title={`${selectedAsset.shortName} preset alerts`} right={`${selectedAsset.bucket} thresholds`}>
                <AlertPresetGrid asset={selectedAsset} alerts={alerts} onCreate={createPresetAlert} />
              </Panel>
              <Panel title="Create your own" right={`${selectedAsset.shortName} defaults`}>
                <CustomAlertBuilder
                  asset={selectedAsset}
                  draft={customDraft}
                  duplicate={customDuplicate}
                  onChange={setCustomDraft}
                  onCreate={createCustomAlert}
                />
              </Panel>
              <Panel title="My alerts" right={`${alerts.length} saved`}>
                <MyAlertsTable alerts={alerts} filter={alertFilter} onFilter={setAlertFilter} onToggle={toggleAlert} />
              </Panel>
            </section>
          </>
        )}

        {view === "wallet" && (
          <>
            <PageHead title="Wallet Scanner" subtitle="Read-only scanner. Paste an address; no signature, no permissions." />
            <Panel title="Read-only wallet input" right="no trading permissions">
              <form className="wallet-row" onSubmit={(event) => event.preventDefault()}>
                <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
                <button className="primary-action">Scan</button>
              </form>
              <div className="compact-empty">{wallet ? "Wallet scanning backend can be connected here." : "Paste a Hyperliquid wallet to scan open positions and liquidation risk."}</div>
            </Panel>
          </>
        )}
      </section>
    </main>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="radar-panel">
      <div className="panel-title">
        <h2>{title}</h2>
        {right ? <span>{right}</span> : null}
      </div>
      {children}
    </section>
  );
}

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-head">
      <div>
        <span>HypurrScope Risk Radar</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}

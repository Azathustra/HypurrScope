"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type View = "overview" | "watchlist" | "flow" | "alerts" | "wallet";
type ConnectionState = "loading" | "live" | "stale" | "failed";
type SignalKind = "Fresh Long" | "Fresh Short" | "Crowded Long" | "Crowded Short";
type ChartMode = "price" | "oi" | "cvd" | "funding";

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

type FreshnessMap = Partial<Record<"meta" | "candles" | "book" | "trades" | "ws", number>>;

type AssetState = {
  market: MarketCtx;
  candles: Candle[];
  book: Book | null;
  trades: Trade[];
  oiHistory: OiPoint[];
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
  kind: SignalKind;
  createdAt: number;
  enabled: boolean;
  destination: "Browser" | "Telegram" | "Discord" | "Webhook";
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
      price15mPct: 0.35,
      fundingPct: 0.01,
      minDepthUsd: 350_000,
    },
  },
];

const ASSET_ORDER = ASSETS.map((asset) => asset.apiCoin);
const ASSET_BY_COIN = Object.fromEntries(ASSETS.map((asset) => [asset.apiCoin, asset])) as Record<ApiCoin, AssetConfig>;
const PRESET_KINDS: SignalKind[] = ["Fresh Long", "Fresh Short", "Crowded Long", "Crowded Short"];
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
  const cutoff = now - 4.5 * 60 * 60 * 1000;
  return existing.concat({ time: now, oiUsd: oiUsd as number }).filter((row) => row.time >= cutoff).slice(-400);
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
    condition(fundingOk, "negative funding is stretched", `funding < -${formatFunding(t.fundingPct)}`, passed, missing);
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

function Chart({ candles, mode, metrics }: { candles: Candle[]; mode: ChartMode; metrics: MetricBundle }) {
  if (!candles.length) return <div className="compact-empty">Loading 24h candle backfill...</div>;
  const rows = candles.slice(-180);
  const values = rows.flatMap((candle) => [candle.high, candle.low]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, max * 0.001);
  const width = 900;
  const height = 260;
  const x = (index: number) => 34 + (index / Math.max(1, rows.length - 1)) * (width - 70);
  const y = (value: number) => 22 + (1 - (value - min) / span) * (height - 54);
  const candleWidth = clamp((width - 70) / rows.length * 0.65, 2, 8);
  const overlayValue =
    mode === "cvd" ? metrics.cvd1h :
    mode === "funding" ? null :
    mode === "oi" ? metrics.oi1h :
    null;
  return (
    <div className="radar-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="24 hour price chart">
        <line x1="34" x2="866" y1="22" y2="22" />
        <line x1="34" x2="866" y1="130" y2="130" />
        <line x1="34" x2="866" y1="238" y2="238" />
        {rows.map((candle, index) => {
          const up = candle.close >= candle.open;
          const xPos = x(index);
          const openY = y(candle.open);
          const closeY = y(candle.close);
          return (
            <g className={up ? "candle up" : "candle down"} key={`${candle.time}-${index}`}>
              <line x1={xPos} x2={xPos} y1={y(candle.high)} y2={y(candle.low)} />
              <rect x={xPos - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(2, Math.abs(closeY - openY))} rx="1.5" />
            </g>
          );
        })}
        <text x="38" y="18">{formatUsd(max, "")}</text>
        <text x="38" y="254">{formatUsd(min, "")}</text>
      </svg>
      <div className="chart-meta">
        <span>24h candles: {rows.length}</span>
        <span>{mode === "price" ? "Price candles" : `${mode.toUpperCase()} overlay`} {overlayValue === null && mode !== "price" ? "needs rolling history" : ""}</span>
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
      `Hourly funding > ${formatPct(t.fundingPct, 3, "", false)}`,
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

function AlertPresetGrid({
  asset,
  metrics,
  onAlert,
}: {
  asset: AssetConfig;
  metrics: MetricBundle;
  onAlert: (signal: SignalReadiness) => void;
}) {
  return (
    <div className="preset-grid">
      {PRESET_KINDS.map((kind) => {
        const signal = buildSignal(asset, metrics, kind);
        return (
          <article className={signal.active ? "preset-card active" : "preset-card"} key={kind}>
            <header>
              <div>
                <span>{asset.shortName} preset</span>
                <strong>{kind}</strong>
              </div>
              <em>{signal.score === null ? "needs history" : `${signal.score}%`}</em>
            </header>
            <ul>
              {presetRules(asset, kind).map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <small>
              Calibration: large trade {formatUsd(asset.thresholds.largeTradeUsd)} / flow 5m {formatUsd(asset.thresholds.flow5mUsd)}
            </small>
            <button className="table-action" onClick={() => onAlert(signal)}>Create this alert</button>
          </article>
        );
      })}
    </div>
  );
}

export default function Page() {
  const wsRef = useRef<WebSocket | null>(null);
  const [assets, setAssets] = useState<Record<ApiCoin, AssetState>>(initialAssets);
  const [selected, setSelected] = useState<ApiCoin>("HYPE");
  const [view, setView] = useState<View>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [backfillReady, setBackfillReady] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [wallet, setWallet] = useState("");

  const patchAsset = (coin: ApiCoin, updater: (state: AssetState) => AssetState) => {
    setAssets((current) => ({ ...current, [coin]: updater(current[coin]) }));
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBackfill() {
      setConnection("loading");
      try {
        const [metaPayload, candlePayloads, bookPayloads] = await Promise.all([
          fetchMeta(),
          Promise.all(ASSETS.map((asset) => fetchCandles(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const))),
          Promise.all(ASSETS.map((asset) => postInfo({ type: "l2Book", coin: asset.apiCoin, nSigFigs: 5 }).then((payload) => [asset.apiCoin, payload] as const))),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const meta = normalizeMeta(metaPayload);
        const next = initialAssets();
        ASSETS.forEach((asset) => {
          const market = meta[asset.apiCoin] || { ...EMPTY_MARKET };
          const candles = normalizeCandles(candlePayloads.find(([coin]) => coin === asset.apiCoin)?.[1]);
          const book = normalizeBook(bookPayloads.find(([coin]) => coin === asset.apiCoin)?.[1]);
          next[asset.apiCoin] = {
            market,
            candles,
            book,
            trades: [],
            oiHistory: appendOi([], market.oiUsd),
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
  const flowEvents = ASSETS.flatMap((asset) => buildFlowEvents(asset, assets[asset.apiCoin], metricsByAsset[asset.apiCoin]))
    .sort((a, b) => b.time - a.time)
    .slice(0, 40);

  function createAlert(signal: SignalReadiness) {
    const rule: AlertRule = {
      id: `alert-${signal.asset}-${signal.kind}-${Date.now()}`,
      asset: signal.asset,
      kind: signal.kind,
      createdAt: Date.now(),
      enabled: true,
      destination: "Browser",
    };
    setAlerts((current) => [rule].concat(current).slice(0, 30));
    setSelected(signal.asset);
    setView("alerts");
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
                <SignalTable signals={signals} onAlert={createAlert} />
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
              <div className="chart-toolbar">
                {(["price", "oi", "cvd", "funding"] as ChartMode[]).map((mode) => (
                  <button className={chartMode === mode ? "active" : ""} key={mode} onClick={() => setChartMode(mode)}>
                    {mode === "cvd" ? <Tooltip label="CVD" text="Cumulative volume delta: aggressive buy notional minus aggressive sell notional." /> : mode.toUpperCase()}
                  </button>
                ))}
              </div>
              <Chart candles={selectedState.candles} mode={chartMode} metrics={selectedMetrics} />
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
            <PageHead title="Alerts" subtitle="Preset alerts are calibrated per asset. Change BTC / ETH / HYPE in the top bar to update the values." />
            <Panel title={`${selectedAsset.shortName} alert presets`} right={`${selectedAsset.bucket} thresholds`}>
              <AlertPresetGrid asset={selectedAsset} metrics={selectedMetrics} onAlert={createAlert} />
            </Panel>
            <section className="two-panels">
              <Panel title="Recommended now" right={best?.active ? "active setup" : "closest setup"}>
                <SignalTable signals={signals} onAlert={createAlert} />
              </Panel>
              <Panel title="My alerts" right={`${alerts.length} saved`}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Asset</th><th>Setup</th><th>Destination</th><th>Status</th><th>Created</th></tr></thead>
                    <tbody>
                      {alerts.length ? alerts.map((alert) => (
                        <tr key={alert.id}>
                          <td><strong>{alert.asset}</strong></td>
                          <td>{alert.kind}</td>
                          <td>{alert.destination}</td>
                          <td>{alert.enabled ? "Enabled" : "Paused"}</td>
                          <td>{new Date(alert.createdAt).toLocaleString()}</td>
                        </tr>
                      )) : <tr><td colSpan={5}>No saved alerts yet. Pick a setup from the table.</td></tr>}
                    </tbody>
                  </table>
                </div>
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

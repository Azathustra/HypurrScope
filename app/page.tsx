"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type View = "overview" | "alerts" | "statistics" | "markets" | "liquidity" | "twaps" | "nfts" | "etf" | "hip3" | "hip4" | "exchange" | "wallet" | "builder";
type Status = "loading" | "live" | "fallback" | "error";

type Market = {
  symbol: string;
  price: number;
  prevPrice: number;
  changePct: number;
  funding: number;
  oiUsd: number;
  volumeUsd: number;
  fdvUsd?: number;
  maxLeverage: number;
  risk: number;
};

type Candle = {
  time: number;
  close: number;
  volume: number;
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
  bidUsd: number;
  askUsd: number;
  spreadPct: number;
  imbalance: number;
};

type Position = {
  coin: string;
  side: "Long" | "Short";
  notional: number;
  entry: number;
  mark: number;
  pnl: number;
  distancePct: number | null;
};

type NftStats = {
  floor: string;
  volume24h: string;
  totalVolume: string;
  listed: string;
  owners: string;
  sales24h: string;
};

type NftSale = {
  id: string;
  name: string;
  price: string;
  usd?: string;
  time: string;
  image?: string;
  url?: string;
  imageMode?: "artwork" | "preview";
  priceSource?: string;
};

type TwapRow = {
  side: "Buy" | "Sell";
  notional: string;
  rawNotional: number;
  size: string;
  slices: number;
  avgPrice: string;
  lastTrade: string;
  confidence: string;
};

type TradeRow = {
  id: string;
  side: "Buy" | "Sell";
  price: string;
  size: string;
  notionalLabel: string;
  timeLabel: string;
  rawNotional?: number;
};

type TwapSummary = {
  buy10m?: string;
  sell10m?: string;
  netLabel?: string;
  netSide?: string;
  updatedAt?: string;
};

type FlowRow = {
  name: string;
  ticker: string;
  venue: string;
  status: string;
  price?: string;
  change?: string;
  volume?: string;
  dollarVolume?: string;
  aum?: string;
  fee?: string;
  url?: string;
  updatedAt?: string;
};

type FlowDay = {
  date: string;
  net: number;
  inflow: number;
  outflow: number;
};

type BuybackData = {
  live?: boolean;
  estimatedBuybackUsd24hLabel?: string;
  estimatedBuybackHype24hLabel?: string;
  totalFeeUsd24hLabel?: string;
  note?: string;
};

type ExchangeRow = {
  name: string;
  category: "CEX" | "DEX";
  volumeUsd: number;
  marketShare: number;
  status: string;
};

type AlertMetricKey =
  | "hypePrice"
  | "hypeChange24h"
  | "hypeFunding"
  | "hypeOpenInterest"
  | "hypeVolume"
  | "twapNet"
  | "twapSell"
  | "bookSpread"
  | "bookImbalance"
  | "hypeVsBtc30d"
  | "etfNetFlow"
  | "nftSales24h";

type AlertCondition = "gt" | "lt" | "absGt" | "isPositive" | "isNegative";
type AlertJoin = "AND" | "OR";

type AlertClause = {
  id: string;
  metric: AlertMetricKey;
  condition: AlertCondition;
  value: number;
  join: AlertJoin;
};

type AlertRule = {
  id: string;
  name: string;
  clauses: AlertClause[];
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: string;
  lastTriggeredAt?: string;
  delivery: "browser" | "telegram-ready";
};

type MetricSnapshot = Record<AlertMetricKey, number>;

type MetricMeta = {
  key: AlertMetricKey;
  label: string;
  unit: "usd" | "pct" | "number";
  description: string;
};

type MetricPoint = {
  time: number;
  value: number;
  label: string;
};

type ChartHover = {
  point: MetricPoint;
  x: number;
  y: number;
};

type AlertChartRange = "5m" | "1h" | "1d" | "2d" | "7d" | "30d";
type AlertChartStatus = "loading" | "live" | "fallback";

const HYPE_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

const NAV_ITEMS: Array<{ id: View; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "HYPE pulse" },
  { id: "alerts", label: "Alert Studio", description: "Rule engine" },
  { id: "statistics", label: "Statistics", description: "Charts lab" },
  { id: "markets", label: "Markets", description: "Perps radar" },
  { id: "liquidity", label: "Liquidity", description: "Order book" },
  { id: "twaps", label: "TWAPs", description: "Flow tape" },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor + sales" },
  { id: "etf", label: "ETF flows", description: "TradFi bridge" },
  { id: "hip3", label: "HIP-3", description: "Builder perps" },
  { id: "hip4", label: "HIP-4", description: "Outcomes" },
  { id: "exchange", label: "Exchange", description: "Venue share" },
  { id: "wallet", label: "Wallet", description: "Risk scan" },
  { id: "builder", label: "Builder", description: "Proof layer" },
];

const ALERT_METRICS: MetricMeta[] = [
  { key: "hypePrice", label: "HYPE price", unit: "usd", description: "Current HYPE mark price." },
  { key: "hypeChange24h", label: "HYPE 24h change", unit: "pct", description: "Daily price change." },
  { key: "hypeFunding", label: "HYPE funding", unit: "pct", description: "Funding rate converted to percent." },
  { key: "hypeOpenInterest", label: "HYPE open interest", unit: "usd", description: "HYPE perp OI in dollars." },
  { key: "hypeVolume", label: "HYPE volume", unit: "usd", description: "HYPE 24h perp volume." },
  { key: "twapNet", label: "TWAP net pressure", unit: "usd", description: "Buy TWAP notional minus sell TWAP notional." },
  { key: "twapSell", label: "TWAP sell pressure", unit: "usd", description: "Detected sell-side TWAP notional." },
  { key: "bookSpread", label: "Book spread", unit: "pct", description: "Visible best bid/ask spread." },
  { key: "bookImbalance", label: "Book imbalance", unit: "pct", description: "Bid depth minus ask depth as percent." },
  { key: "hypeVsBtc30d", label: "HYPE vs BTC 30d", unit: "pct", description: "HYPE return minus BTC return." },
  { key: "etfNetFlow", label: "ETF net flow", unit: "usd", description: "Latest ETF/ETP flow proxy." },
  { key: "nftSales24h", label: "Hypurr NFT sales", unit: "number", description: "Reported collection sales in 24h." },
];

const DEFAULT_COINS = ["HYPE", "BTC", "ETH", "SOL"];
const ALERT_CHART_RANGES: AlertChartRange[] = ["5m", "1h", "1d", "2d", "7d", "30d"];

const EMPTY_NFT_STATS: NftStats = {
  floor: "--",
  volume24h: "--",
  totalVolume: "--",
  listed: "--",
  owners: "--",
  sales24h: "--",
};

const FALLBACK_FLOWS: FlowRow[] = [
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    venue: "US",
    status: "Waiting for live flow",
    dollarVolume: "--",
    url: "https://farside.co.uk/hyp/",
  },
  {
    name: "21Shares Hyperliquid ETF",
    ticker: "THYP",
    venue: "US",
    status: "Waiting for live flow",
    dollarVolume: "--",
    url: "https://farside.co.uk/hyp/",
  },
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE.SW",
    venue: "Switzerland",
    status: "Waiting for quote",
    dollarVolume: "--",
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD.DE",
    venue: "Germany",
    status: "Waiting for quote",
    dollarVolume: "--",
  },
];

const EMPTY_BUYBACK: BuybackData = {
  live: false,
  estimatedBuybackUsd24hLabel: "Loading",
  estimatedBuybackHype24hLabel: "Loading",
  note: "Loading fee-pressure estimate.",
};

const FALLBACK_EXCHANGES: ExchangeRow[] = [
  { name: "Binance Futures", category: "CEX", volumeUsd: 56_000_000_000, marketShare: 42, status: "CEX benchmark" },
  { name: "Bybit", category: "CEX", volumeUsd: 18_500_000_000, marketShare: 14, status: "CEX benchmark" },
  { name: "OKX", category: "CEX", volumeUsd: 14_200_000_000, marketShare: 11, status: "CEX benchmark" },
  { name: "Hyperliquid", category: "DEX", volumeUsd: 0, marketShare: 0, status: "Live from perps API" },
  { name: "Aster", category: "DEX", volumeUsd: 3_400_000_000, marketShare: 2.6, status: "DEX benchmark" },
  { name: "dYdX", category: "DEX", volumeUsd: 920_000_000, marketShare: 0.7, status: "DEX benchmark" },
  { name: "Jupiter Perps", category: "DEX", volumeUsd: 760_000_000, marketShare: 0.6, status: "DEX benchmark" },
];

const fallbackMarkets: Market[] = [
  makeFallbackMarket("HYPE", 58.4, 3.09, 0, 1_500_000_000, 980_000_000, 10),
  makeFallbackMarket("BTC", 104_800, 4.76, 0.000118, 3_220_000_000, 1_940_000_000, 40),
  makeFallbackMarket("ETH", 5_930, 1.28, 0.00004, 2_110_000_000, 1_120_000_000, 25),
  makeFallbackMarket("SOL", 238, -1.05, -0.000105, 884_000_000, 420_000_000, 20),
  makeFallbackMarket("FARTCOIN", 1.28, -0.74, -0.000076, 460_000_000, 250_000_000, 10),
  makeFallbackMarket("PUMP", 0.0064, 2.85, 0.000079, 420_000_000, 210_000_000, 10),
  makeFallbackMarket("DOGE", 0.22, 1.18, 0.000103, 390_000_000, 190_000_000, 10),
  makeFallbackMarket("AVAX", 31.2, 2.4, 0.000119, 360_000_000, 160_000_000, 10),
  makeFallbackMarket("SUI", 3.4, -2.2, -0.000118, 320_000_000, 140_000_000, 10),
  makeFallbackMarket("LINK", 18.6, 0.82, 0.000036, 290_000_000, 120_000_000, 10),
];

const fallbackTwaps: TwapRow[] = [
  {
    side: "Buy",
    notional: "$2.42M",
    rawNotional: 2_420_000,
    size: "41.4K HYPE",
    slices: 16,
    avgPrice: "$58.45",
    lastTrade: "recent",
    confidence: "Fallback cluster",
  },
  {
    side: "Sell",
    notional: "$1.18M",
    rawNotional: 1_180_000,
    size: "20.1K HYPE",
    slices: 9,
    avgPrice: "$58.31",
    lastTrade: "recent",
    confidence: "Fallback cluster",
  },
];

function makeFallbackMarket(
  symbol: string,
  price: number,
  changePct: number,
  funding: number,
  oiUsd: number,
  volumeUsd: number,
  maxLeverage: number,
): Market {
  return {
    symbol,
    price,
    prevPrice: price / (1 + changePct / 100),
    changePct,
    funding,
    oiUsd,
    volumeUsd,
    fdvUsd: symbol === "HYPE" ? price * HYPE_SUPPLY : undefined,
    maxLeverage,
    risk: scoreRisk(changePct, funding, oiUsd, volumeUsd, maxLeverage),
  };
}

function makeFallbackCandles(coin: string): Candle[] {
  const base = coin === "BTC" ? 104_800 : coin === "ETH" ? 5_930 : coin === "SOL" ? 238 : 58.4;
  return Array.from({ length: 80 }, (_, index) => {
    const wave = Math.sin(index / 4) * 0.9 + Math.cos(index / 9) * 0.45 + index * 0.01;
    return {
      time: Date.now() - (79 - index) * 15 * 60_000,
      close: base + wave,
      volume: 520_000 + Math.abs(Math.sin(index / 3)) * 1_600_000,
    };
  });
}

function makeFallbackDailyCandles(coin: string): Candle[] {
  const base = coin === "BTC" ? 104_800 : coin === "ETH" ? 5_930 : coin === "SOL" ? 238 : 58.4;
  return Array.from({ length: 30 }, (_, index) => {
    const trend = coin === "HYPE" ? index * 0.018 : index * 0.006;
    const wave = Math.sin(index / 2.8) * (coin === "BTC" ? 1800 : 1.4) + Math.cos(index / 5.2) * (coin === "BTC" ? 900 : 0.8);
    const close = base * (1 + trend / 10) + wave;
    return {
      time: Date.now() - (29 - index) * 24 * 60 * 60_000,
      close,
      volume: (coin === "BTC" ? 1_800_000_000 : 620_000_000) * (0.76 + Math.abs(Math.sin(index / 3)) * 0.52),
    };
  });
}

function buildRevenueSeries(hypeDaily: Candle[], totalVolume: number, feeRate = 0.0002) {
  const currentDailyVolume = Math.max(1, hypeDaily[hypeDaily.length - 1]?.volume || 1);
  const scale = Math.max(0.25, totalVolume / currentDailyVolume);
  return hypeDaily.map((candle: Candle, index: number) => {
    const seasonal = 0.9 + Math.abs(Math.sin(index / 3.4)) * 0.28;
    const revenue = candle.volume * scale * feeRate * seasonal;
    return {
      time: candle.time,
      close: revenue,
      volume: candle.volume,
    } satisfies Candle;
  });
}

function dailyLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function makeFallbackBook(coin: string): Book {
  const mid = coin === "BTC" ? 104_800 : coin === "ETH" ? 5_930 : coin === "SOL" ? 238 : 58.4;
  const bids = Array.from({ length: 20 }, (_, index) => {
    const price = mid * (1 - (index + 1) * 0.00008);
    const size = 18 + index * 7;
    return { price, size, usd: price * size };
  });
  const asks = Array.from({ length: 20 }, (_, index) => {
    const price = mid * (1 + (index + 1) * 0.00009);
    const size = 14 + index * 6;
    return { price, size, usd: price * size };
  });
  return buildBookFromSides(bids, asks);
}

function buildBookFromSides(bids: BookLevel[], asks: BookLevel[]): Book {
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const mid = (bestBid + bestAsk) / 2;
  const bidUsd = bids.reduce((sum: number, level: BookLevel) => sum + level.usd, 0);
  const askUsd = asks.reduce((sum: number, level: BookLevel) => sum + level.usd, 0);
  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    bidUsd,
    askUsd,
    spreadPct: mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0,
    imbalance: bidUsd + askUsd > 0 ? ((bidUsd - askUsd) / (bidUsd + askUsd)) * 100 : 0,
  };
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "$--";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toPrecision(3)}`;
}

function formatNative(value: number, suffix = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return `-- ${suffix}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${suffix}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${suffix}`;
  if (value >= 100) return `${value.toFixed(0)} ${suffix}`;
  if (value >= 1) return `${value.toFixed(2)} ${suffix}`;
  return `${value.toPrecision(3)} ${suffix}`;
}

function formatPct(value: number, digits = 2, signed = true) {
  if (!Number.isFinite(value)) return "--";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatMetricValue(value: number, unit: MetricMeta["unit"]) {
  if (unit === "usd") return formatUsd(value);
  if (unit === "pct") return formatPct(value, Math.abs(value) < 1 ? 4 : 2);
  return Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "--";
}

function metricMeta(key: AlertMetricKey) {
  return ALERT_METRICS.find((metric: MetricMeta) => metric.key === key) || ALERT_METRICS[0];
}

function conditionLabel(condition: AlertCondition) {
  if (condition === "gt") return "greater than";
  if (condition === "lt") return "less than";
  if (condition === "absGt") return "absolute value greater than";
  if (condition === "isPositive") return "is positive";
  return "is negative";
}

function makeClause(overrides?: Partial<AlertClause>): AlertClause {
  return {
    id: `clause-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    metric: "hypeFunding",
    condition: "gt",
    value: 0.05,
    join: "AND",
    ...overrides,
  };
}

function makePresetRule(name: string, clauses: AlertClause[]): AlertRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    clauses,
    enabled: true,
    cooldownMinutes: 15,
    createdAt: new Date().toISOString(),
    delivery: "browser",
  };
}

function evaluateClause(clause: AlertClause, snapshot: MetricSnapshot) {
  const value = snapshot[clause.metric];
  if (clause.condition === "gt") return value > clause.value;
  if (clause.condition === "lt") return value < clause.value;
  if (clause.condition === "absGt") return Math.abs(value) > Math.abs(clause.value);
  if (clause.condition === "isPositive") return value > 0;
  return value < 0;
}

function evaluateRule(rule: AlertRule, snapshot: MetricSnapshot) {
  if (!rule.enabled || !rule.clauses.length) return false;
  return rule.clauses.reduce((result: boolean, clause: AlertClause, index: number) => {
    const clauseResult = evaluateClause(clause, snapshot);
    if (index === 0) return clauseResult;
    return clause.join === "AND" ? result && clauseResult : result || clauseResult;
  }, true);
}

function explainClause(clause: AlertClause, snapshot: MetricSnapshot) {
  const meta = metricMeta(clause.metric);
  const current = formatMetricValue(snapshot[clause.metric], meta.unit);
  const target =
    clause.condition === "isPositive" || clause.condition === "isNegative"
      ? ""
      : ` ${formatMetricValue(clause.condition === "absGt" ? Math.abs(clause.value) : clause.value, meta.unit)}`;
  return `${meta.label}: ${current} / ${conditionLabel(clause.condition)}${target}`;
}

function alertSummary(rule: AlertRule, snapshot: MetricSnapshot) {
  return rule.clauses.map((clause: AlertClause, index: number) => `${index ? `${clause.join} ` : ""}${explainClause(clause, snapshot)}`).join(" | ");
}

function metricStep(unit: MetricMeta["unit"], span: number, metric?: AlertMetricKey) {
  if (unit === "usd") {
    if (metric === "hypePrice") {
      if (span >= 20) return 0.25;
      if (span >= 5) return 0.05;
      return 0.01;
    }
    if (span >= 1_000_000_000) return 10_000_000;
    if (span >= 100_000_000) return 1_000_000;
    if (span >= 10_000_000) return 100_000;
    if (span >= 1_000_000) return 10_000;
    if (span >= 100_000) return 1_000;
    if (span >= 10_000) return 100;
    if (span >= 1_000) return 10;
    return 0.01;
  }
  if (unit === "pct") {
    if (span >= 20) return 0.25;
    if (span >= 2) return 0.05;
    return 0.001;
  }
  return span >= 100 ? 1 : 0.1;
}

function roundMetricThreshold(value: number, unit: MetricMeta["unit"], span: number) {
  const step = metricStep(unit, span);
  const rounded = Math.round(value / step) * step;
  if (unit === "usd") return Number(rounded.toFixed(step < 1 ? 2 : 0));
  if (unit === "pct") return Number(rounded.toFixed(step < 0.01 ? 4 : 2));
  return Number(rounded.toFixed(step < 1 ? 1 : 0));
}

function roundAlertThreshold(value: number, metric: AlertMetricKey, unit: MetricMeta["unit"], span: number) {
  const step = metricStep(unit, span, metric);
  const rounded = Math.round(value / step) * step;
  if (unit === "usd") return Number(rounded.toFixed(step < 1 ? 2 : 0));
  if (unit === "pct") return Number(rounded.toFixed(step < 0.01 ? 4 : 2));
  return Number(rounded.toFixed(step < 1 ? 1 : 0));
}

function minimumChartSpan(metric: AlertMetricKey, unit: MetricMeta["unit"], currentValue: number) {
  const abs = Math.abs(currentValue);
  if (metric === "hypePrice") return Math.max(abs * 0.018, 0.35);
  if (metric === "hypeVolume" || metric === "hypeOpenInterest" || metric === "twapNet" || metric === "twapSell" || metric === "etfNetFlow") {
    return Math.max(abs * 0.08, 100_000);
  }
  if (unit === "usd") return Math.max(abs * 0.08, 1);
  if (unit === "pct") return metric === "hypeFunding" ? 0.01 : 0.08;
  return 2;
}

function defaultAlertValue(metric: AlertMetricKey, snapshot: MetricSnapshot) {
  const meta = metricMeta(metric);
  const value = snapshot[metric];
  if (!Number.isFinite(value) || value === 0) {
    if (meta.unit === "usd") return metric === "hypePrice" ? 50 : 1_000_000;
    if (meta.unit === "pct") return 1;
    return 10;
  }
  if (meta.unit === "usd") return roundMetricThreshold(value, meta.unit, Math.max(Math.abs(value) * 0.2, 1));
  if (meta.unit === "pct") return roundMetricThreshold(value, meta.unit, Math.max(Math.abs(value) * 0.5, 0.1));
  return roundMetricThreshold(value, meta.unit, Math.max(Math.abs(value) * 0.5, 1));
}

function metricPoint(time: number, value: number, label: string): MetricPoint {
  return { time, value: Number.isFinite(value) ? value : 0, label };
}

function rangeMs(range: AlertChartRange) {
  if (range === "5m") return 5 * 60_000;
  if (range === "1h") return 60 * 60_000;
  if (range === "1d") return 24 * 60 * 60_000;
  if (range === "2d") return 2 * 24 * 60 * 60_000;
  if (range === "7d") return 7 * 24 * 60 * 60_000;
  return 30 * 24 * 60 * 60_000;
}

function rangeLabel(range: AlertChartRange) {
  if (range === "5m") return "5 minutes";
  if (range === "1h") return "1 hour";
  if (range === "1d") return "1 day";
  if (range === "2d") return "2 days";
  if (range === "7d") return "7 days";
  return "30 days";
}

function timeAxisLabel(time: number, range: AlertChartRange) {
  const date = new Date(time);
  if (range === "5m" || range === "1h") {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "1d" || range === "2d") {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return dailyLabel(time);
}

function alertCandleInterval(range: AlertChartRange) {
  if (range === "5m" || range === "1h") return "1m";
  if (range === "1d") return "15m";
  if (range === "2d") return "1h";
  if (range === "7d") return "4h";
  return "1d";
}

function isLiveCandleMetric(key: AlertMetricKey) {
  return key === "hypePrice" || key === "hypeChange24h" || key === "hypeVolume";
}

function candlesToMetricSeries(key: AlertMetricKey, candles: Candle[], range: AlertChartRange): MetricPoint[] {
  if (!candles.length) return [];
  const base = candles[0].close || 1;
  return candles.map((candle: Candle) => {
    if (key === "hypeChange24h") {
      return metricPoint(candle.time, ((candle.close - base) / base) * 100, timeAxisLabel(candle.time, range));
    }
    if (key === "hypeVolume") {
      return metricPoint(candle.time, candle.volume, timeAxisLabel(candle.time, range));
    }
    return metricPoint(candle.time, candle.close, timeAxisLabel(candle.time, range));
  });
}

function filterSeriesByRange(series: MetricPoint[], range: AlertChartRange) {
  const cutoff = Date.now() - rangeMs(range);
  const filtered = series.filter((point: MetricPoint) => point.time >= cutoff);
  return filtered.length >= 3 ? filtered : series.slice(-Math.min(series.length, 40));
}

function syntheticMetricSeries(current: number, unit: MetricMeta["unit"], key: AlertMetricKey, range: AlertChartRange): MetricPoint[] {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const floor = unit === "pct" ? 0.02 : unit === "usd" ? Math.max(50_000, Math.abs(safeCurrent) * 0.12) : 1;
  const amplitude = Math.max(Math.abs(safeCurrent) * 0.28, floor);
  const phase = ALERT_METRICS.findIndex((metric: MetricMeta) => metric.key === key) + 1;
  const points = range === "5m" ? 30 : range === "1h" ? 36 : range === "1d" ? 48 : range === "2d" ? 56 : 60;
  const duration = rangeMs(range);
  return Array.from({ length: points }, (_, index: number) => {
    const wave = Math.sin(index / 3.2 + phase) * 0.68 + Math.cos(index / 6.5 + phase * 0.5) * 0.32;
    const drift = (index - (points - 1)) * amplitude * 0.006;
    const value = index === points - 1 ? safeCurrent : safeCurrent + wave * amplitude + drift;
    const time = Date.now() - (points - 1 - index) * (duration / Math.max(1, points - 1));
    return metricPoint(time, value, index === points - 1 ? "Now" : timeAxisLabel(time, range));
  });
}

function buildMetricSeries(
  key: AlertMetricKey,
  snapshot: MetricSnapshot,
  candles: Candle[],
  hypeDaily: Candle[],
  btcDaily: Candle[],
  flowDays: FlowDay[],
  range: AlertChartRange,
): MetricPoint[] {
  const meta = metricMeta(key);
  if (key === "hypePrice" && candles.length > 1) {
    return filterSeriesByRange(candles.map((candle: Candle) => metricPoint(candle.time, candle.close, timeAxisLabel(candle.time, range))), range);
  }
  if (key === "hypeChange24h" && candles.length > 1) {
    const first = candles[0].close || 1;
    return filterSeriesByRange(
      candles.map((candle: Candle) => metricPoint(candle.time, ((candle.close - first) / first) * 100, timeAxisLabel(candle.time, range))),
      range,
    );
  }
  if (key === "hypeVolume" && candles.length > 1) {
    return filterSeriesByRange(candles.map((candle: Candle) => metricPoint(candle.time, candle.volume, timeAxisLabel(candle.time, range))), range);
  }
  if (key === "hypeVsBtc30d" && (range === "7d" || range === "30d") && hypeDaily.length > 1 && btcDaily.length > 1) {
    const length = Math.min(hypeDaily.length, btcDaily.length);
    const hypeBase = hypeDaily[hypeDaily.length - length].close || 1;
    const btcBase = btcDaily[btcDaily.length - length].close || 1;
    return Array.from({ length }, (_, index: number) => {
      const hypeCandle = hypeDaily[hypeDaily.length - length + index];
      const btcCandle = btcDaily[btcDaily.length - length + index];
      const hypeReturn = ((hypeCandle.close - hypeBase) / hypeBase) * 100;
      const btcReturn = ((btcCandle.close - btcBase) / btcBase) * 100;
      return metricPoint(hypeCandle.time, hypeReturn - btcReturn, dailyLabel(hypeCandle.time));
    });
  }
  if (key === "etfNetFlow" && (range === "7d" || range === "30d") && flowDays.length > 1) {
    return filterSeriesByRange(
      flowDays.map((day: FlowDay, index: number) => metricPoint(Date.now() - (flowDays.length - 1 - index) * 24 * 60 * 60_000, day.net, day.date)),
      range,
    );
  }
  return syntheticMetricSeries(snapshot[key], meta.unit, key, range);
}

function scoreRisk(changePct: number, funding: number, oiUsd: number, volumeUsd: number, maxLeverage = 10) {
  const move = Math.min(24, Math.abs(changePct) * 2.2);
  const fundingScore = Math.min(24, Math.abs(funding) * 50_000);
  const oiScore = Math.min(22, Math.log10(oiUsd / 10_000_000 + 1) * 9);
  const volumeScore = Math.min(14, Math.log10(volumeUsd / 10_000_000 + 1) * 5);
  const leverageScore = Math.min(10, maxLeverage / 4);
  return Math.round(clamp(12 + move + fundingScore + oiScore + volumeScore + leverageScore, 1, 99));
}

function parseMoneyLabel(label?: string) {
  if (!label) return 0;
  const clean = label.replace(/,/g, "").trim();
  const match = clean.match(/-?\$?(-?\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  const sign = clean.includes("-") ? -1 : 1;
  const multiplier = /B/i.test(clean) ? 1e9 : /M/i.test(clean) ? 1e6 : /K/i.test(clean) ? 1e3 : 1;
  return sign * Math.abs(base) * multiplier;
}

function shortAddress(address: string) {
  if (!address || address.length < 12) return address || "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function riskColor(score: number) {
  if (score >= 75) return "#ff7a8d";
  if (score >= 55) return "#f2c66d";
  return "#35d58a";
}

async function postInfo(body: unknown) {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };

  try {
    const response = await fetch("/api/hyperliquid/info", request);
    if (response.ok) return response.json();
  } catch {
    // Fall back to the public Hyperliquid endpoint when the app proxy is not deployed.
  }

  const directResponse = await fetch(HYPERLIQUID_INFO_URL, request);
  if (!directResponse.ok) throw new Error(`Hyperliquid API ${directResponse.status}`);
  return directResponse.json();
}

function normalizeMarkets(payload: unknown): Market[] {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as { universe?: Array<{ name: string; maxLeverage?: number; isDelisted?: boolean }> };
  const contexts = tuple[1] as Array<Record<string, unknown>>;
  if (!meta?.universe || !Array.isArray(contexts)) return [];

  return meta.universe
    .map((asset, index) => {
      const ctx = contexts[index] || {};
      const price = n(ctx.markPx || ctx.midPx || ctx.oraclePx);
      const prevPrice = n(ctx.prevDayPx);
      const funding = n(ctx.funding);
      const oiUsd = n(ctx.openInterest) * price;
      const volumeUsd = n(ctx.dayNtlVlm);
      const changePct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      const maxLeverage = n(asset.maxLeverage) || 10;
      return {
        symbol: asset.name,
        price,
        prevPrice,
        changePct,
        funding,
        oiUsd,
        volumeUsd,
        fdvUsd: asset.name === "HYPE" ? price * HYPE_SUPPLY : undefined,
        maxLeverage,
        risk: scoreRisk(changePct, funding, oiUsd, volumeUsd, maxLeverage),
        delisted: Boolean(asset.isDelisted),
      };
    })
    .filter((market: Market & { delisted?: boolean }) => market.symbol && market.price > 0 && !market.delisted)
    .sort((a: Market, b: Market) => {
      if (a.symbol === "HYPE") return -1;
      if (b.symbol === "HYPE") return 1;
      return b.oiUsd - a.oiUsd;
    });
}

function normalizeCandles(payload: unknown): Candle[] {
  const rows: any[] = Array.isArray((payload as any)?.candles)
    ? (payload as any).candles
    : Array.isArray(payload)
      ? payload
      : [];
  const candles: Candle[] = rows
    .map((row: any) => ({
      time: n(row.t || row.time || row.timestamp),
      close: n(row.c || row.close),
      volume: n(row.v || row.volume),
    }))
    .filter((row: Candle) => row.time > 0 && row.close > 0)
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-96);
  return candles;
}

function normalizeBook(payload: any): Book | null {
  if (!payload?.levels || !Array.isArray(payload.levels)) return null;
  const bids = (payload.levels[0] || []).map(normalizeLevel).filter(Boolean) as BookLevel[];
  const asks = (payload.levels[1] || []).map(normalizeLevel).filter(Boolean) as BookLevel[];
  if (!bids.length || !asks.length) return null;
  return buildBookFromSides(bids, asks);
}

function normalizeLevel(level: any): BookLevel | null {
  const price = n(level.px || level.price);
  const size = n(level.sz || level.size);
  if (price <= 0 || size <= 0) return null;
  return { price, size, usd: price * size };
}

function parseNftStats(payload: unknown): NftStats {
  const data = payload as any;
  const total = data?.total || {};
  const intervals = Array.isArray(data?.intervals) ? data.intervals : [];
  const day = intervals.find((item: any) => ["one_day", "1d", "day"].includes(item.interval)) || {};
  const floor = n(total.floor_price ?? total.floorPrice ?? data?.floor_price ?? data?.floorPrice);
  const volume24 = n(day.volume ?? day.volume_diff ?? data?.one_day_volume);
  const totalVolume = n(total.volume ?? data?.volume);
  const listed = n(total.listed ?? data?.listed ?? data?.listing_count);
  const owners = n(total.num_owners ?? data?.num_owners);
  const sales24h = n(day.sales ?? day.sales_diff ?? data?.one_day_sales);
  return {
    floor: floor ? formatNative(floor, "HYPE") : EMPTY_NFT_STATS.floor,
    volume24h: volume24 ? formatNative(volume24, "HYPE") : EMPTY_NFT_STATS.volume24h,
    totalVolume: totalVolume ? formatNative(totalVolume, "HYPE") : EMPTY_NFT_STATS.totalVolume,
    listed: listed ? `${listed.toLocaleString("en-US")}` : EMPTY_NFT_STATS.listed,
    owners: owners ? owners.toLocaleString("en-US") : EMPTY_NFT_STATS.owners,
    sales24h: sales24h ? String(Math.round(sales24h)) : EMPTY_NFT_STATS.sales24h,
  };
}

function parseNftSales(payload: unknown): NftSale[] {
  const data = payload as any;
  const candidates = data?.sales || data?.items || data?.results || data?.asset_events || data?.events || [];
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((raw: any, index: number) => {
      const nft = raw.nft || raw.asset || raw.item || raw;
      const id = String(raw.id || nft.identifier || nft.token_id || raw.tokenId || raw.token_id || index + 1);
      const name = raw.name || nft.name || `Hypurr #${id}`;
      const price = typeof raw.price === "string" ? raw.price : raw.priceLabel || raw.payment?.quantity || "Price n/a";
      const rawMode = raw.imageMode || raw.image_mode || (raw.imageStatus === "item_page" ? "preview" : "artwork");
      const imageMode: "artwork" | "preview" = rawMode === "preview" ? "preview" : "artwork";
      return {
        id,
        name,
        price: String(price).replace(/WHYPE/g, "HYPE"),
        usd: raw.usd || raw.usdPrice || raw.usd_price || "",
        time: raw.time || raw.timeLabel || "recent",
        image:
          raw.image ||
          raw.image_url ||
          raw.display_image_url ||
          nft.image_url ||
          nft.image ||
          nft.display_image_url ||
          nft.metadata?.image ||
          "",
        url: raw.url || raw.permalink || nft.permalink || nft.opensea_url || OPENSEA_COLLECTION_URL,
        imageMode,
        priceSource: raw.priceSource || raw.price_source || "api",
      } satisfies NftSale;
    })
    .filter((sale: NftSale) => sale.name || sale.id)
    .slice(0, 16);
}

function parseTwaps(payload: unknown) {
  const data = payload as any;
  const rawTwaps = Array.isArray(data?.twaps) ? data.twaps : [];
  const rawTrades = Array.isArray(data?.trades) ? data.trades : [];
  const twaps: TwapRow[] = rawTwaps.map((item: any, index: number) => ({
    side: item.side === "Sell" ? "Sell" : "Buy",
    notional: item.notional || item.notionalLabel || formatUsd(n(item.rawNotional || item.notionalUsd)),
    rawNotional: n(item.rawNotional || item.notionalUsd || parseMoneyLabel(item.notional || item.notionalLabel)),
    size: item.size || item.sizeLabel || "-- HYPE",
    slices: n(item.slices || item.trades || item.count || index + 1),
    avgPrice: item.avgPrice || item.averagePrice || "--",
    lastTrade: item.lastTrade || item.timeLabel || item.lastTradeLabel || "recent",
    confidence: item.confidence || item.source || "cluster",
  }));
  const trades: TradeRow[] = rawTrades.slice(0, 30).map((item: any, index: number) => ({
    id: String(item.id || `${item.side || "trade"}-${index}`),
    side: item.side === "Sell" ? "Sell" : "Buy",
    price: item.price || item.px || "--",
    size: item.size || item.sz || "--",
    notionalLabel: item.notionalLabel || item.notional || formatUsd(n(item.rawNotional || item.notionalUsd)),
    timeLabel: item.timeLabel || item.time || "recent",
    rawNotional: n(item.rawNotional || item.notionalUsd || parseMoneyLabel(item.notionalLabel || item.notional)),
  }));
  return {
    twaps,
    trades,
    summary: (data?.summary || null) as TwapSummary | null,
    ok: data?.ok !== false,
  };
}

function parseFlows(payload: unknown) {
  const data = payload as any;
  const rows = Array.isArray(data?.flows) ? data.flows : Array.isArray(data) ? data : FALLBACK_FLOWS;
  const flowRows = rows.map((row: any) => ({
    name: row.name || row.ticker || "Unnamed product",
    ticker: row.ticker || "--",
    venue: row.venue || row.region || "--",
    status: row.status || row.note || "Tracked product",
    price: row.price,
    change: row.change,
    volume: row.volume,
    dollarVolume: row.dollarVolume || row.flow || row.netFlow || row.volumeUsd || "--",
    aum: row.aum,
    fee: row.fee,
    url: row.url,
    updatedAt: row.updatedAt,
  })) as FlowRow[];
  const rawDays =
    data?.dailyFlows ||
    data?.history ||
    data?.days ||
    data?.chart ||
    data?.flowHistory ||
    data?.daily ||
    [];
  const parsedDays = Array.isArray(rawDays)
    ? rawDays
        .map((day: any, index: number) => {
          const date = String(day.date || day.day || day.label || day.latestDate || `D-${rawDays.length - index}`);
          const net =
            n(day.net) ||
            n(day.netFlow) ||
            n(day.value) ||
            n(day.total) ||
            parseMoneyLabel(day.dollarVolume || day.flow || day.netFlowLabel);
          return {
            date,
            net,
            inflow: Math.max(0, n(day.inflow) || n(day.inflows) || net),
            outflow: Math.max(0, Math.abs(n(day.outflow) || n(day.outflows) || (net < 0 ? net : 0))),
          } satisfies FlowDay;
        })
        .filter((day: FlowDay) => day.date && Number.isFinite(day.net))
    : [];
  const days = parsedDays.length ? parsedDays.slice(-20) : synthesizeFlowDays(flowRows, data?.latestDate);
  return {
    rows: flowRows,
    days,
    source: data?.source || "flow-feed",
    latestDate: data?.latestDate || "",
    note: data?.note || "",
  };
}

function synthesizeFlowDays(rows: FlowRow[], latestDate?: string): FlowDay[] {
  const net = rows.reduce((sum: number, row: FlowRow) => sum + parseMoneyLabel(row.dollarVolume), 0);
  const base = net || rows.length * 350_000;
  return Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin(index * 0.9) * 0.55 + Math.cos(index * 0.37) * 0.28;
    const value = index === 13 ? net : base * wave * 0.65;
    return {
      date: index === 13 && latestDate ? latestDate : `D-${13 - index}`,
      net: value,
      inflow: Math.max(0, value),
      outflow: Math.max(0, -value),
    };
  });
}

function sourceLabel(status: Status) {
  if (status === "live") return "Live";
  if (status === "loading") return "Loading";
  if (status === "error") return "Error";
  return "Fallback";
}

function buildExchangeRows(hyperliquidVolume: number): ExchangeRow[] {
  const rows = FALLBACK_EXCHANGES.map((row: ExchangeRow) =>
    row.name === "Hyperliquid"
      ? { ...row, volumeUsd: hyperliquidVolume || 7_000_000_000 }
      : row,
  );
  const total = rows.reduce((sum: number, row: ExchangeRow) => sum + row.volumeUsd, 0) || 1;
  return rows
    .map((row: ExchangeRow) => ({ ...row, marketShare: (row.volumeUsd / total) * 100 }))
    .sort((a: ExchangeRow, b: ExchangeRow) => b.volumeUsd - a.volumeUsd);
}

function Sparkline({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) return <div className="empty">Waiting for candles</div>;
  const values = candles.map((candle: Candle) => candle.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  const points = candles
    .map((candle, index) => {
      const x = (index / (candles.length - 1)) * 1000;
      const y = 260 - ((candle.close - min) / span) * 220;
      return `${x},${y}`;
    })
    .join(" ");
  const positive = candles[candles.length - 1].close >= candles[0].close;

  return (
    <svg className="chart" viewBox="0 0 1000 300" role="img" aria-label="24 hour price chart">
      <line x1="0" x2="1000" y1="40" y2="40" />
      <line x1="0" x2="1000" y1="150" y2="150" />
      <line x1="0" x2="1000" y1="260" y2="260" />
      <polyline points={points} className={positive ? "chart-line positive-line" : "chart-line negative-line"} />
      <text x="16" y="35">{formatUsd(max)}</text>
      <text x="16" y="282">{formatUsd(min)}</text>
    </svg>
  );
}

function DepthBars({ book }: { book: Book | null }) {
  if (!book) return <div className="empty">Waiting for order book</div>;
  const maxUsd = Math.max(1, ...book.bids.map((level: BookLevel) => level.usd), ...book.asks.map((level: BookLevel) => level.usd));
  return (
    <div className="depth-bars">
      <div>
        <strong>Bids</strong>
        {book.bids.slice(0, 14).map((level, index) => (
          <div className="depth-row" key={`bid-${index}`}>
            <span>{formatUsd(level.price)}</span>
            <i className="bid" style={{ width: `${Math.max(4, (level.usd / maxUsd) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div>
        <strong>Asks</strong>
        {book.asks.slice(0, 14).map((level, index) => (
          <div className="depth-row" key={`ask-${index}`}>
            <span>{formatUsd(level.price)}</span>
            <i className="ask" style={{ width: `${Math.max(4, (level.usd / maxUsd) * 100)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("overview");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [coin, setCoin] = useState("HYPE");
  const [markets, setMarkets] = useState<Market[]>(fallbackMarkets);
  const [candles, setCandles] = useState<Candle[]>(makeFallbackCandles("HYPE"));
  const [hypeDaily, setHypeDaily] = useState<Candle[]>(makeFallbackDailyCandles("HYPE"));
  const [btcDaily, setBtcDaily] = useState<Candle[]>(makeFallbackDailyCandles("BTC"));
  const [statsStatus, setStatsStatus] = useState<Status>("fallback");
  const [book, setBook] = useState<Book | null>(makeFallbackBook("HYPE"));
  const [marketStatus, setMarketStatus] = useState<Status>("fallback");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketSort, setMarketSort] = useState("oi");
  const [search, setSearch] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("Paste an address to analyze perp exposure.");
  const [positions, setPositions] = useState<Position[]>([]);
  const [nftStats, setNftStats] = useState<NftStats>(EMPTY_NFT_STATS);
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [nftStatus, setNftStatus] = useState<Status>("loading");
  const [twaps, setTwaps] = useState<TwapRow[]>(fallbackTwaps);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [twapSummary, setTwapSummary] = useState<TwapSummary | null>(null);
  const [twapStatus, setTwapStatus] = useState<Status>("fallback");
  const [flows, setFlows] = useState<FlowRow[]>(FALLBACK_FLOWS);
  const [flowDays, setFlowDays] = useState<FlowDay[]>(synthesizeFlowDays(FALLBACK_FLOWS));
  const [flowStatus, setFlowStatus] = useState<Status>("fallback");
  const [flowMeta, setFlowMeta] = useState({ source: "fallback", latestDate: "", note: "" });
  const [buyback, setBuyback] = useState<BuybackData>(EMPTY_BUYBACK);
  const [buybackStatus, setBuybackStatus] = useState<Status>("loading");
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [selectedClauseId, setSelectedClauseId] = useState("draft-1");
  const [draftRule, setDraftRule] = useState<AlertRule>({
    id: "draft",
    name: "Crowded long unwind risk",
    clauses: [
      { id: "draft-1", metric: "hypeFunding", condition: "gt", value: 0.05, join: "AND" },
      { id: "draft-2", metric: "twapNet", condition: "lt", value: -2_000_000, join: "AND" },
      { id: "draft-3", metric: "hypeVsBtc30d", condition: "lt", value: 0, join: "AND" },
    ],
    enabled: true,
    cooldownMinutes: 15,
    createdAt: new Date(0).toISOString(),
    delivery: "browser",
  });

  useEffect(() => {
    loadMarketData();
    const timer = window.setInterval(loadMarketData, 25_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("hypurrscope-alert-rules");
      if (saved) setAlertRules(JSON.parse(saved));
    } catch {
      setAlertRules([]);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
    const timer = window.setInterval(loadStatistics, 120_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("hypurrscope-alert-rules", JSON.stringify(alertRules));
    } catch {
      return;
    }
  }, [alertRules]);

  useEffect(() => {
    if (!draftRule.clauses.some((clause: AlertClause) => clause.id === selectedClauseId)) {
      setSelectedClauseId(draftRule.clauses[0]?.id || "");
    }
  }, [draftRule.clauses, selectedClauseId]);

  useEffect(() => {
    loadNfts();
    const timer = window.setInterval(loadNfts, 120_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadTwaps();
    const timer = window.setInterval(loadTwaps, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadFlowsAndBuybacks();
    const timer = window.setInterval(loadFlowsAndBuybacks, 90_000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadMarketData() {
    try {
      setMarketStatus((current) => (current === "live" ? "live" : "loading"));
      const now = Date.now();
      const [marketPayload, candlePayload, bookPayload] = await Promise.all([
        postInfo({ type: "metaAndAssetCtxs" }),
        postInfo({ type: "candleSnapshot", req: { coin, interval: "15m", startTime: now - 24 * 60 * 60 * 1000, endTime: now } }),
        postInfo({ type: "l2Book", coin, nSigFigs: 5 }),
      ]);
      const nextMarkets = normalizeMarkets(marketPayload);
      const nextCandles = normalizeCandles(candlePayload);
      const nextBook = normalizeBook(bookPayload);
      if (nextMarkets.length) setMarkets(nextMarkets);
      if (nextCandles.length) setCandles(nextCandles);
      if (nextBook) setBook(nextBook);
      setLastUpdate(new Date());
      setMarketStatus("live");
    } catch {
      setCandles(makeFallbackCandles(coin));
      setBook(makeFallbackBook(coin));
      setMarketStatus("fallback");
      setLastUpdate(new Date());
    }
  }

  async function loadStatistics() {
    try {
      setStatsStatus((current) => (current === "live" ? "live" : "loading"));
      const now = Date.now();
      const startTime = now - 32 * 24 * 60 * 60 * 1000;
      const [hypePayload, btcPayload] = await Promise.all([
        postInfo({ type: "candleSnapshot", req: { coin: "HYPE", interval: "1d", startTime, endTime: now } }),
        postInfo({ type: "candleSnapshot", req: { coin: "BTC", interval: "1d", startTime, endTime: now } }),
      ]);
      const nextHype = normalizeCandles(hypePayload);
      const nextBtc = normalizeCandles(btcPayload);
      if (nextHype.length) setHypeDaily(nextHype.slice(-30));
      if (nextBtc.length) setBtcDaily(nextBtc.slice(-30));
      setStatsStatus("live");
    } catch {
      setHypeDaily(makeFallbackDailyCandles("HYPE"));
      setBtcDaily(makeFallbackDailyCandles("BTC"));
      setStatsStatus("fallback");
    }
  }

  async function loadNfts() {
    try {
      setNftStatus((current) => (current === "live" ? "live" : "loading"));
      const [statsRes, eventsRes] = await Promise.allSettled([fetch("/api/opensea/stats"), fetch("/api/opensea/events")]);
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setNftStats(parseNftStats(await statsRes.value.json()));
      }
      if (eventsRes.status !== "fulfilled" || !eventsRes.value.ok) throw new Error("NFT events failed");
      const sales = parseNftSales(await eventsRes.value.json());
      setNftSales(sales);
      setNftStatus(sales.length ? "live" : "fallback");
    } catch {
      setNftStatus("error");
    }
  }

  async function loadTwaps() {
    try {
      setTwapStatus((current) => (current === "live" ? "live" : "loading"));
      const response = await fetch("/api/hyperliquid/twaps");
      if (!response.ok) throw new Error("TWAP API failed");
      const parsed = parseTwaps(await response.json());
      setTwaps(parsed.twaps.length ? parsed.twaps : fallbackTwaps);
      setTrades(parsed.trades);
      setTwapSummary(parsed.summary);
      setTwapStatus(parsed.ok ? "live" : "fallback");
    } catch {
      setTwaps(fallbackTwaps);
      setTwapStatus("fallback");
    }
  }

  async function loadFlowsAndBuybacks() {
    try {
      const response = await fetch("/api/tradfi/flows");
      if (!response.ok) throw new Error("Flow API failed");
      const parsed = parseFlows(await response.json());
      setFlows(parsed.rows.length ? parsed.rows : FALLBACK_FLOWS);
      setFlowDays(parsed.days.length ? parsed.days : synthesizeFlowDays(parsed.rows, parsed.latestDate));
      setFlowMeta({ source: parsed.source, latestDate: parsed.latestDate, note: parsed.note });
      setFlowStatus("live");
    } catch {
      setFlows(FALLBACK_FLOWS);
      setFlowDays(synthesizeFlowDays(FALLBACK_FLOWS));
      setFlowStatus("fallback");
    }

    try {
      const response = await fetch("/api/hyperliquid/buybacks");
      if (!response.ok) throw new Error("Buyback API failed");
      setBuyback(await response.json());
      setBuybackStatus("live");
    } catch {
      setBuybackStatus("fallback");
    }
  }

  async function scanWallet(event: React.FormEvent) {
    event.preventDefault();
    const address = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletStatus("Invalid EVM address.");
      setPositions([]);
      return;
    }

    try {
      setWalletStatus("Scanning account...");
      const state = await postInfo({ type: "clearinghouseState", user: address });
      const marketMap = new Map(markets.map((market: Market) => [market.symbol, market]));
      const nextPositions = ((state as any).assetPositions || [])
        .map((entry: any) => entry.position || entry)
        .filter((position: any) => Math.abs(n(position.szi)) > 0)
        .map((position: any) => {
          const size = n(position.szi);
          const mark = marketMap.get(position.coin)?.price || n(position.markPx);
          const liq = n(position.liquidationPx);
          return {
            coin: position.coin,
            side: size > 0 ? "Long" : "Short",
            notional: n(position.positionValue) || Math.abs(size * mark),
            entry: n(position.entryPx),
            mark,
            pnl: n(position.unrealizedPnl),
            distancePct: liq > 0 && mark > 0 ? (Math.abs(mark - liq) / mark) * 100 : null,
          } satisfies Position;
        })
        .sort((a: Position, b: Position) => b.notional - a.notional);
      setPositions(nextPositions);
      setWalletStatus(`${shortAddress(address)} scanned. ${nextPositions.length} open positions.`);
    } catch {
      setWalletStatus("Unable to scan wallet.");
      setPositions([]);
    }
  }

  const selected = markets.find((market) => market.symbol === coin) || markets[0];
  const hype = markets.find((market) => market.symbol === "HYPE") || selected;
  const totalOi = markets.reduce((sum: number, market: Market) => sum + market.oiUsd, 0);
  const totalVolume = markets.reduce((sum: number, market: Market) => sum + market.volumeUsd, 0);
  const weightedFunding = totalOi > 0 ? markets.reduce((sum: number, market: Market) => sum + market.funding * market.oiUsd, 0) / totalOi : 0;
  const feePressure = parseMoneyLabel(buyback.estimatedBuybackUsd24hLabel) || (hype?.volumeUsd || 0) * 0.0002;
  const topRisk = [...markets].sort((a: Market, b: Market) => b.risk - a.risk)[0];
  const twapBuy = twaps.filter((row: TwapRow) => row.side === "Buy").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapSell = twaps.filter((row: TwapRow) => row.side === "Sell").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapNet = twapBuy - twapSell;
  const etfNetFlow = flows.reduce((sum: number, row: FlowRow) => sum + parseMoneyLabel(row.dollarVolume), 0);
  const largestEtfPrint = Math.max(0, ...flows.map((row: FlowRow) => Math.abs(parseMoneyLabel(row.dollarVolume))));
  const exchangeRows = useMemo(() => buildExchangeRows(totalVolume), [totalVolume]);
  const revenueSeries = useMemo(() => buildRevenueSeries(hypeDaily, totalVolume), [hypeDaily, totalVolume]);
  const hypeReturn30d = hypeDaily.length > 1 ? ((hypeDaily[hypeDaily.length - 1].close - hypeDaily[0].close) / hypeDaily[0].close) * 100 : 0;
  const btcReturn30d = btcDaily.length > 1 ? ((btcDaily[btcDaily.length - 1].close - btcDaily[0].close) / btcDaily[0].close) * 100 : 0;
  const relativeStrength = hypeReturn30d - btcReturn30d;
  const estimatedRevenue30d = revenueSeries.reduce((sum: number, item: Candle) => sum + item.close, 0);
  const avgDailyRevenue = revenueSeries.length ? estimatedRevenue30d / revenueSeries.length : 0;
  const alertSnapshot: MetricSnapshot = {
    hypePrice: hype?.price || selected?.price || 0,
    hypeChange24h: hype?.changePct || 0,
    hypeFunding: (hype?.funding || 0) * 100,
    hypeOpenInterest: hype?.oiUsd || 0,
    hypeVolume: hype?.volumeUsd || 0,
    twapNet,
    twapSell,
    bookSpread: book?.spreadPct || 0,
    bookImbalance: book?.imbalance || 0,
    hypeVsBtc30d: relativeStrength,
    etfNetFlow,
    nftSales24h: Number(nftStats.sales24h.replace(/,/g, "")) || 0,
  };
  const activeAlertCount = alertRules.filter((rule: AlertRule) => evaluateRule(rule, alertSnapshot)).length;
  const selectedDraftClause = draftRule.clauses.find((clause: AlertClause) => clause.id === selectedClauseId) || draftRule.clauses[0];
  const regimeScore = Math.round(
    clamp(Math.abs(weightedFunding) * 60_000 + Math.abs(selected?.changePct || 0) * 2 + Math.abs(book?.imbalance || 0) * 0.2, 0, 99),
  );
  const regime = regimeScore > 65 ? "Volatile" : regimeScore > 35 ? "Active" : "Balanced";
  const marketOptions = Array.from(new Set(DEFAULT_COINS.concat(markets.slice(0, 30).map((market: Market) => market.symbol))));

  const sortedMarkets = useMemo(() => {
    const query = search.trim().toUpperCase();
    const rows = markets.filter((market: Market) => !query || market.symbol.includes(query));
    const sorters: Record<string, (a: Market, b: Market) => number> = {
      oi: (a, b) => b.oiUsd - a.oiUsd,
      risk: (a, b) => b.risk - a.risk,
      funding: (a, b) => Math.abs(b.funding) - Math.abs(a.funding),
      volume: (a, b) => b.volumeUsd - a.volumeUsd,
    };
    return rows.sort(sorters[marketSort] || sorters.oi).slice(0, 80);
  }, [markets, search, marketSort]);

  const overviewSignals = [
    {
      label: `${coin} 24h move`,
      value: formatPct(selected?.changePct || 0, 2),
      body: `${formatUsd(selected?.volumeUsd || 0)} volume and ${formatUsd(selected?.oiUsd || 0)} open interest.`,
      tone: (selected?.changePct || 0) >= 0 ? "good" : "risk",
    },
    {
      label: "Weighted funding",
      value: formatPct(weightedFunding * 100, 4),
      body: "Positive funding means longs are paying shorts; negative funding means shorts are paying longs.",
      tone: Math.abs(weightedFunding) > 0.00025 ? "watch" : "good",
    },
    {
      label: "TWAP net",
      value: `${twapNet >= 0 ? "Buy" : "Sell"} ${formatUsd(Math.abs(twapNet))}`,
      body: `${formatUsd(twapBuy)} buy pressure versus ${formatUsd(twapSell)} sell pressure from detected HYPE flow clusters.`,
      tone: Math.abs(twapNet) > 2_000_000 ? "watch" : "good",
    },
    {
      label: "ETF bridge",
      value: etfNetFlow ? formatUsd(etfNetFlow) : sourceLabel(flowStatus),
      body: flowMeta.latestDate ? `Latest parsed date: ${flowMeta.latestDate}.` : "TradFi products and flow table tracked through the app proxy.",
      tone: etfNetFlow < 0 ? "risk" : "good",
    },
  ];

  function updateDraftClause(clauseId: string, patch: Partial<AlertClause>) {
    setDraftRule((current: AlertRule) => ({
      ...current,
      clauses: current.clauses.map((clause: AlertClause) => (clause.id === clauseId ? { ...clause, ...patch } : clause)),
    }));
  }

  function removeDraftClause(clauseId: string) {
    setDraftRule((current: AlertRule) => ({
      ...current,
      clauses: current.clauses.length > 1 ? current.clauses.filter((clause: AlertClause) => clause.id !== clauseId) : current.clauses,
    }));
  }

  function addDraftClause() {
    const nextClause = makeClause({ metric: "hypeOpenInterest", condition: "gt", value: 1_000_000_000 });
    setDraftRule((current: AlertRule) => ({
      ...current,
      clauses: current.clauses.concat(nextClause),
    }));
    setSelectedClauseId(nextClause.id);
  }

  function saveDraftRule() {
    const rule: AlertRule = {
      ...draftRule,
      id: `rule-${Date.now()}`,
      name: draftRule.name.trim() || "Untitled market structure alert",
      createdAt: new Date().toISOString(),
    };
    setAlertRules((current: AlertRule[]) => [rule].concat(current).slice(0, 20));
    setView("alerts");
  }

  function toggleRule(ruleId: string) {
    setAlertRules((current: AlertRule[]) =>
      current.map((rule: AlertRule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)),
    );
  }

  function deleteRule(ruleId: string) {
    setAlertRules((current: AlertRule[]) => current.filter((rule: AlertRule) => rule.id !== ruleId));
  }

  function loadPreset(kind: "crowdedLong" | "twapSell" | "relativeWeakness" | "thinMove") {
    const presets: Record<typeof kind, AlertRule> = {
      crowdedLong: makePresetRule("Crowded long unwind risk", [
        makeClause({ metric: "hypeFunding", condition: "gt", value: 0.05, join: "AND" }),
        makeClause({ metric: "twapNet", condition: "lt", value: -2_000_000, join: "AND" }),
        makeClause({ metric: "hypeVsBtc30d", condition: "lt", value: 0, join: "AND" }),
      ]),
      twapSell: makePresetRule("TWAP sell pressure", [
        makeClause({ metric: "twapSell", condition: "gt", value: 2_000_000, join: "AND" }),
        makeClause({ metric: "hypeChange24h", condition: "lt", value: 0, join: "AND" }),
      ]),
      relativeWeakness: makePresetRule("HYPE relative weakness", [
        makeClause({ metric: "hypeVsBtc30d", condition: "lt", value: -3, join: "AND" }),
        makeClause({ metric: "hypeVolume", condition: "gt", value: 500_000_000, join: "AND" }),
      ]),
      thinMove: makePresetRule("Liquidity thin move", [
        makeClause({ metric: "bookSpread", condition: "gt", value: 0.03, join: "AND" }),
        makeClause({ metric: "bookImbalance", condition: "absGt", value: 20, join: "AND" }),
      ]),
    };
    const preset = { ...presets[kind], id: "draft" };
    setDraftRule(preset);
    setSelectedClauseId(preset.clauses[0]?.id || "");
  }

  return (
    <main className={`hs-shell ${theme === "light" ? "theme-light" : ""}`}>
      <aside className="hs-rail">
        <div className="brand">
          <span>HS</span>
          <div>
            <strong>HypurrScope</strong>
            <small>Hyperliquid intelligence</small>
          </div>
        </div>
        <nav>
          {NAV_ITEMS.map((item: { id: View; label: string; description: string }) => (
            <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <span className={marketStatus === "live" ? "status live" : "status"}>{sourceLabel(marketStatus)} market data</span>
          <p>Read-only. No wallet connection. Not affiliated with Hyperliquid.</p>
        </div>
      </aside>

      <section className="hs-page">
        <header className="topbar">
          <div className="mobile-brand">
            <span>HS</span>
            <strong>HypurrScope</strong>
          </div>
          <div className="controls">
            <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Night" : "Day"}
            </button>
            <label>
              Asset
              <select value={coin} onChange={(event) => setCoin(event.target.value)}>
                {marketOptions.map((symbol: string) => (
                  <option value={symbol} key={symbol}>{symbol}</option>
                ))}
              </select>
            </label>
            <button className="icon-btn" onClick={loadMarketData} aria-label="Refresh">R</button>
          </div>
          <nav className="mobile-tabs">
            {NAV_ITEMS.map((item: { id: View; label: string; description: string }) => (
              <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>{item.label}</button>
            ))}
          </nav>
        </header>

        {view === "overview" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">No-code Hyperliquid rule engine</p>
                <h1>Build market-structure alerts from Hyperliquid data.</h1>
                <p>
                  Combine funding, OI, TWAP pressure, liquidity, HYPE vs BTC, ETF flow, and NFT demand into
                  custom rules. HypurrScope is becoming an alert studio, not another passive dashboard.
                </p>
                <div className="actions">
                  <button className="primary" onClick={() => setView("alerts")}>Create alert rule</button>
                  <button className="secondary" onClick={() => setView("statistics")}>Open statistics</button>
                </div>
              </div>
              <div className="snapshot">
                <div><span>Selected</span><strong>{coin}</strong></div>
                <div><span>Active rules</span><strong>{activeAlertCount}/{alertRules.length}</strong></div>
                <div><span>Market state</span><strong>{regime} {regimeScore}</strong></div>
              </div>
            </section>

            <section className="kpi-grid">
              <Kpi label={`${coin} price`} value={formatUsd(selected?.price || 0)} detail={`24h ${formatPct(selected?.changePct || 0)}`} tone={(selected?.changePct || 0) >= 0 ? "positive" : "negative"} />
              <Kpi label="Open interest" value={formatUsd(selected?.oiUsd || 0)} detail={`${formatUsd(totalOi)} total perps OI`} />
              <Kpi label="HYPE FDV" value={formatUsd(hype?.fdvUsd || 0)} detail={`${formatPct(totalOi ? ((hype?.oiUsd || 0) / totalOi) * 100 : 0, 1, false)} of total OI`} />
              <Kpi label="Buyback pressure" value={buyback.estimatedBuybackUsd24hLabel || formatUsd(feePressure)} detail={buyback.estimatedBuybackHype24hLabel || "Estimated HYPE / 24h"} />
              <Kpi label="TWAP net" value={`${twapNet >= 0 ? "Buy" : "Sell"} ${formatUsd(Math.abs(twapNet))}`} detail={`${sourceLabel(twapStatus)} HYPE flow tape`} tone={twapNet >= 0 ? "positive" : "negative"} />
              <Kpi label="NFT floor" value={nftStats.floor} detail={`${nftStats.sales24h} 24h sales, ${nftStats.owners} owners`} />
              <Kpi label="ETF net flow" value={etfNetFlow ? formatUsd(etfNetFlow) : "--"} detail={flowMeta.latestDate || sourceLabel(flowStatus)} tone={etfNetFlow >= 0 ? "positive" : "negative"} />
              <Kpi label="Risk score" value={String(selected?.risk || "--")} detail={`Highest stress: ${topRisk?.symbol || "--"} ${topRisk?.risk || "--"}`} tone={(selected?.risk || 0) > 70 ? "negative" : "positive"} />
            </section>

            <section className="two-col">
              <Panel title={`${coin} 24h tape`} subtitle={`${formatUsd(selected?.volumeUsd || 0)} 24h volume, ${formatUsd(selected?.oiUsd || 0)} OI.`}>
                <Sparkline candles={candles} />
              </Panel>
              <Panel title="Signal stack" subtitle="Derived from perps, liquidity, TWAPs, NFT demand, and TradFi flows.">
                <div className="signals">
                  {overviewSignals.map((signal: { label: string; value: string; body: string; tone: string }) => <Signal key={signal.label} {...signal} />)}
                </div>
              </Panel>
            </section>

            <section className="module-grid">
              <MiniModule title="TWAP tape" value={`${twaps.length} clusters`} detail={`${formatUsd(twapBuy)} buys / ${formatUsd(twapSell)} sells`} onClick={() => setView("twaps")} />
              <MiniModule title="Hypurr NFTs" value={nftStats.floor} detail={`${nftSales.length || "--"} latest sale cards loaded`} onClick={() => setView("nfts")} />
              <MiniModule title="ETF flows" value={flowMeta.latestDate || sourceLabel(flowStatus)} detail={`${flows.length} products tracked`} onClick={() => setView("etf")} />
            </section>

            <section className="two-col lower">
              <Panel title="Risk heat" subtitle="Top markets by computed stress score.">
                <RiskHeatmap markets={markets} />
              </Panel>
              <Panel title="Fee-pressure model" subtitle="Assistance Fund estimate and fee-pressure proxy.">
                <div className="model-box">
                  <span>{sourceLabel(buybackStatus)} buyback endpoint</span>
                  <strong>{buyback.estimatedBuybackUsd24hLabel || formatUsd(feePressure)}</strong>
                  <p>{buyback.note || "The fallback model uses 2 bps on HYPE volume."}</p>
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "alerts" && (
          <>
            <ViewHeader eyebrow="No-code alert engine" title="HypurrScope Alert Studio" />
            <section className="kpi-grid">
              <Kpi label="Saved rules" value={String(alertRules.length)} detail="Stored in this browser for the MVP" />
              <Kpi label="Triggered now" value={String(activeAlertCount)} detail="Evaluated against the current market snapshot" tone={activeAlertCount ? "negative" : "positive"} />
              <Kpi label="Metrics available" value={String(ALERT_METRICS.length)} detail="Funding, OI, TWAP, liquidity, ETF, NFT, relative strength" />
              <Kpi label="Delivery" value="Browser now" detail="Telegram-ready architecture panel included" />
            </section>

            <section className="alert-layout">
              <Panel title="Rule builder" subtitle="Create a Hyperliquid market-structure rule without code. Combine conditions with AND / OR.">
                <div className="preset-row">
                  <button onClick={() => loadPreset("crowdedLong")}>Crowded long risk</button>
                  <button onClick={() => loadPreset("twapSell")}>TWAP sell pressure</button>
                  <button onClick={() => loadPreset("relativeWeakness")}>Relative weakness</button>
                  <button onClick={() => loadPreset("thinMove")}>Thin liquidity move</button>
                </div>

                <label className="rule-name">
                  Rule name
                  <input value={draftRule.name} onChange={(event) => setDraftRule((current: AlertRule) => ({ ...current, name: event.target.value }))} />
                </label>

                <div className="clause-list">
                  {draftRule.clauses.map((clause: AlertClause, index: number) => (
                    <div
                      className={clause.id === selectedDraftClause?.id ? "clause-row selected" : "clause-row"}
                      key={clause.id}
                      onFocusCapture={() => setSelectedClauseId(clause.id)}
                    >
                      {index > 0 ? (
                        <select value={clause.join} onChange={(event) => updateDraftClause(clause.id, { join: event.target.value as AlertJoin })}>
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      ) : (
                        <span className="clause-start">WHEN</span>
                      )}
                      <select
                        value={clause.metric}
                        onChange={(event) => {
                          const metric = event.target.value as AlertMetricKey;
                          updateDraftClause(clause.id, { metric, value: defaultAlertValue(metric, alertSnapshot) });
                        }}
                      >
                        {ALERT_METRICS.map((metric: MetricMeta) => <option value={metric.key} key={metric.key}>{metric.label}</option>)}
                      </select>
                      <select value={clause.condition} onChange={(event) => updateDraftClause(clause.id, { condition: event.target.value as AlertCondition })}>
                        <option value="gt">greater than</option>
                        <option value="lt">less than</option>
                        <option value="absGt">abs greater than</option>
                        <option value="isPositive">is positive</option>
                        <option value="isNegative">is negative</option>
                      </select>
                      <input
                        type="number"
                        value={clause.condition === "absGt" ? Math.abs(clause.value) : clause.value}
                        disabled={clause.condition === "isPositive" || clause.condition === "isNegative"}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          updateDraftClause(clause.id, { value: clause.condition === "absGt" ? Math.abs(value) : value });
                        }}
                      />
                      <button className="small-danger" onClick={() => removeDraftClause(clause.id)}>Remove</button>
                    </div>
                  ))}
                </div>

                <div className="builder-actions">
                  <button className="secondary" onClick={addDraftClause}>Add condition</button>
                  <button className="primary" onClick={saveDraftRule}>Save rule</button>
                </div>
              </Panel>

              <Panel title="Live preview" subtitle="The rule is evaluated immediately against the current Hyperliquid snapshot.">
                {selectedDraftClause ? (
                  <ThresholdPicker
                    clause={selectedDraftClause}
                    snapshot={alertSnapshot}
                    candles={candles}
                    hypeDaily={hypeDaily}
                    btcDaily={btcDaily}
                    flowDays={flowDays}
                    onChange={(value: number) => updateDraftClause(selectedDraftClause.id, { value })}
                  />
                ) : null}
                <AlertPreview rule={draftRule} snapshot={alertSnapshot} />
                <div className="metric-grid">
                  {ALERT_METRICS.map((metric: MetricMeta) => (
                    <div className="metric-tile" key={metric.key}>
                      <span>{metric.label}</span>
                      <strong>{formatMetricValue(alertSnapshot[metric.key], metric.unit)}</strong>
                      <small>{metric.description}</small>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="alert-layout lower">
              <Panel title="Saved rules" subtitle="This MVP runs locally. The next backend step stores these in Supabase and checks them every minute.">
                <div className="saved-rules">
                  {alertRules.length ? alertRules.map((rule: AlertRule) => (
                    <SavedRuleCard
                      rule={rule}
                      snapshot={alertSnapshot}
                      key={rule.id}
                      onToggle={() => toggleRule(rule.id)}
                      onDelete={() => deleteRule(rule.id)}
                    />
                  )) : <div className="empty compact">No saved rules yet. Build one above or load a preset.</div>}
                </div>
              </Panel>

              <Panel title="Telegram delivery architecture" subtitle="Not connected yet in the static MVP, but designed as the next production step.">
                <div className="telegram-flow">
                  <div><strong>1. Connect Telegram</strong><span>User opens t.me/HypurrScopeBot?start=code</span></div>
                  <div><strong>2. Store rule</strong><span>Supabase saves chat_id, rule JSON, cooldown, enabled state</span></div>
                  <div><strong>3. Cron evaluates</strong><span>Worker checks live metrics once per minute</span></div>
                  <div><strong>4. Send explainable alert</strong><span>Telegram message includes triggered metrics and interpretation</span></div>
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "statistics" && (
          <>
            <ViewHeader eyebrow="Analytics lab" title="HYPE statistics dashboard" />
            <section className="kpi-grid">
              <Kpi label="HYPE 30d" value={formatPct(hypeReturn30d, 2)} detail="Daily candle return" tone={hypeReturn30d >= 0 ? "positive" : "negative"} />
              <Kpi label="BTC 30d" value={formatPct(btcReturn30d, 2)} detail="Benchmark return" tone={btcReturn30d >= 0 ? "positive" : "negative"} />
              <Kpi label="Relative strength" value={formatPct(relativeStrength, 2)} detail="HYPE return minus BTC return" tone={relativeStrength >= 0 ? "positive" : "negative"} />
              <Kpi label="Revenue proxy 30d" value={formatUsd(estimatedRevenue30d)} detail={`${sourceLabel(statsStatus)} candles, fee-pressure model`} />
            </section>
            <section className="stats-grid">
              <Panel title="HYPE vs BTC normalized performance" subtitle="Both assets start at 100. This makes relative strength readable immediately.">
                <DualLineChart primary={hypeDaily} secondary={btcDaily} primaryLabel="HYPE" secondaryLabel="BTC" />
              </Panel>
              <Panel title="HYPE revenue / fee-pressure proxy" subtitle="Estimated from Hyperliquid volume and a transparent fee-rate model.">
                <RevenueChart series={revenueSeries} />
              </Panel>
              <Panel title="Volume and OI structure" subtitle="A market-quality read inspired by exchange screener dashboards.">
                <StructureChart markets={markets} />
              </Panel>
              <Panel title="Statistics read" subtitle="A compact interpretation layer so the page feels like a product, not a raw chart dump.">
                <div className="signals">
                  <Signal label="Relative trend" value={formatPct(relativeStrength, 2)} body={relativeStrength >= 0 ? "HYPE has outperformed BTC over the sampled daily window." : "HYPE is underperforming BTC over the sampled daily window."} tone={relativeStrength >= 0 ? "good" : "watch"} />
                  <Signal label="Revenue run-rate" value={formatUsd(avgDailyRevenue)} body="This is a fee-pressure proxy, not audited protocol revenue. It is useful as a directional dashboard metric." tone="good" />
                  <Signal label="Market depth context" value={formatUsd(totalOi)} body="OI and volume structure help explain whether moves are spot-like, perp-driven, or liquidity-driven." tone="watch" />
                  <Signal label="Next upgrade" value="Historical API" body="A backend archive would turn these charts from rolling snapshots into a full time-series terminal." tone="good" />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "markets" && (
          <>
            <ViewHeader eyebrow="Perps radar" title="Market map" />
            <div className="toolbar">
              <input placeholder="Search coin" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="segments">
                {["oi", "risk", "funding", "volume"].map((sort: string) => (
                  <button className={marketSort === sort ? "active" : ""} key={sort} onClick={() => setMarketSort(sort)}>{sort}</button>
                ))}
              </div>
            </div>
            <MarketTable rows={sortedMarkets} />
          </>
        )}

        {view === "liquidity" && (
          <>
            <ViewHeader eyebrow="Book intelligence" title="Depth and execution pressure" />
            <section className="two-col">
              <Panel title={`${coin} book depth`} subtitle={`${formatUsd(book?.bidUsd || 0)} visible bids and ${formatUsd(book?.askUsd || 0)} visible asks.`}>
                <DepthBars book={book} />
              </Panel>
              <Panel title="Execution lens" subtitle="Spread, visible depth, and near-touch imbalance.">
                <div className="stats-list">
                  <Stat label="Best bid" value={formatUsd(book?.bestBid || 0)} />
                  <Stat label="Best ask" value={formatUsd(book?.bestAsk || 0)} />
                  <Stat label="Spread" value={formatPct(book?.spreadPct || 0, 4, false)} />
                  <Stat label="Bid depth" value={formatUsd(book?.bidUsd || 0)} />
                  <Stat label="Ask depth" value={formatUsd(book?.askUsd || 0)} />
                  <Stat label="Imbalance" value={formatPct(book?.imbalance || 0, 1)} />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "twaps" && (
          <>
            <ViewHeader eyebrow="HYPE flow tape" title="TWAP cluster monitor" />
            <section className="kpi-grid">
              <Kpi label="Buy pressure" value={twapSummary?.buy10m || formatUsd(twapBuy)} detail="Detected clustered buy notional" tone="positive" />
              <Kpi label="Sell pressure" value={twapSummary?.sell10m || formatUsd(twapSell)} detail="Detected clustered sell notional" tone="negative" />
              <Kpi label="Net pressure" value={twapSummary?.netLabel || formatUsd(Math.abs(twapNet))} detail={twapSummary?.netSide || (twapNet >= 0 ? "Buy side" : "Sell side")} tone={twapNet >= 0 ? "positive" : "negative"} />
              <Kpi label="Source" value={sourceLabel(twapStatus)} detail="Refreshes every 30 seconds" />
            </section>
            <section className="twap-layout">
              <Panel title="Buy vs sell programs" subtitle="Large HYPE TWAP clusters separated by side so the balance is readable at a glance.">
                <TwapPressureBoard twaps={twaps} buyTotal={twapBuy} sellTotal={twapSell} />
              </Panel>
              <Panel title="Recent tape" subtitle="Latest HYPE trades surfaced by the TWAP monitor.">
                <div className="trade-list">
                  {trades.length ? trades.slice(0, 14).map((trade) => <TradeLine trade={trade} key={trade.id} />) : <div className="empty compact">No live trades returned yet.</div>}
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "nfts" && (
          <>
            <ViewHeader eyebrow="Hypurr NFTs" title="Collection pulse" />
            <section className="kpi-grid">
              <Kpi label="Floor" value={nftStats.floor} detail="OpenSea reported floor" />
              <Kpi label="24h volume" value={nftStats.volume24h} detail="Collection activity" />
              <Kpi label="Total volume" value={nftStats.totalVolume} detail="Lifetime reported volume" />
              <Kpi label="Owners" value={nftStats.owners} detail={`${nftStats.sales24h} sales in the last day`} />
            </section>
            <section className="two-col nfts-layout">
              <Panel title="Latest Hypurr sales" subtitle={`${sourceLabel(nftStatus)} OpenSea feed with direct item links.`}>
                <div className="nft-grid">
                  {nftSales.length ? nftSales.map((sale) => <NftSaleCard sale={sale} key={`${sale.id}-${sale.price}`} />) : <div className="empty">No live sales returned. Add/refresh OpenSea API key if needed.</div>}
                </div>
              </Panel>
              <Panel title="Collection read" subtitle="Why this module matters for Hyperliquid ecosystem tracking.">
                <div className="signals">
                  <Signal label="Demand proxy" value={nftStats.floor} body="Hypurr floor and sales are a visible community demand layer around Hyperliquid." tone="good" />
                  <Signal label="Liquidity check" value={nftStats.volume24h} body="Volume and recent sale cadence help separate actual bid activity from static floor listings." tone="watch" />
                  <Signal label="Builder note" value="OpenSea proxy" body="The app uses backend API routes, so API keys and scrape fallbacks stay out of the browser." tone="good" />
                  <a className="external-card" href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer">Open collection on OpenSea -&gt;</a>
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "etf" && (
          <>
            <ViewHeader eyebrow="TradFi bridge" title="ETF and ETP flow monitor" />
            <section className="kpi-grid">
              <Kpi label="Net flow" value={etfNetFlow ? formatUsd(etfNetFlow) : "--"} detail={flowMeta.latestDate || "Latest parsed table date"} tone={etfNetFlow >= 0 ? "positive" : "negative"} />
              <Kpi label="Products" value={String(flows.length)} detail="US and EU HYPE products tracked" />
              <Kpi label="Source" value={sourceLabel(flowStatus)} detail={flowMeta.source || "Flow endpoint"} />
              <Kpi label="Largest print" value={formatUsd(largestEtfPrint)} detail="Largest absolute product flow" />
            </section>
            <section className="two-col">
              <Panel title="Daily ETF / ETP net flow" subtitle={flowMeta.note || "Green bars are inflows; red bars are outflows. Latest flow is shown on the right."}>
                <FlowBarChart days={flowDays} />
              </Panel>
              <Panel title="Tracked products" subtitle="Products tracked through the app flow proxy.">
                <div className="flow-list">
                  {flows.map((row: FlowRow) => <FlowCard row={row} key={`${row.ticker}-${row.name}`} />)}
                </div>
              </Panel>
            </section>
            <section className="two-col lower">
              <Panel title="Why it matters" subtitle="TradFi demand can become a second-order signal for HYPE liquidity.">
                <div className="signals">
                  <Signal label="Bridge signal" value={etfNetFlow ? formatUsd(etfNetFlow) : "--"} body="ETF/ETP flow gives a separate read on demand outside native perps." tone={etfNetFlow < 0 ? "risk" : "good"} />
                  <Signal label="Freshness" value={flowMeta.latestDate || sourceLabel(flowStatus)} body="The module exposes the parsed date and source state so users can judge freshness." tone="watch" />
                  <Signal label="Builder note" value="Proxy layer" body="The current repo already contains a TradFi flow API route, which is used instead of hardcoding values." tone="good" />
                </div>
              </Panel>
              <Panel title="Flow table read" subtitle="A clean product list sits under the chart instead of replacing it.">
                <div className="stats-list">
                  <Stat label="Products" value={String(flows.length)} />
                  <Stat label="Latest date" value={flowMeta.latestDate || "--"} />
                  <Stat label="Largest print" value={formatUsd(largestEtfPrint)} />
                  <Stat label="Endpoint state" value={sourceLabel(flowStatus)} />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "hip3" && (
          <>
            <ViewHeader eyebrow="Builder-deployed markets" title="HIP-3 deployment monitor" />
            <section className="kpi-grid">
              <Kpi label="Tracked markets" value={String(markets.length)} detail="Live perps universe used as current market map" />
              <Kpi label="Builder stake" value="500K HYPE" detail="HIP-3 deployer requirement" />
              <Kpi label="Top OI market" value={sortedMarkets[0]?.symbol || "--"} detail={formatUsd(sortedMarkets[0]?.oiUsd || 0)} />
              <Kpi label="Risk leader" value={`${topRisk?.symbol || "--"} ${topRisk?.risk || "--"}`} detail="Stress score from live market data" />
            </section>
            <section className="two-col">
              <Panel title="Builder market radar" subtitle="HIP-3 is about deployable perps. This view highlights which markets look mature enough for builder-operated venues.">
                <div className="hip-market-grid">
                  {markets.slice(0, 18).map((market: Market) => <HipMarketCard market={market} key={market.symbol} />)}
                </div>
              </Panel>
              <Panel title="Deployment checklist" subtitle="A practical read for builder grant reviewers.">
                <ul className="proof-list">
                  <li><strong>Liquidity first</strong><span>Prioritize assets with durable OI, consistent volume, and tight spreads.</span></li>
                  <li><strong>Risk controls</strong><span>Funding, leverage cap, and stress score must be visible before listing.</span></li>
                  <li><strong>Operator layer</strong><span>HIP-3 lets builders create market venues; analytics should explain why a venue deserves attention.</span></li>
                  <li><strong>Next build</strong><span>Add deployer-level market share once the endpoint is exposed in the repo API.</span></li>
                </ul>
              </Panel>
            </section>
          </>
        )}

        {view === "hip4" && (
          <>
            <ViewHeader eyebrow="Outcome markets" title="HIP-4 probability desk" />
            <section className="kpi-grid">
              <Kpi label="Primitive" value="Outcome" detail="Binary YES/NO style contracts" />
              <Kpi label="Payoff" value="0 / 1" detail="Bounded settlement profile" />
              <Kpi label="Rail" value="HyperCore" detail="Same matching engine family" />
              <Kpi label="Use case" value="Events" detail="Hedge or trade defined outcomes" />
            </section>
            <section className="two-col">
              <Panel title="Outcome market board" subtitle="A professional placeholder for HIP-4 outcome data, structured like a probability terminal.">
                <OutcomeBoard />
              </Panel>
              <Panel title="What to track" subtitle="HIP-4 needs different analytics than perps. Price is not just beta; it is implied probability.">
                <div className="signals">
                  <Signal label="Probability" value="YES / NO" body="Display both sides so users do not confuse outcome price with a perp mark." tone="good" />
                  <Signal label="Expiry" value="Required" body="Outcome markets lose meaning if expiry, target, or settlement source is hidden." tone="watch" />
                  <Signal label="Risk" value="Bounded" body="Loss is bounded by contract payoff, but liquidity and settlement risk still matter." tone="good" />
                  <Signal label="Next build" value="outcomeMeta" body="Wire Hyperliquid outcome metadata once your backend route exposes it." tone="watch" />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "exchange" && (
          <>
            <ViewHeader eyebrow="Venue comparison" title="Hyperliquid vs exchange volume" />
            <section className="kpi-grid">
              <Kpi label="Hyperliquid volume" value={formatUsd(totalVolume)} detail="Live sum of Hyperliquid perp volume" />
              <Kpi label="Ranked venues" value={String(exchangeRows.length)} detail="CEX and DEX comparison set" />
              <Kpi label="DEX share signal" value={formatPct(exchangeRows.find((row: ExchangeRow) => row.name === "Hyperliquid")?.marketShare || 0, 1, false)} detail="Hyperliquid share in this comparison basket" />
              <Kpi label="Source state" value={sourceLabel(marketStatus)} detail="Hyperliquid leg is live, peers are benchmark rows" />
            </section>
            <section className="two-col">
              <Panel title="24h perp volume comparison" subtitle="Inspired by ASXN/Hyperscreener style: horizontal bars make venue share readable immediately.">
                <ExchangeComparison rows={exchangeRows} />
              </Panel>
              <Panel title="How to read it" subtitle="This is built to become a live multi-source comparison module.">
                <div className="signals">
                  <Signal label="Live leg" value="Hyperliquid" body="The Hyperliquid row uses the current perps volume from the app market API." tone="good" />
                  <Signal label="Peer rows" value="Benchmarks" body="Binance, Bybit, OKX and DEX peers are benchmark rows until an exchange-volume API is wired." tone="watch" />
                  <Signal label="Builder value" value="Context" body="Grant reviewers can see HypurrScope is not just a token page; it tracks Hyperliquid against the wider market." tone="good" />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "wallet" && (
          <>
            <ViewHeader eyebrow="Read-only account scan" title="Wallet risk desk" />
            <form className="wallet-form" onSubmit={scanWallet}>
              <input placeholder="0x..." value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} />
              <button className="primary">Scan</button>
            </form>
            <Panel title="Open positions" subtitle={walletStatus}>
              <table>
                <thead><tr><th>Coin</th><th>Side</th><th>Notional</th><th>Entry</th><th>Mark</th><th>PnL</th><th>Liq distance</th></tr></thead>
                <tbody>
                  {positions.length ? positions.map((position: Position) => (
                    <tr key={`${position.coin}-${position.side}`}>
                      <td><strong>{position.coin}</strong></td>
                      <td className={position.side === "Long" ? "positive" : "negative"}>{position.side}</td>
                      <td>{formatUsd(position.notional)}</td>
                      <td>{formatUsd(position.entry)}</td>
                      <td>{formatUsd(position.mark)}</td>
                      <td className={position.pnl >= 0 ? "positive" : "negative"}>{position.pnl >= 0 ? "+" : "-"}{formatUsd(Math.abs(position.pnl))}</td>
                      <td>{position.distancePct === null ? "--" : formatPct(position.distancePct, 1, false)}</td>
                    </tr>
                  )) : <tr><td colSpan={7}>No wallet loaded.</td></tr>}
                </tbody>
              </table>
            </Panel>
          </>
        )}

        {view === "builder" && (
          <>
            <ViewHeader eyebrow="Builder proof" title="Transparent analytics layer" />
            <section className="builder-grid">
              <Panel title="Data sources" subtitle="Every live metric is read-only and reproducible.">
                <ul className="proof-list">
                  <li><strong>Hyperliquid Info API</strong><span>metaAndAssetCtxs, candleSnapshot, l2Book, clearinghouseState.</span></li>
                  <li><strong>Hyperliquid TWAP route</strong><span>Uses the repo backend endpoint to surface HYPE flow clusters and recent trade tape.</span></li>
                  <li><strong>OpenSea proxy</strong><span>Collection stats and sale cards flow through server routes, keeping keys out of the browser.</span></li>
                  <li><strong>TradFi flow proxy</strong><span>ETF and ETP flow products tracked as an external demand layer.</span></li>
                </ul>
              </Panel>
              <Panel title="Computed models" subtitle="Designed to be inspected and improved.">
                <ul className="proof-list">
                  <li><strong>Market risk</strong><span>24h move + funding + OI + volume + leverage cap.</span></li>
                  <li><strong>TWAP pressure</strong><span>Buy/sell cluster notional and net flow used as execution pressure signal.</span></li>
                  <li><strong>Book pressure</strong><span>Near-touch bid/ask USD depth and spread.</span></li>
                  <li><strong>Ecosystem demand</strong><span>NFT floor, recent sales, and ETF flows shown beside native market structure.</span></li>
                </ul>
              </Panel>
              <Panel title="Roadmap" subtitle="Next grant-facing layers.">
                <ol className="roadmap">
                  <li>Historical archive for TWAP clusters, NFT sales, and ETF flows.</li>
                  <li>Public sharable wallet reports with no private permissions.</li>
                  <li>Open-source formula docs and changelog for community review.</li>
                  <li>Rate-limited API proxy cache with freshness badges per module.</li>
                </ol>
              </Panel>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <article className={`kpi ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function Signal({ label, value, body, tone }: { label: string; value: string; body: string; tone: string }) {
  return (
    <article className={`signal ${tone}`}>
      <div><strong>{label}</strong><span>{value}</span></div>
      <p>{body}</p>
    </article>
  );
}

function ViewHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section className="view-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </section>
  );
}

function MiniModule({ title, value, detail, onClick }: { title: string; value: string; detail: string; onClick: () => void }) {
  return (
    <button className="mini-module" onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function MarketTable({ rows }: { rows: Market[] }) {
  return (
    <article className="panel table-panel">
      <div className="panel-head">
        <div>
          <h2>Live perps</h2>
          <p>{rows.length} markets shown</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Coin</th><th>Price</th><th>24h</th><th>OI</th><th>Volume</th><th>Funding</th><th>Risk</th></tr>
          </thead>
          <tbody>
            {rows.map((market: Market) => (
              <tr key={market.symbol}>
                <td><strong>{market.symbol}</strong></td>
                <td>{formatUsd(market.price)}</td>
                <td className={market.changePct >= 0 ? "positive" : "negative"}>{formatPct(market.changePct)}</td>
                <td>{formatUsd(market.oiUsd)}</td>
                <td>{formatUsd(market.volumeUsd)}</td>
                <td className={market.funding >= 0 ? "positive" : "negative"}>{formatPct(market.funding * 100, 4)}</td>
                <td><div className="riskbar"><i style={{ width: `${market.risk}%`, background: riskColor(market.risk) }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function RiskHeatmap({ markets }: { markets: Market[] }) {
  return (
    <div className="heatmap">
      {[...markets].sort((a: Market, b: Market) => b.risk - a.risk).slice(0, 24).map((market: Market) => (
        <div className="heat" key={market.symbol} style={{ borderColor: riskColor(market.risk) }}>
          <strong>{market.symbol}</strong>
          <span>{market.risk} risk</span>
          <span>{formatPct(market.funding * 100, 4)}</span>
        </div>
      ))}
    </div>
  );
}

function TwapPressureBoard({ twaps, buyTotal, sellTotal }: { twaps: TwapRow[]; buyTotal: number; sellTotal: number }) {
  const buys = twaps.filter((row: TwapRow) => row.side === "Buy").sort((a: TwapRow, b: TwapRow) => b.rawNotional - a.rawNotional);
  const sells = twaps.filter((row: TwapRow) => row.side === "Sell").sort((a: TwapRow, b: TwapRow) => b.rawNotional - a.rawNotional);
  const total = Math.max(1, buyTotal + sellTotal);
  const buyShare = (buyTotal / total) * 100;
  const sellShare = (sellTotal / total) * 100;

  return (
    <div className="twap-board">
      <div className="twap-balance">
        <div>
          <span>Buy pressure</span>
          <strong className="positive">{formatUsd(buyTotal)}</strong>
        </div>
        <div className="balance-track" aria-label="TWAP buy and sell balance">
          <i className="buy" style={{ width: `${buyShare}%` }} />
          <i className="sell" style={{ width: `${sellShare}%` }} />
        </div>
        <div>
          <span>Sell pressure</span>
          <strong className="negative">{formatUsd(sellTotal)}</strong>
        </div>
      </div>

      <div className="twap-columns">
        <div className="twap-side buy-side">
          <div className="side-head">
            <strong>Buy TWAPs</strong>
            <span>{buys.length} clusters</span>
          </div>
          {buys.length ? buys.map((row: TwapRow, index: number) => <TwapCard row={row} key={`buy-${index}`} />) : <div className="empty compact">No buy clusters.</div>}
        </div>
        <div className="twap-side sell-side">
          <div className="side-head">
            <strong>Sell TWAPs</strong>
            <span>{sells.length} clusters</span>
          </div>
          {sells.length ? sells.map((row: TwapRow, index: number) => <TwapCard row={row} key={`sell-${index}`} />) : <div className="empty compact">No sell clusters.</div>}
        </div>
      </div>
    </div>
  );
}

function FlowBarChart({ days }: { days: FlowDay[] }) {
  const chartDays = days.slice(-14);
  const maxAbs = Math.max(1, ...chartDays.map((day: FlowDay) => Math.abs(day.net)));
  const totalIn = chartDays.reduce((sum: number, day: FlowDay) => sum + Math.max(0, day.net), 0);
  const totalOut = chartDays.reduce((sum: number, day: FlowDay) => sum + Math.max(0, -day.net), 0);

  return (
    <div className="flow-chart-wrap">
      <div className="flow-summary">
        <div><span>Total inflow</span><strong className="positive">{formatUsd(totalIn)}</strong></div>
        <div><span>Total outflow</span><strong className="negative">{formatUsd(totalOut)}</strong></div>
      </div>
      <div className="flow-chart" aria-label="Daily ETF and ETP net flows">
        <div className="zero-line" />
        {chartDays.map((day: FlowDay, index: number) => {
          const isPositive = day.net >= 0;
          const height = Math.max(4, (Math.abs(day.net) / maxAbs) * 44);
          return (
            <div className="flow-day" key={`${day.date}-${index}`}>
              <span className={isPositive ? "bar positive-bar" : "bar negative-bar"} style={{ height: `${height}%` }} title={`${day.date}: ${formatUsd(day.net)}`} />
              <small>{day.date.length > 6 ? day.date.slice(0, 6) : day.date}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DualLineChart({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
}: {
  primary: Candle[];
  secondary: Candle[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const length = Math.min(primary.length, secondary.length);
  const primaryData = primary.slice(-length);
  const secondaryData = secondary.slice(-length);
  if (length < 2) return <div className="empty">Waiting for comparison candles</div>;
  const primaryBase = primaryData[0].close || 1;
  const secondaryBase = secondaryData[0].close || 1;
  const pValues = primaryData.map((item: Candle) => (item.close / primaryBase) * 100);
  const sValues = secondaryData.map((item: Candle) => (item.close / secondaryBase) * 100);
  const values = pValues.concat(sValues);
  const min = Math.min(...values) * 0.985;
  const max = Math.max(...values) * 1.015;
  const span = Math.max(0.0001, max - min);
  const point = (value: number, index: number) => {
    const x = 42 + (index / (length - 1)) * 894;
    const y = 260 - ((value - min) / span) * 220;
    return `${x},${y}`;
  };
  const primaryPoints = pValues.map(point).join(" ");
  const secondaryPoints = sValues.map(point).join(" ");

  return (
    <div className="pro-chart-card">
      <div className="chart-legend">
        <span className="legend-mint">{primaryLabel}</span>
        <span className="legend-amber">{secondaryLabel}</span>
        <strong>{formatPct(pValues[pValues.length - 1] - sValues[sValues.length - 1], 2)} relative</strong>
      </div>
      <svg className="pro-chart" viewBox="0 0 1000 300" role="img" aria-label={`${primaryLabel} versus ${secondaryLabel}`}>
        <line x1="42" x2="936" y1="60" y2="60" />
        <line x1="42" x2="936" y1="150" y2="150" />
        <line x1="42" x2="936" y1="240" y2="240" />
        <polyline points={secondaryPoints} className="chart-line amber-line" />
        <polyline points={primaryPoints} className="chart-line positive-line" />
        <text x="42" y="34">{max.toFixed(1)}</text>
        <text x="42" y="284">{min.toFixed(1)}</text>
        <text x="820" y="284">{dailyLabel(primaryData[primaryData.length - 1].time)}</text>
      </svg>
    </div>
  );
}

function RevenueChart({ series }: { series: Candle[] }) {
  const values = series.map((item: Candle) => item.close);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum: number, value: number) => sum + value, 0);
  return (
    <div className="revenue-chart">
      <div className="flow-summary">
        <div><span>30d proxy</span><strong>{formatUsd(total)}</strong></div>
        <div><span>Average day</span><strong>{formatUsd(series.length ? total / series.length : 0)}</strong></div>
      </div>
      <div className="revenue-bars">
        {series.slice(-24).map((item: Candle, index: number) => (
          <div className="revenue-day" key={`${item.time}-${index}`}>
            <i style={{ height: `${Math.max(5, (item.close / max) * 100)}%` }} />
            <small>{index % 5 === 0 ? dailyLabel(item.time) : ""}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureChart({ markets }: { markets: Market[] }) {
  const rows = markets.slice(0, 10);
  const max = Math.max(1, ...rows.map((market: Market) => Math.max(market.volumeUsd, market.oiUsd)));
  return (
    <div className="structure-chart">
      {rows.map((market: Market) => (
        <article className="structure-row" key={market.symbol}>
          <strong>{market.symbol}</strong>
          <div>
            <span className="vol" style={{ width: `${Math.max(2, (market.volumeUsd / max) * 100)}%` }} />
            <span className="oi" style={{ width: `${Math.max(2, (market.oiUsd / max) * 100)}%` }} />
          </div>
          <small>{formatUsd(market.volumeUsd)} vol / {formatUsd(market.oiUsd)} OI</small>
        </article>
      ))}
    </div>
  );
}

function HipMarketCard({ market }: { market: Market }) {
  const maturity = Math.round(clamp((Math.log10(market.oiUsd / 10_000_000 + 1) * 24) + (Math.log10(market.volumeUsd / 10_000_000 + 1) * 18) - Math.abs(market.funding) * 8000, 1, 99));
  return (
    <article className="hip-card">
      <div>
        <strong>{market.symbol}</strong>
        <span>{maturity} maturity</span>
      </div>
      <p>{formatUsd(market.volumeUsd)} 24h volume</p>
      <div className="riskbar"><i style={{ width: `${maturity}%`, background: riskColor(maturity) }} /></div>
      <small>OI {formatUsd(market.oiUsd)} / funding {formatPct(market.funding * 100, 4)}</small>
    </article>
  );
}

function OutcomeBoard() {
  const rows = [
    { market: "BTC above daily mark", yes: 58, no: 42, expiry: "Daily 06:00 UTC", liquidity: "$420K" },
    { market: "ETH above weekly range", yes: 46, no: 54, expiry: "Weekly", liquidity: "$180K" },
    { market: "HYPE closes green", yes: 63, no: 37, expiry: "Daily", liquidity: "$260K" },
  ];
  return (
    <div className="outcome-board">
      {rows.map((row: { market: string; yes: number; no: number; expiry: string; liquidity: string }) => (
        <article className="outcome-card" key={row.market}>
          <div>
            <strong>{row.market}</strong>
            <span>{row.expiry}</span>
          </div>
          <div className="prob-track">
            <i className="yes" style={{ width: `${row.yes}%` }} />
            <i className="no" style={{ width: `${row.no}%` }} />
          </div>
          <div className="prob-labels">
            <span>YES {row.yes}%</span>
            <span>NO {row.no}%</span>
          </div>
          <small>Visible liquidity {row.liquidity}</small>
        </article>
      ))}
    </div>
  );
}

function ExchangeComparison({ rows }: { rows: ExchangeRow[] }) {
  const maxVolume = Math.max(1, ...rows.map((row: ExchangeRow) => row.volumeUsd));
  return (
    <div className="exchange-bars">
      {rows.map((row: ExchangeRow) => (
        <article className={row.name === "Hyperliquid" ? "exchange-row highlight" : "exchange-row"} key={row.name}>
          <div>
            <strong>{row.name}</strong>
            <span>{row.category} / {row.status}</span>
          </div>
          <div className="exchange-track">
            <i style={{ width: `${Math.max(2, (row.volumeUsd / maxVolume) * 100)}%` }} />
          </div>
          <div className="exchange-values">
            <strong>{formatUsd(row.volumeUsd)}</strong>
            <span>{formatPct(row.marketShare, 1, false)} share</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function TwapCard({ row }: { row: TwapRow }) {
  return (
    <article className={`twap-card ${row.side === "Buy" ? "buy" : "sell"}`}>
      <div>
        <span>{row.side}</span>
        <strong>{row.notional}</strong>
      </div>
      <dl>
        <div><dt>Size</dt><dd>{row.size}</dd></div>
        <div><dt>Slices</dt><dd>{row.slices || "--"}</dd></div>
        <div><dt>Avg</dt><dd>{row.avgPrice}</dd></div>
        <div><dt>Last</dt><dd>{row.lastTrade}</dd></div>
      </dl>
      <small>{row.confidence}</small>
    </article>
  );
}

function TradeLine({ trade }: { trade: TradeRow }) {
  return (
    <div className="trade-line">
      <span className={trade.side === "Buy" ? "positive" : "negative"}>{trade.side}</span>
      <strong>{trade.notionalLabel}</strong>
      <span>{trade.price}</span>
      <span>{trade.timeLabel}</span>
    </div>
  );
}

function NftSaleCard({ sale }: { sale: NftSale }) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(sale.image && !broken);
  return (
    <a className="nft-card" href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer">
      <div className="nft-media">
        {hasImage ? (
          <img
            src={sale.image}
            alt={sale.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className={sale.imageMode === "preview" ? "preview" : ""}
          />
        ) : (
          <span>No image</span>
        )}
      </div>
      <div>
        <strong>{sale.name}</strong>
        <span>{sale.time}</span>
      </div>
      <p>{sale.price}</p>
    </a>
  );
}

function FlowCard({ row }: { row: FlowRow }) {
  const card = (
    <article className="flow-card">
      <div>
        <span>{row.ticker}</span>
        <strong>{row.dollarVolume || row.volume || "--"}</strong>
      </div>
      <h3>{row.name}</h3>
      <p>{row.venue} / {row.status}</p>
      {row.price || row.change ? <small>{row.price || "--"} {row.change || ""}</small> : null}
    </article>
  );
  return row.url ? <a className="flow-link" href={row.url} target="_blank" rel="noreferrer">{card}</a> : card;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function ThresholdPicker({
  clause,
  snapshot,
  candles,
  hypeDaily,
  btcDaily,
  flowDays,
  onChange,
}: {
  clause: AlertClause;
  snapshot: MetricSnapshot;
  candles: Candle[];
  hypeDaily: Candle[];
  btcDaily: Candle[];
  flowDays: FlowDay[];
  onChange: (value: number) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [range, setRange] = useState<AlertChartRange>("1d");
  const [zoomLevel, setZoomLevel] = useState(0);
  const [liveSeries, setLiveSeries] = useState<MetricPoint[]>([]);
  const [chartStatus, setChartStatus] = useState<AlertChartStatus>("fallback");
  const [hover, setHover] = useState<ChartHover | null>(null);
  const meta = metricMeta(clause.metric);
  const currentValue = snapshot[clause.metric];
  const staticSeries = buildMetricSeries(clause.metric, snapshot, candles, hypeDaily, btcDaily, flowDays, range);
  const needsLiveCandles = isLiveCandleMetric(clause.metric);
  const flatCurrentSeries = [
    metricPoint(Date.now() - rangeMs(range), currentValue, "Waiting"),
    metricPoint(Date.now(), currentValue, "Now"),
  ];
  const series = liveSeries.length ? liveSeries : needsLiveCandles ? flatCurrentSeries : staticSeries;
  const thresholdEnabled = clause.condition !== "isPositive" && clause.condition !== "isNegative";
  const thresholdValue = clause.condition === "absGt" ? Math.abs(clause.value) : clause.value;
  const values = series
    .map((point: MetricPoint) => point.value)
    .concat(currentValue, thresholdEnabled ? thresholdValue : currentValue, clause.condition === "absGt" ? -thresholdValue : currentValue);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minChartSpan = minimumChartSpan(clause.metric, meta.unit, currentValue);
  const rawSpan = Math.max(Math.abs(rawMax - rawMin), minChartSpan);
  const zoomFactor = zoomLevel === 0 ? 1 : zoomLevel === 1 ? 0.62 : 0.38;
  const center = thresholdEnabled ? (currentValue + thresholdValue) / 2 : currentValue;
  const halfSpan = Math.max(rawSpan * (0.62 * zoomFactor), minChartSpan * 0.35);
  const min = Math.min(rawMin, center - halfSpan);
  const max = Math.max(rawMax, center + halfSpan);
  const span = Math.max(0.000001, max - min);
  const plot = { left: 76, right: 970, top: 24, bottom: 230 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const points = series
    .map((point: MetricPoint, index: number) => {
      const x = plot.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : 0);
      const y = plot.top + ((max - point.value) / span) * plotHeight;
      return `${x},${clamp(y, plot.top, plot.bottom)}`;
    })
    .join(" ");
  const thresholdY = clamp(plot.top + ((max - thresholdValue) / span) * plotHeight, plot.top, plot.bottom);
  const mirrorY = clamp(plot.top + ((max + thresholdValue) / span) * plotHeight, plot.top, plot.bottom);
  const currentY = clamp(plot.top + ((max - currentValue) / span) * plotHeight, plot.top, plot.bottom);
  const midValue = min + span / 2;
  const firstPoint = series[0];
  const middlePoint = series[Math.floor(series.length / 2)];
  const lastPoint = series[series.length - 1];
  const activeHover = hover || (lastPoint ? { point: lastPoint, ...pointToChart(lastPoint, series.length - 1) } : null);
  const hit = evaluateClause(clause, snapshot);

  useEffect(() => {
    let cancelled = false;
    async function loadLiveHypeCandles() {
      setHover(null);
      if (!isLiveCandleMetric(clause.metric)) {
        setLiveSeries([]);
        setChartStatus("fallback");
        return;
      }
      try {
        setChartStatus("loading");
        const now = Date.now();
        const payload = await postInfo({
          type: "candleSnapshot",
          req: {
            coin: "HYPE",
            interval: alertCandleInterval(range),
            startTime: now - rangeMs(range),
            endTime: now,
          },
        });
        if (cancelled) return;
        const nextCandles = normalizeCandles(payload);
        const nextSeries = candlesToMetricSeries(clause.metric, nextCandles, range);
        setLiveSeries(nextSeries);
        setChartStatus(nextSeries.length ? "live" : "fallback");
      } catch {
        if (!cancelled) {
          setLiveSeries([]);
          setChartStatus("fallback");
        }
      }
    }
    loadLiveHypeCandles();
    return () => {
      cancelled = true;
    };
  }, [clause.metric, range]);

  useEffect(() => {
    if (clause.metric !== "hypePrice" || !thresholdEnabled || currentValue <= 0) return;
    const tooFar = Math.abs(thresholdValue - currentValue) > Math.max(currentValue * 0.25, 5);
    if (thresholdValue <= 0 || tooFar) {
      onChange(defaultAlertValue("hypePrice", snapshot));
    }
  }, [clause.metric, thresholdEnabled, thresholdValue, currentValue, onChange, snapshot]);

  function pointToChart(point: MetricPoint, index: number) {
    const x = plot.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : 0);
    const y = plot.top + ((max - point.value) / span) * plotHeight;
    return { x, y: clamp(y, plot.top, plot.bottom) };
  }

  function updateHoverFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!chartRef.current || !series.length) return;
    const rect = chartRef.current.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 1000;
    const index = clamp(Math.round(((svgX - plot.left) / plotWidth) * (series.length - 1)), 0, series.length - 1);
    const pointIndex = Math.round(index);
    const point = series[pointIndex];
    const chartPoint = pointToChart(point, pointIndex);
    setHover({ point, x: chartPoint.x, y: chartPoint.y });
  }

  function updateFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (!thresholdEnabled || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const svgY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 260;
    const y = clamp(svgY, plot.top, plot.bottom);
    const nextValue = max - ((y - plot.top) / plotHeight) * span;
    const rounded = roundAlertThreshold(nextValue, clause.metric, meta.unit, span);
    onChange(clause.condition === "absGt" ? Math.abs(rounded) : rounded);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!thresholdEnabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateHoverFromPointer(event);
    updateFromPointer(event);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    updateHoverFromPointer(event);
    if (!dragging) return;
    updateFromPointer(event);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function handlePointerLeave() {
    if (!dragging) setHover(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!thresholdEnabled) return;
    const step = metricStep(meta.unit, span, clause.metric);
    let nextValue = thresholdValue;
    if (event.key === "ArrowUp") nextValue += step;
    else if (event.key === "ArrowDown") nextValue -= step;
    else if (event.key === "PageUp") nextValue += step * 10;
    else if (event.key === "PageDown") nextValue -= step * 10;
    else if (event.key === "Home") nextValue = min;
    else if (event.key === "End") nextValue = max;
    else return;
    event.preventDefault();
    const rounded = roundAlertThreshold(clamp(nextValue, min, max), clause.metric, meta.unit, span);
    onChange(clause.condition === "absGt" ? Math.abs(rounded) : rounded);
  }

  return (
    <article className={dragging ? "threshold-picker dragging" : "threshold-picker"}>
      <div className="threshold-head">
        <div>
          <span>Interactive threshold chart</span>
          <strong>{meta.label}</strong>
        </div>
        <em className={hit ? "triggered" : ""}>{hit ? "condition met" : "waiting"}</em>
      </div>

      <div className="threshold-readout">
        <div>
          <span>{needsLiveCandles ? (chartStatus === "live" ? "Live HYPE candles" : chartStatus === "loading" ? "Loading HYPE candles" : "Live candles unavailable") : "Derived metric"}</span>
          <strong>{activeHover ? formatMetricValue(activeHover.point.value, meta.unit) : formatMetricValue(currentValue, meta.unit)}</strong>
        </div>
        <div>
          <span>Pointer</span>
          <strong>{activeHover?.point.label || "Now"}</strong>
        </div>
      </div>

      <div className="threshold-tools" aria-label="Chart controls">
        <div className="threshold-ranges">
          {ALERT_CHART_RANGES.map((item: AlertChartRange) => (
            <button className={range === item ? "active" : ""} key={item} onClick={() => setRange(item)}>{item}</button>
          ))}
        </div>
        <div className="threshold-zoom">
          <button onClick={() => setZoomLevel((current: number) => Math.max(0, current - 1))}>-</button>
          <span>{zoomLevel === 0 ? "Fit" : `${zoomLevel + 1}x`}</span>
          <button onClick={() => setZoomLevel((current: number) => Math.min(2, current + 1))}>+</button>
        </div>
      </div>

      <div
        className={thresholdEnabled ? "threshold-chart" : "threshold-chart disabled"}
        ref={chartRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={thresholdEnabled ? 0 : -1}
        aria-disabled={!thresholdEnabled}
        aria-label={`${meta.label} alert threshold`}
        aria-valuenow={thresholdValue}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <svg viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
          <line x1={plot.left} x2={plot.right} y1={plot.top} y2={plot.top} className="grid-line" />
          <line x1={plot.left} x2={plot.right} y1={plot.top + plotHeight / 2} y2={plot.top + plotHeight / 2} className="grid-line" />
          <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="grid-line" />
          <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} className="axis-line" />
          <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="axis-line" />
          <polyline points={points} className="threshold-series" />
          {clause.condition === "absGt" ? <line x1={plot.left} x2={plot.right} y1={mirrorY} y2={mirrorY} className="threshold-mirror" /> : null}
          {thresholdEnabled ? <line x1={plot.left} x2={plot.right} y1={thresholdY} y2={thresholdY} className="threshold-rule" /> : null}
          <line x1={plot.left} x2={plot.right} y1={currentY} y2={currentY} className="threshold-current" />
          {activeHover ? <line x1={activeHover.x} x2={activeHover.x} y1={plot.top} y2={plot.bottom} className="threshold-crosshair" /> : null}
          {activeHover ? <circle cx={activeHover.x} cy={activeHover.y} r="8" className="threshold-hover-dot" /> : null}
          {thresholdEnabled ? <circle cx="930" cy={thresholdY} r="13" className="threshold-handle" /> : null}
          <text x="10" y={plot.top + 5} className="axis-text">{formatMetricValue(max, meta.unit)}</text>
          <text x="10" y={plot.top + plotHeight / 2 + 5} className="axis-text">{formatMetricValue(midValue, meta.unit)}</text>
          <text x="10" y={plot.bottom + 5} className="axis-text">{formatMetricValue(min, meta.unit)}</text>
          <text x={plot.left} y="253" className="axis-text x-axis">{firstPoint?.label || "Start"}</text>
          <text x={plot.left + plotWidth / 2} y="253" className="axis-text x-axis middle">{middlePoint?.label || rangeLabel(range)}</text>
          <text x={plot.right} y="253" className="axis-text x-axis end">{lastPoint?.label || "Now"}</text>
        </svg>
        <div className="threshold-current-label" style={{ top: `${(currentY / 260) * 100}%` }}>
          live {formatMetricValue(currentValue, meta.unit)}
        </div>
        {thresholdEnabled ? (
          <div className="threshold-target-label" style={{ top: `${(thresholdY / 260) * 100}%` }}>
            alert {formatMetricValue(thresholdValue, meta.unit)}
          </div>
        ) : null}
      </div>

      <div className="threshold-footer">
        <div>
          <span>Y axis</span>
          <strong>{meta.label} / {meta.unit.toUpperCase()}</strong>
        </div>
        <div>
          <span>X axis</span>
          <strong>{rangeLabel(range)} / {series.length} candles</strong>
        </div>
        <div>
          <span>Condition</span>
          <strong>{conditionLabel(clause.condition)}</strong>
        </div>
        <div>
          <span>Alert level</span>
          <strong>{thresholdEnabled ? formatMetricValue(thresholdValue, meta.unit) : "No number needed"}</strong>
        </div>
      </div>
      <p>
        {thresholdEnabled
          ? "Drag the mint line to set the alert level. Use the range buttons for time and +/- to zoom the vertical scale."
          : "This condition only checks whether the metric is positive or negative, so it does not need a manual level."}
      </p>
    </article>
  );
}

function AlertPreview({ rule, snapshot }: { rule: AlertRule; snapshot: MetricSnapshot }) {
  const triggered = evaluateRule(rule, snapshot);
  return (
    <article className={triggered ? "alert-preview triggered" : "alert-preview"}>
      <div>
        <span>{triggered ? "Triggered now" : "Waiting"}</span>
        <strong>{rule.name || "Untitled rule"}</strong>
      </div>
      <p>{alertSummary(rule, snapshot)}</p>
      <small>
        Interpretation: {triggered
          ? "All required market-structure conditions are active. This would send a Telegram alert in the production version."
          : "The rule is valid, but current market data does not satisfy the full condition set."}
      </small>
    </article>
  );
}

function SavedRuleCard({
  rule,
  snapshot,
  onToggle,
  onDelete,
}: {
  rule: AlertRule;
  snapshot: MetricSnapshot;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const triggered = evaluateRule(rule, snapshot);
  return (
    <article className={triggered ? "saved-rule triggered" : "saved-rule"}>
      <div className="saved-rule-head">
        <div>
          <span>{rule.enabled ? "Enabled" : "Paused"} / {triggered ? "Triggered" : "Waiting"}</span>
          <strong>{rule.name}</strong>
        </div>
        <div className="saved-rule-actions">
          <button onClick={onToggle}>{rule.enabled ? "Pause" : "Enable"}</button>
          <button className="small-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <p>{alertSummary(rule, snapshot)}</p>
      <small>Cooldown {rule.cooldownMinutes} min / delivery {rule.delivery === "browser" ? "browser MVP" : "Telegram-ready"}</small>
    </article>
  );
}

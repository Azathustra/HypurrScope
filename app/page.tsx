"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type View = "overview" | "statistics" | "twaps" | "etf" | "dats" | "nfts" | "exchange" | "alerts" | "wallet" | "markets" | "liquidity" | "hip3" | "hip4" | "builder";
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
  open?: number;
  high?: number;
  low?: number;
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

type UserProfile = {
  displayName: string;
  email: string;
  telegram: string;
};

type ExchangeRow = {
  name: string;
  category: "CEX" | "DEX";
  volumeUsd: number;
  marketShare: number;
  status: string;
};

type DatRow = {
  name: string;
  ticker: string;
  asset: "BTC" | "ETH";
  strategy: string;
  signal: string;
  risk: string;
  url: string;
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
type AlertPresetKind = "longSqueeze" | "twapWeakness";

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

type AlertChartRange = "5m" | "1h" | "1d" | "2d" | "7d" | "30d" | "90d" | "1y" | "all";
type AlertChartStatus = "loading" | "live" | "fallback";

const HYPE_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const LIGHTWEIGHT_CHARTS_URL = "https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js";
const HYPE_GENESIS_TIME = Date.UTC(2024, 10, 29);
let lightweightChartsLoader: Promise<any> | null = null;

const NAV_ITEMS: Array<{ id: View; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Dashboard" },
  { id: "statistics", label: "Statistics", description: "HYPE / BTC / ETH" },
  { id: "twaps", label: "TWAPs", description: "Flow tape" },
  { id: "etf", label: "ETF flows", description: "TradFi bridge" },
  { id: "dats", label: "DATs", description: "Crypto treasuries" },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor + sales" },
  { id: "exchange", label: "Exchange", description: "Venue share" },
  { id: "alerts", label: "Alerts", description: "Rule engine" },
  { id: "wallet", label: "Wallet scanner", description: "Risk scan" },
];

const ALERT_METRICS: MetricMeta[] = [
  { key: "hypePrice", label: "Asset price", unit: "usd", description: "Current selected asset mark price." },
  { key: "hypeChange24h", label: "Asset 24h change", unit: "pct", description: "Daily price change for the selected asset." },
  { key: "hypeFunding", label: "Asset funding", unit: "pct", description: "Funding rate converted to percent." },
  { key: "hypeOpenInterest", label: "Asset open interest", unit: "usd", description: "Selected asset perp OI in dollars." },
  { key: "hypeVolume", label: "Asset volume", unit: "usd", description: "Selected asset 24h perp volume." },
  { key: "twapNet", label: "TWAP net pressure", unit: "usd", description: "Buy TWAP notional minus sell TWAP notional." },
  { key: "twapSell", label: "TWAP sell pressure", unit: "usd", description: "Detected sell-side TWAP notional." },
  { key: "bookSpread", label: "Book spread", unit: "pct", description: "Visible best bid/ask spread." },
  { key: "bookImbalance", label: "Book imbalance", unit: "pct", description: "Bid depth minus ask depth as percent." },
  { key: "hypeVsBtc30d", label: "Asset vs benchmark 30d", unit: "pct", description: "Selected asset return minus benchmark return." },
  { key: "etfNetFlow", label: "ETF net flow", unit: "usd", description: "Latest ETF/ETP flow proxy." },
  { key: "nftSales24h", label: "Hypurr NFT sales", unit: "number", description: "Reported collection sales in 24h." },
];

const DEFAULT_COINS = ["HYPE", "BTC", "ETH"];
const ALERT_CHART_RANGES: AlertChartRange[] = ["5m", "1h", "1d", "2d", "7d", "30d", "90d", "1y", "all"];

function initialView(): View {
  if (typeof window === "undefined") return "overview";
  const saved = window.localStorage.getItem("hypurrscope-active-view");
  return NAV_ITEMS.some((item) => item.id === saved) ? (saved as View) : "overview";
}

function initialCoin() {
  if (typeof window === "undefined") return "HYPE";
  const saved = window.localStorage.getItem("hypurrscope-active-asset");
  return DEFAULT_COINS.includes(saved || "") ? saved || "HYPE" : "HYPE";
}

function initialUserProfile(): UserProfile {
  if (typeof window === "undefined") return { displayName: "", email: "", telegram: "" };
  try {
    const saved = window.localStorage.getItem("hypurrscope-user-profile");
    if (!saved) return { displayName: "", email: "", telegram: "" };
    const parsed = JSON.parse(saved);
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      telegram: typeof parsed.telegram === "string" ? parsed.telegram : "",
    };
  } catch {
    return { displayName: "", email: "", telegram: "" };
  }
}

function benchmarkForAsset(asset: string) {
  return asset === "BTC" ? "ETH" : "BTC";
}

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

const DAT_ROWS: DatRow[] = [
  {
    name: "Strategy",
    ticker: "MSTR",
    asset: "BTC",
    strategy: "Largest public BTC treasury proxy.",
    signal: "Watch BTC per share, mNAV, issuance, and leverage.",
    risk: "Premium compression and debt/refinancing sensitivity.",
    url: "https://www.strategy.com/",
  },
  {
    name: "Metaplanet",
    ticker: "3350.T",
    asset: "BTC",
    strategy: "Japan-listed Bitcoin treasury accumulation vehicle.",
    signal: "Watch purchase cadence, BTC yield, and yen financing.",
    risk: "Equity premium can move faster than BTC holdings.",
    url: "https://metaplanet.jp/",
  },
  {
    name: "BitMine Immersion",
    ticker: "BMNR",
    asset: "ETH",
    strategy: "Ethereum treasury strategy with staking/yield angle.",
    signal: "Watch ETH holdings, staking yield, and ETH beta.",
    risk: "ETH drawdowns plus operating-company execution risk.",
    url: "https://bitminetech.io/",
  },
  {
    name: "SharpLink",
    ticker: "SBET",
    asset: "ETH",
    strategy: "Public-market ETH treasury and onchain yield narrative.",
    signal: "Watch ETH reserve growth, validator yield, and dilution.",
    risk: "ETH treasury premium depends on sustained market demand.",
    url: "https://www.sharplink.com/",
  },
  {
    name: "MARA Holdings",
    ticker: "MARA",
    asset: "BTC",
    strategy: "Bitcoin miner with large BTC balance sheet exposure.",
    signal: "Watch mined BTC, treasury retention, and energy margins.",
    risk: "Mining economics add operational risk to treasury exposure.",
    url: "https://www.mara.com/",
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
    const close = base + wave;
    const open = close - Math.sin(index / 3) * 0.28;
    const high = Math.max(open, close) + 0.16 + Math.abs(Math.cos(index / 5)) * 0.18;
    const low = Math.min(open, close) - 0.16 - Math.abs(Math.sin(index / 6)) * 0.18;
    return {
      time: Date.now() - (79 - index) * 15 * 60_000,
      open,
      high,
      low,
      close,
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
    const open = close - Math.sin(index / 2.4) * (coin === "BTC" ? 700 : 0.55);
    const high = Math.max(open, close) + (coin === "BTC" ? 450 : 0.35);
    const low = Math.min(open, close) - (coin === "BTC" ? 450 : 0.35);
    return {
      time: Date.now() - (29 - index) * 24 * 60 * 60_000,
      open,
      high,
      low,
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

function makeCustomDraftRule(snapshot?: MetricSnapshot): AlertRule {
  return makePresetRule("My custom alert", [
    makeClause({
      metric: "hypePrice",
      condition: "gt",
      value: snapshot ? defaultAlertValue("hypePrice", snapshot) : 50,
      join: "AND",
    }),
  ]);
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

function loadLightweightCharts() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser chart unavailable"));
  const existing = (window as any).LightweightCharts;
  if (existing) return Promise.resolve(existing);
  if (lightweightChartsLoader) return lightweightChartsLoader;

  lightweightChartsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LIGHTWEIGHT_CHARTS_URL;
    script.async = true;
    script.onload = () => {
      const loaded = (window as any).LightweightCharts;
      if (loaded) resolve(loaded);
      else reject(new Error("Lightweight Charts did not initialize"));
    };
    script.onerror = () => reject(new Error("Unable to load Lightweight Charts"));
    document.head.appendChild(script);
  });
  return lightweightChartsLoader;
}

function tradingViewTimeLabel(value: unknown) {
  if (typeof value === "number") return dailyLabel(value * 1000);
  if (typeof value === "string") return value;
  const item = value as { year?: number; month?: number; day?: number };
  if (item?.year && item?.month && item?.day) return `${item.month}/${item.day}`;
  return "Pointer";
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
  if (range === "30d") return 30 * 24 * 60 * 60_000;
  if (range === "90d") return 90 * 24 * 60 * 60_000;
  if (range === "1y") return 365 * 24 * 60 * 60_000;
  return Math.max(30 * 24 * 60 * 60_000, Date.now() - HYPE_GENESIS_TIME);
}

function rangeLabel(range: AlertChartRange) {
  if (range === "5m") return "5 minutes";
  if (range === "1h") return "1 hour";
  if (range === "1d") return "1 day";
  if (range === "2d") return "2 days";
  if (range === "7d") return "7 days";
  if (range === "30d") return "30 days";
  if (range === "90d") return "90 days";
  if (range === "1y") return "1 year";
  return "All history";
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
  if (range === "2d") return "15m";
  if (range === "7d") return "1h";
  if (range === "30d") return "4h";
  if (range === "90d") return "12h";
  return "1d";
}

function usesLongHypeHistory(range: AlertChartRange) {
  return range === "30d" || range === "90d" || range === "1y" || range === "all";
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
    .map((row: any) => {
      const close = n(row.c || row.close);
      const open = n(row.o || row.open) || close;
      const high = n(row.h || row.high) || Math.max(open, close);
      const low = n(row.l || row.low) || Math.min(open, close);
      return {
        time: n(row.t || row.time || row.timestamp),
        open,
        high,
        low,
        close,
        volume: n(row.v || row.volume),
      } satisfies Candle;
    })
    .filter((row: Candle) => row.time > 0 && row.close > 0)
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-1500);
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
  const [view, setView] = useState<View>(initialView);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [coin, setCoin] = useState(initialCoin);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
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
  const [selectedClauseId, setSelectedClauseId] = useState("draft-custom-1");
  const [draftRule, setDraftRule] = useState<AlertRule>({
    id: "draft",
    name: "My custom alert",
    clauses: [
      { id: "draft-custom-1", metric: "hypePrice", condition: "gt", value: 50, join: "AND" },
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
    window.localStorage.setItem("hypurrscope-active-view", view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem("hypurrscope-active-asset", coin);
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
  }, [coin]);

  useEffect(() => {
    try {
      window.localStorage.setItem("hypurrscope-alert-rules", JSON.stringify(alertRules));
    } catch {
      return;
    }
  }, [alertRules]);

  useEffect(() => {
    try {
      window.localStorage.setItem("hypurrscope-user-profile", JSON.stringify(userProfile));
    } catch {
      return;
    }
  }, [userProfile]);

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
      const benchmark = benchmarkForAsset(coin);
      const [assetPayload, benchmarkPayload] = await Promise.all([
        postInfo({ type: "candleSnapshot", req: { coin, interval: "1d", startTime, endTime: now } }),
        postInfo({ type: "candleSnapshot", req: { coin: benchmark, interval: "1d", startTime, endTime: now } }),
      ]);
      const nextAsset = normalizeCandles(assetPayload);
      const nextBenchmark = normalizeCandles(benchmarkPayload);
      if (nextAsset.length) setHypeDaily(nextAsset.slice(-30));
      if (nextBenchmark.length) setBtcDaily(nextBenchmark.slice(-30));
      setStatsStatus("live");
    } catch {
      setHypeDaily(makeFallbackDailyCandles(coin));
      setBtcDaily(makeFallbackDailyCandles(benchmarkForAsset(coin)));
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
  const benchmarkCoin = benchmarkForAsset(coin);
  const assetReturn30d = hypeDaily.length > 1 ? ((hypeDaily[hypeDaily.length - 1].close - hypeDaily[0].close) / hypeDaily[0].close) * 100 : 0;
  const benchmarkReturn30d = btcDaily.length > 1 ? ((btcDaily[btcDaily.length - 1].close - btcDaily[0].close) / btcDaily[0].close) * 100 : 0;
  const relativeStrength = assetReturn30d - benchmarkReturn30d;
  const estimatedRevenue30d = revenueSeries.reduce((sum: number, item: Candle) => sum + item.close, 0);
  const avgDailyRevenue = revenueSeries.length ? estimatedRevenue30d / revenueSeries.length : 0;
  const alertSnapshot: MetricSnapshot = {
    hypePrice: selected?.price || 0,
    hypeChange24h: selected?.changePct || 0,
    hypeFunding: (selected?.funding || 0) * 100,
    hypeOpenInterest: selected?.oiUsd || 0,
    hypeVolume: selected?.volumeUsd || 0,
    twapNet,
    twapSell,
    bookSpread: book?.spreadPct || 0,
    bookImbalance: book?.imbalance || 0,
    hypeVsBtc30d: relativeStrength,
    etfNetFlow,
    nftSales24h: Number(nftStats.sales24h.replace(/,/g, "")) || 0,
  };
  const activeAlertCount = alertRules.filter((rule: AlertRule) => evaluateRule(rule, alertSnapshot)).length;
  const enabledRuleCount = alertRules.filter((rule: AlertRule) => rule.enabled).length;
  const accountName = userProfile.displayName.trim() || userProfile.email.trim() || "Guest";
  const telegramHandle = userProfile.telegram.trim().replace(/^@/, "");
  const isAccountReady = Boolean(userProfile.displayName.trim() || userProfile.email.trim());
  const selectedDraftClause = draftRule.clauses.find((clause: AlertClause) => clause.id === selectedClauseId) || draftRule.clauses[0];
  const regimeScore = Math.round(
    clamp(Math.abs(weightedFunding) * 60_000 + Math.abs(selected?.changePct || 0) * 2 + Math.abs(book?.imbalance || 0) * 0.2, 0, 99),
  );
  const regime = regimeScore > 65 ? "Volatile" : regimeScore > 35 ? "Active" : "Balanced";
  const marketOptions = DEFAULT_COINS;

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

  const alertPresetCards: Array<{ kind: AlertPresetKind; title: string; tag: string; body: string; checks: string[] }> = [
    {
      kind: "longSqueeze",
      title: "Long squeeze early warning",
      tag: "Leverage risk",
      body: "Positive funding, heavy OI, and sell TWAP pressure line up before a crowded long unwind.",
      checks: [`${coin} funding > 0.04%`, `${coin} OI > $800M`, "TWAP net < -$1.5M"],
    },
    {
      kind: "twapWeakness",
      title: "TWAP sell + relative weakness",
      tag: "Flow reversal",
      body: `Large sell TWAPs matter more when ${coin} is already weak versus ${benchmarkCoin} and volume is active.`,
      checks: ["Sell TWAP > $2M", `${coin} 24h < -1%`, `${coin} vs ${benchmarkCoin} 30d < -2%`],
    },
  ];

  function loadPreset(kind: AlertPresetKind) {
    const presets: Record<AlertPresetKind, AlertRule> = {
      longSqueeze: makePresetRule("Long squeeze early warning", [
        makeClause({ metric: "hypeFunding", condition: "gt", value: 0.04, join: "AND" }),
        makeClause({ metric: "hypeOpenInterest", condition: "gt", value: 800_000_000, join: "AND" }),
        makeClause({ metric: "twapNet", condition: "lt", value: -1_500_000, join: "AND" }),
      ]),
      twapWeakness: makePresetRule("TWAP sell + relative weakness", [
        makeClause({ metric: "twapSell", condition: "gt", value: 2_000_000, join: "AND" }),
        makeClause({ metric: "hypeChange24h", condition: "lt", value: -1, join: "AND" }),
        makeClause({ metric: "hypeVsBtc30d", condition: "lt", value: -2, join: "AND" }),
        makeClause({ metric: "hypeVolume", condition: "gt", value: 400_000_000, join: "AND" }),
      ]),
    };
    const preset = { ...presets[kind], id: "draft" };
    setDraftRule(preset);
    setSelectedClauseId(preset.clauses[0]?.id || "");
  }

  function createCustomRule() {
    const custom = { ...makeCustomDraftRule(alertSnapshot), id: "draft" };
    setDraftRule(custom);
    setSelectedClauseId(custom.clauses[0]?.id || "");
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
            <label>
              Asset
              <select value={coin} onChange={(event) => setCoin(event.target.value)}>
                {marketOptions.map((symbol: string) => (
                  <option value={symbol} key={symbol}>{symbol}</option>
                ))}
              </select>
            </label>
            <button className="theme-toggle icon-only" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}>
              {theme === "dark" ? (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M21 14.6A8.2 8.2 0 0 1 9.4 3a7 7 0 1 0 11.6 11.6Z" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
                </svg>
              )}
            </button>
            <button className="account-button" onClick={() => setView("alerts")}>
              <span>{isAccountReady ? accountName.slice(0, 1).toUpperCase() : "?"}</span>
              <strong>{isAccountReady ? accountName : "Connect"}</strong>
            </button>
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
                  Combine funding, OI, TWAP pressure, liquidity, relative strength, ETF flow, and NFT demand into
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
              <Kpi label="Saved rules" value={String(alertRules.length)} detail={isAccountReady ? `Local account: ${accountName}` : "Create an account below"} />
              <Kpi label="Triggered now" value={String(activeAlertCount)} detail="Evaluated against the current market snapshot" tone={activeAlertCount ? "negative" : "positive"} />
              <Kpi label="Metrics available" value={String(ALERT_METRICS.length)} detail="Funding, OI, TWAP, liquidity, ETF, NFT, relative strength" />
              <Kpi label="Delivery" value={telegramHandle ? "Telegram ready" : "Browser now"} detail={telegramHandle ? `@${telegramHandle} linked locally` : "Add Telegram below"} />
            </section>

            <section className="alert-layout">
              <Panel title="Alert presets" subtitle="Two practical market-structure rules to start from, then the builder below lets users customize everything.">
                <div className="featured-presets">
                  {alertPresetCards.map((preset) => (
                    <button className="preset-card" key={preset.kind} onClick={() => loadPreset(preset.kind)}>
                      <span>{preset.tag}</span>
                      <strong>{preset.title}</strong>
                      <p>{preset.body}</p>
                      <ul>
                        {preset.checks.map((check) => <li key={check}>{check}</li>)}
                      </ul>
                    </button>
                  ))}
                </div>

                <div className="create-own-card">
                  <div>
                    <span>Start clean</span>
                    <strong>Create your own alert</strong>
                    <p>Reset the builder to one simple WHEN condition, then add your own AND / OR filters.</p>
                  </div>
                  <button className="secondary" onClick={createCustomRule}>Create your own</button>
                </div>

                <div className="custom-builder-head">
                  <span>Custom alert builder</span>
                  <strong>{draftRule.name}</strong>
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
                    asset={coin}
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
              <Panel title="My alerts" subtitle={isAccountReady ? `${enabledRuleCount} enabled rules attached to ${accountName}.` : "Create a local account to make this feel like a personal alert desk."}>
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

              <Panel title="Account & Telegram" subtitle="Local account now, backend-ready flow later: Supabase user, Telegram chat_id, scheduled alert worker.">
                <div className="account-card">
                  <div className="account-summary">
                    <span>{isAccountReady ? "Connected locally" : "Guest mode"}</span>
                    <strong>{accountName}</strong>
                    <small>{telegramHandle ? `Telegram: @${telegramHandle}` : "Telegram not linked yet"}</small>
                  </div>
                  <label>
                    Display name
                    <input
                      placeholder="Azathustra"
                      value={userProfile.displayName}
                      onChange={(event) => setUserProfile((current) => ({ ...current, displayName: event.target.value }))}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={userProfile.email}
                      onChange={(event) => setUserProfile((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label>
                    Telegram username
                    <input
                      placeholder="@username"
                      value={userProfile.telegram}
                      onChange={(event) => setUserProfile((current) => ({ ...current, telegram: event.target.value }))}
                    />
                  </label>
                  <div className="account-flow">
                    <div><strong>1. Account</strong><span>Rules are tied to this local profile for the MVP.</span></div>
                    <div><strong>2. Telegram</strong><span>Username is stored now; production stores chat_id after bot verification.</span></div>
                    <div><strong>3. Alerts</strong><span>Saved rules become server-side checks every minute.</span></div>
                  </div>
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "statistics" && (
          <>
            <ViewHeader eyebrow="Analytics lab" title={`${coin} statistics dashboard`} />
            <section className="kpi-grid">
              <Kpi label={`${coin} 30d`} value={formatPct(assetReturn30d, 2)} detail="Daily candle return" tone={assetReturn30d >= 0 ? "positive" : "negative"} />
              <Kpi label={`${benchmarkCoin} 30d`} value={formatPct(benchmarkReturn30d, 2)} detail="Benchmark return" tone={benchmarkReturn30d >= 0 ? "positive" : "negative"} />
              <Kpi label="Relative strength" value={formatPct(relativeStrength, 2)} detail={`${coin} return minus ${benchmarkCoin} return`} tone={relativeStrength >= 0 ? "positive" : "negative"} />
              <Kpi label="Revenue proxy 30d" value={formatUsd(estimatedRevenue30d)} detail={`${sourceLabel(statsStatus)} candles, fee-pressure model`} />
            </section>
            <section className="stats-grid">
              <Panel title={`${coin} vs ${benchmarkCoin} normalized performance`} subtitle="Both assets start at 100. This makes relative strength readable immediately.">
                <DualLineChart primary={hypeDaily} secondary={btcDaily} primaryLabel={coin} secondaryLabel={benchmarkCoin} />
              </Panel>
              <Panel title="Hyperliquid revenue / fee-pressure proxy" subtitle="Estimated from Hyperliquid volume and a transparent fee-rate model.">
                <RevenueChart series={revenueSeries} />
              </Panel>
              <Panel title="Volume and OI structure" subtitle="A market-quality read inspired by exchange screener dashboards.">
                <StructureChart markets={markets} />
              </Panel>
              <Panel title="Statistics read" subtitle="A compact interpretation layer so the page feels like a product, not a raw chart dump.">
                <div className="signals">
                  <Signal label="Relative trend" value={formatPct(relativeStrength, 2)} body={relativeStrength >= 0 ? `${coin} has outperformed ${benchmarkCoin} over the sampled daily window.` : `${coin} is underperforming ${benchmarkCoin} over the sampled daily window.`} tone={relativeStrength >= 0 ? "good" : "watch"} />
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

        {view === "dats" && (
          <>
            <ViewHeader eyebrow="Digital asset treasuries" title="DAT accumulation monitor" />
            <section className="kpi-grid">
              <Kpi label="Tracked DATs" value={String(DAT_ROWS.length)} detail="Public companies with crypto treasury narratives" />
              <Kpi label="BTC vehicles" value={String(DAT_ROWS.filter((row) => row.asset === "BTC").length)} detail="Bitcoin treasury exposure" />
              <Kpi label="ETH vehicles" value={String(DAT_ROWS.filter((row) => row.asset === "ETH").length)} detail="Ethereum treasury exposure" />
              <Kpi label="Use case" value="mNAV watch" detail="Compare market cap premium versus crypto holdings" />
            </section>
            <section className="two-col">
              <Panel title="Public DAT watchlist" subtitle="Companies accumulating crypto as a treasury strategy. Use this as a research map, not live audited holdings.">
                <div className="dat-grid">
                  {DAT_ROWS.map((row) => <DatCard row={row} key={`${row.ticker}-${row.asset}`} />)}
                </div>
              </Panel>
              <Panel title="How to read DATs" subtitle="The useful signal is not only holdings; it is premium, issuance, and accumulation cadence.">
                <div className="signals">
                  <Signal label="mNAV" value="Premium/discount" body="A DAT can move far away from the value of its crypto holdings. That premium is the main market signal." tone="watch" />
                  <Signal label="Accumulation" value="Cadence" body="Repeated purchases matter more when they are funded without destroying shareholder value." tone="good" />
                  <Signal label="Asset beta" value={coin} body="Use the top-right selector to compare HYPE/BTC/ETH market conditions beside the DAT narrative." tone="good" />
                  <Signal label="Risk" value="Dilution" body="Debt, convertibles, ATM issuance, and equity premium compression can dominate the crypto beta." tone="risk" />
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

function DatCard({ row }: { row: DatRow }) {
  return (
    <a className="dat-card" href={row.url} target="_blank" rel="noreferrer">
      <div>
        <span>{row.ticker}</span>
        <strong>{row.asset}</strong>
      </div>
      <h3>{row.name}</h3>
      <p>{row.strategy}</p>
      <small>{row.signal}</small>
      <em>{row.risk}</em>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

type ThresholdPickerProps = {
  clause: AlertClause;
  snapshot: MetricSnapshot;
  asset: string;
  candles: Candle[];
  hypeDaily: Candle[];
  btcDaily: Candle[];
  flowDays: FlowDay[];
  onChange: (value: number) => void;
};

function ThresholdPicker(props: ThresholdPickerProps) {
  if (props.clause.metric === "hypePrice") {
    return <HypePriceAlertChart {...props} />;
  }
  return <GenericThresholdPicker {...props} />;
}

function HypePriceAlertChart({ clause, snapshot, asset, onChange }: ThresholdPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const thresholdScaleSeriesRef = useRef<any>(null);
  const priceLineRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const thresholdRef = useRef(clause.value);
  const priceZoomRef = useRef(1);
  const priceRangeRef = useRef<{ minValue: number; maxValue: number } | null>(null);
  const priceAxisDragRef = useRef<{ y: number; minValue: number; maxValue: number } | null>(null);
  const chartPanRef = useRef<{ x: number; y: number; from: number; to: number; width: number; height: number; minValue: number; maxValue: number } | null>(null);
  const chartPanMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const chartPanUpRef = useRef<((event: MouseEvent) => void) | null>(null);
  const [range, setRange] = useState<AlertChartRange>("all");
  const [status, setStatus] = useState<AlertChartStatus>("loading");
  const [chartReady, setChartReady] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [hover, setHover] = useState<{ price: number; label: string } | null>(null);
  const [lineY, setLineY] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chartPanning, setChartPanning] = useState(false);
  const [priceZoom, setPriceZoom] = useState(1);
  const currentPrice = snapshot.hypePrice;
  const thresholdValue = Number.isFinite(clause.value) && clause.value > 0 ? clause.value : currentPrice;
  const hit = evaluateClause(clause, snapshot);
  thresholdRef.current = thresholdValue;

  function updateAlertLinePosition() {
    const series = candleSeriesRef.current;
    if (!series) return;
    const y = series.priceToCoordinate(thresholdRef.current);
    setLineY(typeof y === "number" && Number.isFinite(y) ? y : null);
  }

  function updateThresholdFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    const series = candleSeriesRef.current;
    if (!container || !series) return;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const price = series.coordinateToPrice(y);
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return;
    onChange(roundAlertThreshold(price, "hypePrice", "usd", Math.max(price * 0.12, 1)));
  }

  function visibleCandlesForScale() {
    const rangeInfo = chartApiRef.current?.timeScale?.().getVisibleRange?.();
    if (!rangeInfo?.from || !rangeInfo?.to) return candles.length ? candles : [];
    const from = Number(rangeInfo.from) * 1000;
    const to = Number(rangeInfo.to) * 1000;
    const visible = candles.filter((candle: Candle) => candle.time >= from && candle.time <= to);
    return visible.length ? visible : candles;
  }

  function basePriceRange() {
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (series && container) {
      const top = series.coordinateToPrice(0);
      const bottom = series.coordinateToPrice(container.clientHeight);
      if (typeof top === "number" && typeof bottom === "number" && Number.isFinite(top) && Number.isFinite(bottom)) {
        const minValue = Math.min(top, bottom, thresholdValue);
        const maxValue = Math.max(top, bottom, thresholdValue);
        if (maxValue > minValue) return { minValue, maxValue };
      }
    }
    if (priceRangeRef.current) return priceRangeRef.current;
    const rows = visibleCandlesForScale();
    if (!rows.length) {
      const center = currentPrice > 0 ? currentPrice : 1;
      const span = Math.max(center * 0.12, 1);
      return { minValue: Math.max(0.0001, center - span / 2), maxValue: center + span / 2 };
    }
    const lows = rows.map((candle: Candle) => candle.low ?? candle.close);
    const highs = rows.map((candle: Candle) => candle.high ?? candle.close);
    const minValue = Math.min(...lows, thresholdValue);
    const maxValue = Math.max(...highs, thresholdValue);
    const fallbackSpan = Math.max(maxValue - minValue, currentPrice * 0.08, 1);
    return maxValue > minValue ? { minValue, maxValue } : { minValue: currentPrice - fallbackSpan / 2, maxValue: currentPrice + fallbackSpan / 2 };
  }

  function applyPriceRange(minValue: number, maxValue: number) {
    const series = candleSeriesRef.current;
    if (!series || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) return;
    const safeMin = Math.max(0.0001, Math.min(minValue, maxValue - 0.0001));
    const safeMax = Math.max(safeMin + 0.0001, maxValue);
    priceRangeRef.current = { minValue: safeMin, maxValue: safeMax };
    series.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: safeMin, maxValue: safeMax },
        margins: { above: 10, below: 10 },
      }),
    });
    window.requestAnimationFrame(updateAlertLinePosition);
  }

  function applyManualPriceScale(nextZoom: number) {
    const baseRange = basePriceRange();
    const center = (baseRange.minValue + baseRange.maxValue) / 2;
    const baseSpan = Math.max(baseRange.maxValue - baseRange.minValue, center * 0.04, 1);
    const span = baseSpan / nextZoom;
    const minValue = Math.max(0.0001, center - span / 2);
    const maxValue = center + span / 2;
    applyPriceRange(minValue, maxValue);
    priceZoomRef.current = nextZoom;
    setPriceZoom(nextZoom);
  }

  function zoomPriceRange(factor: number, anchor?: number) {
    const range = basePriceRange();
    const minValue = range.minValue;
    const maxValue = range.maxValue;
    const pivot = Number.isFinite(anchor) && anchor ? anchor : (minValue + maxValue) / 2;
    applyPriceRange(
      pivot - (pivot - minValue) * factor,
      pivot + (maxValue - pivot) * factor,
    );
  }

  function resetPriceScale() {
    candleSeriesRef.current?.applyOptions?.({ autoscaleInfoProvider: undefined });
    priceRangeRef.current = null;
    priceZoomRef.current = 1;
    setPriceZoom(1);
    window.requestAnimationFrame(updateAlertLinePosition);
  }

  function handlePriceAxisWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    const series = candleSeriesRef.current;
    let anchor: number | undefined;
    if (container && series) {
      const rect = container.getBoundingClientRect();
      const price = series.coordinateToPrice(event.clientY - rect.top);
      if (typeof price === "number" && Number.isFinite(price)) anchor = price;
    }
    zoomPriceRange(event.deltaY < 0 ? 0.88 : 1.14, anchor);
  }

  function handlePriceAxisPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const range = basePriceRange();
    priceAxisDragRef.current = { y: event.clientY, minValue: range.minValue, maxValue: range.maxValue };
  }

  function handlePriceAxisPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!priceAxisDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const drag = priceAxisDragRef.current;
    const center = (drag.minValue + drag.maxValue) / 2;
    const factor = clamp(Math.exp((event.clientY - drag.y) / 220), 0.25, 4);
    applyPriceRange(center - ((center - drag.minValue) * factor), center + ((drag.maxValue - center) * factor));
  }

  function handlePriceAxisPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    priceAxisDragRef.current = null;
  }

  function detachChartPanListeners() {
    if (chartPanMoveRef.current) window.removeEventListener("mousemove", chartPanMoveRef.current);
    if (chartPanUpRef.current) window.removeEventListener("mouseup", chartPanUpRef.current);
    chartPanMoveRef.current = null;
    chartPanUpRef.current = null;
    chartPanRef.current = null;
  }

  function moveVisibleChart(clientX: number) {
    const pan = chartPanRef.current;
    const timeScale = chartApiRef.current?.timeScale?.();
    if (!pan || !timeScale) return;
    const span = Math.max(1, pan.to - pan.from);
    const barsMoved = ((clientX - pan.x) / pan.width) * span;
    timeScale.setVisibleLogicalRange?.({
      from: pan.from - barsMoved,
      to: pan.to - barsMoved,
    });
    window.requestAnimationFrame(updateAlertLinePosition);
  }

  function moveVisiblePriceScale(clientY: number) {
    const pan = chartPanRef.current;
    if (!pan) return;
    const span = Math.max(0.0001, pan.maxValue - pan.minValue);
    const priceShift = ((clientY - pan.y) / Math.max(1, pan.height)) * span;
    applyPriceRange(pan.minValue + priceShift, pan.maxValue + priceShift);
  }

  function handleChartPanMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const logicalRange = chartApiRef.current?.timeScale?.().getVisibleLogicalRange?.();
    if (!logicalRange || !Number.isFinite(logicalRange.from) || !Number.isFinite(logicalRange.to)) return;
    const range = basePriceRange();
    event.preventDefault();
    event.stopPropagation();
    detachChartPanListeners();
    chartPanRef.current = {
      x: event.clientX,
      y: event.clientY,
      from: Number(logicalRange.from),
      to: Number(logicalRange.to),
      width: Math.max(1, event.currentTarget.clientWidth),
      height: Math.max(1, event.currentTarget.clientHeight),
      minValue: range.minValue,
      maxValue: range.maxValue,
    };
    setChartPanning(true);

    const handleMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveVisibleChart(moveEvent.clientX);
      moveVisiblePriceScale(moveEvent.clientY);
    };
    const handleUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      detachChartPanListeners();
      setChartPanning(false);
    };
    chartPanMoveRef.current = handleMove;
    chartPanUpRef.current = handleUp;
    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp, { passive: false });
  }

  function handleChartPanWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const timeScale = chartApiRef.current?.timeScale?.();
    const logicalRange = timeScale?.getVisibleLogicalRange?.();
    if (!timeScale || !logicalRange || !Number.isFinite(logicalRange.from) || !Number.isFinite(logicalRange.to)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const from = Number(logicalRange.from);
    const to = Number(logicalRange.to);
    const span = Math.max(1, to - from);

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const shift = (event.deltaX / width) * span;
      timeScale.setVisibleLogicalRange?.({ from: from + shift, to: to + shift });
    } else {
      const anchorRatio = clamp((event.clientX - rect.left) / width, 0, 1);
      const anchor = from + span * anchorRatio;
      const factor = event.deltaY < 0 ? 0.86 : 1.16;
      timeScale.setVisibleLogicalRange?.({
        from: anchor - (anchor - from) * factor,
        to: anchor + (to - anchor) * factor,
      });
    }
    window.requestAnimationFrame(updateAlertLinePosition);
  }

  function handleTimeAxisWheel(event: React.WheelEvent<HTMLDivElement>) {
    handleChartPanWheel(event);
  }

  function handleChartWrapWheel(event: React.WheelEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".tv-chart-pan-layer") || target?.closest(".tv-time-axis-hitbox") || target?.closest(".tv-price-axis-hitbox")) return;
    handleChartPanWheel(event);
  }

  function handleAlertPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateThresholdFromPointer(event);
  }

  function handleAlertPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragging) updateThresholdFromPointer(event);
  }

  function handleAlertPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  useEffect(() => {
    if ((!Number.isFinite(clause.value) || clause.value <= 0) && currentPrice > 0) {
      onChange(defaultAlertValue("hypePrice", snapshot));
    }
  }, [clause.value, currentPrice, onChange, snapshot]);

  useEffect(() => {
    let disposed = false;

    async function setupChart() {
      try {
        const LightweightCharts = await loadLightweightCharts();
        if (disposed || !containerRef.current) return;
        const chart = LightweightCharts.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 360,
          layout: {
            background: { type: LightweightCharts.ColorType?.Solid || "solid", color: "#090d0b" },
            textColor: "#c7d2cc",
            fontSize: 12,
          },
          grid: {
            vertLines: { color: "rgba(255, 255, 255, 0.06)" },
            horzLines: { color: "rgba(255, 255, 255, 0.06)" },
          },
          rightPriceScale: {
            borderColor: "rgba(255, 255, 255, 0.18)",
            scaleMargins: { top: 0.12, bottom: 0.12 },
            autoScale: true,
            entireTextOnly: false,
          },
          timeScale: {
            borderColor: "rgba(255, 255, 255, 0.18)",
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 8,
            barSpacing: 8,
            fixLeftEdge: false,
            fixRightEdge: false,
          },
          crosshair: {
            mode: 0,
            vertLine: { color: "rgba(255, 255, 255, 0.32)", width: 1, style: 2 },
            horzLine: { color: "rgba(255, 255, 255, 0.32)", width: 1, style: 2 },
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
          handleScale: {
            axisPressedMouseMove: { time: true, price: true },
            axisDoubleClickReset: { time: true, price: true },
            mouseWheel: true,
            pinch: true,
          },
        });

        const candleSeries = chart.addCandlestickSeries({
          upColor: "#7cf7c7",
          downColor: "#ff6b82",
          borderUpColor: "#7cf7c7",
          borderDownColor: "#ff6b82",
          wickUpColor: "#7cf7c7",
          wickDownColor: "#ff6b82",
          priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          priceLineVisible: false,
          lastValueVisible: true,
        });

        const thresholdScaleSeries = chart.addLineSeries({
          color: "rgba(124, 247, 199, 0)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        chart.subscribeCrosshairMove((param: any) => {
          const item = candleSeriesRef.current ? param?.seriesData?.get(candleSeriesRef.current) : null;
          if (item?.close) {
            setHover({ price: n(item.close), label: tradingViewTimeLabel(param.time) });
          }
        });

        chart.timeScale().subscribeVisibleLogicalRangeChange(updateAlertLinePosition);
        resizeObserverRef.current = new ResizeObserver(() => {
          if (!containerRef.current) return;
          chart.applyOptions({ width: containerRef.current.clientWidth });
          window.requestAnimationFrame(updateAlertLinePosition);
        });
        resizeObserverRef.current.observe(containerRef.current);

        chartApiRef.current = chart;
        candleSeriesRef.current = candleSeries;
        thresholdScaleSeriesRef.current = thresholdScaleSeries;
        setChartReady(true);
      } catch {
        if (!disposed) setStatus("fallback");
      }
    }

    setupChart();
    return () => {
      disposed = true;
      detachChartPanListeners();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartApiRef.current?.remove?.();
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      thresholdScaleSeriesRef.current = null;
      priceLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCandles() {
      try {
      setStatus("loading");
      setHover(null);
      setCandles([]);
      setPriceZoom(1);
      priceRangeRef.current = null;
      candleSeriesRef.current?.applyOptions?.({ autoscaleInfoProvider: undefined });
        candleSeriesRef.current?.setData?.([]);
        let nextCandles: Candle[] = [];
        if (asset === "HYPE" && usesLongHypeHistory(range)) {
          const response = await fetch(`/api/hype/history?range=${range}`);
          if (response.ok) nextCandles = normalizeCandles(await response.json());
        }

        if (!nextCandles.length) {
          const now = Date.now();
          const payload = await postInfo({
            type: "candleSnapshot",
            req: {
              coin: asset,
              interval: alertCandleInterval(range),
              startTime: range === "all" ? HYPE_GENESIS_TIME : now - rangeMs(range),
              endTime: now,
            },
          });
          nextCandles = normalizeCandles(payload);
        }

        if (cancelled) return;
        setCandles(nextCandles);
        setStatus(nextCandles.length ? "live" : "fallback");
      } catch {
        if (!cancelled) {
          setCandles([]);
          setStatus("fallback");
        }
      }
    }
    loadCandles();
    return () => {
      cancelled = true;
    };
  }, [range, asset]);

  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || !chartApiRef.current) return;
    const data = candles.map((candle: Candle) => ({
      time: Math.floor(candle.time / 1000),
      open: candle.open ?? candle.close,
      high: candle.high ?? candle.close,
      low: candle.low ?? candle.close,
      close: candle.close,
    }));
    candleSeriesRef.current.setData(data);
    if (data.length) {
      chartApiRef.current.timeScale().fitContent();
      window.requestAnimationFrame(updateAlertLinePosition);
    }
  }, [candles, chartReady]);

  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || !thresholdScaleSeriesRef.current) return;
    const first = candles[0];
    const last = candles[candles.length - 1];
    if (first && last && thresholdValue > 0) {
      thresholdScaleSeriesRef.current.setData([
        { time: Math.floor(first.time / 1000), value: thresholdValue },
        { time: Math.floor(last.time / 1000), value: thresholdValue },
      ]);
    }
    if (!priceLineRef.current) {
      priceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: thresholdValue,
        color: "#7cf7c7",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `alert ${formatUsd(thresholdValue)}`,
      });
    } else {
      priceLineRef.current.applyOptions({
        price: thresholdValue,
        title: `alert ${formatUsd(thresholdValue)}`,
      });
    }
    window.requestAnimationFrame(updateAlertLinePosition);
  }, [thresholdValue, candles, chartReady]);

  return (
    <article className={`${dragging ? "tv-alert-card dragging" : "tv-alert-card"} ${chartPanning ? "panning" : ""}`}>
      <div className="threshold-head">
        <div>
          <span>TradingView-grade price chart</span>
          <strong>{asset} price</strong>
        </div>
        <em className={hit ? "triggered" : ""}>{hit ? "condition met" : "waiting"}</em>
      </div>
      <div className="threshold-readout">
        <div>
          <span>{status === "live" ? `Live ${asset} candles` : status === "loading" ? `Loading ${asset} candles` : "Chart fallback"}</span>
          <strong>{hover ? formatUsd(hover.price) : formatUsd(currentPrice)}</strong>
        </div>
        <div>
          <span>Alert level</span>
          <strong>{formatUsd(thresholdValue)}</strong>
        </div>
      </div>
      <div className="tv-range-row">
        {ALERT_CHART_RANGES.map((item: AlertChartRange) => (
          <button className={range === item ? "active" : ""} key={item} onClick={() => setRange(item)}>{item}</button>
        ))}
        <button onClick={() => chartApiRef.current?.timeScale?.().fitContent?.()}>Fit</button>
        <span className="tv-row-separator" />
        <button onClick={() => applyManualPriceScale(clamp(priceZoom * 0.85, 0.35, 8))}>Price -</button>
        <button onClick={() => applyManualPriceScale(clamp(priceZoom * 1.18, 0.35, 8))}>Price +</button>
        <button onClick={resetPriceScale}>Auto</button>
      </div>
      <div className="tv-chart-wrap" ref={containerRef} onWheelCapture={handleChartWrapWheel}>
        {lineY !== null ? (
          <div
            className="tv-alert-drag-line"
            style={{ top: `${lineY}px` }}
            onPointerDown={handleAlertPointerDown}
            onPointerMove={handleAlertPointerMove}
            onPointerUp={handleAlertPointerUp}
            onPointerCancel={handleAlertPointerUp}
          >
            <span>alert {formatUsd(thresholdValue)}</span>
          </div>
        ) : null}
        <div
          className="tv-chart-pan-layer"
          onMouseDown={handleChartPanMouseDown}
          onWheel={handleChartPanWheel}
          aria-label="Move price chart"
        />
        <div
          className="tv-time-axis-hitbox"
          onWheelCapture={handleTimeAxisWheel}
          aria-label="Time scale"
        />
        <div
          className="tv-price-axis-hitbox"
          onWheelCapture={handlePriceAxisWheel}
          onPointerDown={handlePriceAxisPointerDown}
          onPointerMove={handlePriceAxisPointerMove}
          onPointerUp={handlePriceAxisPointerUp}
          onPointerCancel={handlePriceAxisPointerUp}
          aria-label="Price scale"
        />
      </div>
      <div className="threshold-footer">
        <div>
          <span>Navigation</span>
          <strong>Drag/scroll chart</strong>
        </div>
        <div>
          <span>Set alert</span>
          <strong>Drag mint line</strong>
        </div>
        <div>
          <span>Price axis</span>
          <strong>Wheel/drag right</strong>
        </div>
        <div>
          <span>Range</span>
          <strong>{rangeLabel(range)}</strong>
        </div>
        <div>
          <span>Candles</span>
          <strong>{candles.length || "--"}</strong>
        </div>
      </div>
    </article>
  );
}

function GenericThresholdPicker({
  clause,
  snapshot,
  asset,
  candles,
  hypeDaily,
  btcDaily,
  flowDays,
  onChange,
}: ThresholdPickerProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [range, setRange] = useState<AlertChartRange>("1d");
  const [timeZoom, setTimeZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [panMode, setPanMode] = useState(false);
  const panStartRef = useRef<{ x: number; offset: number } | null>(null);
  const [liveSeries, setLiveSeries] = useState<MetricPoint[]>([]);
  const [liveCandles, setLiveCandles] = useState<Candle[]>([]);
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
  const fullSeries = liveSeries.length ? liveSeries : needsLiveCandles ? flatCurrentSeries : staticSeries;
  const visibleCount = Math.max(8, Math.min(fullSeries.length, Math.round(fullSeries.length / timeZoom)));
  const maxPanOffset = Math.max(0, fullSeries.length - visibleCount);
  const safePanOffset = Math.min(panOffset, maxPanOffset);
  const visibleStart = Math.max(0, fullSeries.length - visibleCount - safePanOffset);
  const visibleEnd = visibleStart + visibleCount;
  const series = fullSeries.slice(visibleStart, visibleEnd);
  const visibleLiveCandles = liveCandles.slice(visibleStart, visibleEnd);
  const thresholdEnabled = clause.condition !== "isPositive" && clause.condition !== "isNegative";
  const thresholdValue = clause.condition === "absGt" ? Math.abs(clause.value) : clause.value;
  const candleScaleValues = visibleLiveCandles.flatMap((candle: Candle) => [
    candle.high ?? candle.close,
    candle.low ?? candle.close,
    candle.open ?? candle.close,
    candle.close,
  ]);
  const values = series
    .map((point: MetricPoint) => point.value)
    .concat(candleScaleValues, currentValue, thresholdEnabled ? thresholdValue : currentValue, clause.condition === "absGt" ? -thresholdValue : currentValue);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minChartSpan = minimumChartSpan(clause.metric, meta.unit, currentValue);
  const rawSpan = Math.max(Math.abs(rawMax - rawMin), minChartSpan);
  const zoomFactor = 1;
  const center = thresholdEnabled ? (currentValue + thresholdValue) / 2 : currentValue;
  const halfSpan = Math.max(rawSpan * (0.62 * zoomFactor), minChartSpan * 0.35);
  const min = Math.min(rawMin, center - halfSpan);
  const max = Math.max(rawMax, center + halfSpan);
  const span = Math.max(0.000001, max - min);
  const plot = { left: 76, right: 970, top: 24, bottom: 230 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const yFor = (value: number) => clamp(plot.top + ((max - value) / span) * plotHeight, plot.top, plot.bottom);
  const points = series
    .map((point: MetricPoint, index: number) => {
      const x = plot.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : 0);
      return `${x},${yFor(point.value)}`;
    })
    .join(" ");
  const candleWidth = clamp((plotWidth / Math.max(1, series.length)) * 0.62, 3, 14);
  const thresholdY = yFor(thresholdValue);
  const mirrorY = yFor(-thresholdValue);
  const currentY = yFor(currentValue);
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
        setLiveCandles([]);
        setChartStatus("fallback");
        return;
      }
      try {
        setChartStatus("loading");
        const now = Date.now();
        const payload = await postInfo({
          type: "candleSnapshot",
          req: {
            coin: asset,
            interval: alertCandleInterval(range),
            startTime: now - rangeMs(range),
            endTime: now,
          },
        });
        if (cancelled) return;
        const nextCandles = normalizeCandles(payload);
        const nextSeries = candlesToMetricSeries(clause.metric, nextCandles, range);
        setLiveCandles(clause.metric === "hypePrice" ? nextCandles : []);
        setLiveSeries(nextSeries);
        setChartStatus(nextSeries.length ? "live" : "fallback");
      } catch {
        if (!cancelled) {
          setLiveSeries([]);
          setLiveCandles([]);
          setChartStatus("fallback");
        }
      }
    }
    loadLiveHypeCandles();
    return () => {
      cancelled = true;
    };
  }, [clause.metric, range, asset]);

  useEffect(() => {
    setPanOffset(0);
    setTimeZoom(1);
    setHover(null);
  }, [clause.metric, range]);

  useEffect(() => {
    setPanOffset((current: number) => clamp(current, 0, maxPanOffset));
  }, [maxPanOffset]);

  function pointToChart(point: MetricPoint, index: number) {
    const x = plot.left + (series.length > 1 ? (index / (series.length - 1)) * plotWidth : 0);
    return { x, y: yFor(point.value) };
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

  function shiftChart(delta: number) {
    setPanOffset((current: number) => clamp(current + delta, 0, maxPanOffset));
  }

  function zoomTime(nextZoom: number) {
    setTimeZoom(clamp(nextZoom, 1, 8));
    setPanOffset((current: number) => clamp(current, 0, maxPanOffset));
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
      zoomTime(timeZoom + (event.deltaY < 0 ? 0.5 : -0.5));
    } else {
      shiftChart(event.deltaX > 0 ? -3 : 3);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (panMode) {
      panStartRef.current = { x: event.clientX, offset: safePanOffset };
      return;
    }
    if (!thresholdEnabled) return;
    setDragging(true);
    updateHoverFromPointer(event);
    updateFromPointer(event);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    updateHoverFromPointer(event);
    if (panMode && panStartRef.current) {
      const deltaPx = event.clientX - panStartRef.current.x;
      const candlesMoved = Math.round((deltaPx / Math.max(1, chartRef.current?.clientWidth || 1)) * visibleCount);
      setPanOffset(clamp(panStartRef.current.offset + candlesMoved, 0, maxPanOffset));
      return;
    }
    if (!dragging) return;
    updateFromPointer(event);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panStartRef.current = null;
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
          <span>{needsLiveCandles ? (chartStatus === "live" ? `Live ${asset} candles` : chartStatus === "loading" ? `Loading ${asset} candles` : "Live candles unavailable") : "Derived metric"}</span>
          <strong>{activeHover ? formatMetricValue(activeHover.point.value, meta.unit) : formatMetricValue(currentValue, meta.unit)}</strong>
        </div>
        <div>
          <span>Pointer</span>
          <strong>{activeHover?.point.label || "Now"}</strong>
        </div>
      </div>

      <div className="threshold-tools" aria-label="Chart controls">
        <div className="threshold-mode">
          <button className={!panMode ? "active" : ""} onClick={() => setPanMode(false)}>Set alert</button>
          <button className={panMode ? "active" : ""} onClick={() => setPanMode(true)}>Move chart</button>
        </div>
        <div className="threshold-ranges">
          {ALERT_CHART_RANGES.map((item: AlertChartRange) => (
            <button className={range === item ? "active" : ""} key={item} onClick={() => setRange(item)}>{item}</button>
          ))}
        </div>
        <div className="threshold-pan">
          <button onClick={() => shiftChart(8)}>Left</button>
          <button onClick={() => shiftChart(-8)}>Right</button>
        </div>
        <div className="threshold-zoom">
          <button onClick={() => zoomTime(timeZoom - 0.5)}>Time -</button>
          <span>{timeZoom === 1 ? "Full" : `${timeZoom.toFixed(1)}x`}</span>
          <button onClick={() => zoomTime(timeZoom + 0.5)}>Time +</button>
        </div>
      </div>

      <div
        className={`${thresholdEnabled ? "threshold-chart" : "threshold-chart disabled"} ${panMode ? "pan-mode" : ""}`}
        ref={chartRef}
        onWheel={handleWheel}
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
          {clause.metric === "hypePrice" && visibleLiveCandles.length ? (
            <g className="price-candles">
              {visibleLiveCandles.map((candle: Candle, index: number) => {
                const x = plot.left + (visibleLiveCandles.length > 1 ? (index / (visibleLiveCandles.length - 1)) * plotWidth : 0);
                const open = candle.open ?? candle.close;
                const high = candle.high ?? Math.max(open, candle.close);
                const low = candle.low ?? Math.min(open, candle.close);
                const yOpen = yFor(open);
                const yClose = yFor(candle.close);
                const yHigh = yFor(high);
                const yLow = yFor(low);
                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                const up = candle.close >= open;
                return (
                  <g className={up ? "candle up" : "candle down"} key={`${candle.time}-${index}`}>
                    <line x1={x} x2={x} y1={yHigh} y2={yLow} />
                    <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1.5" />
                  </g>
                );
              })}
            </g>
          ) : (
            <polyline points={points} className="threshold-series" />
          )}
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
          <strong>{rangeLabel(range)} / {series.length} of {fullSeries.length}</strong>
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

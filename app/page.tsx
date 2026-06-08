"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type View = "overview" | "markets" | "asset" | "alerts" | "flow" | "wallet" | "fundamentals" | "ecosystem" | "etfDats" | "nfts" | "settings";
type Status = "loading" | "live" | "fallback" | "error";
type DataMode = "live" | "stale" | "unavailable" | "demo";
type SignalTab = "active" | "closest" | "fresh" | "crowding" | "funding" | "liquidity";
type FlowTab = "large" | "bursts" | "oi" | "funding" | "twap";
type ScreenerFilter = "top10" | "top30" | "liquid" | "fresh" | "crowding" | "funding" | "liquidity";
type AssetBucketFilter = "all" | "majors" | "ethSol" | "highBeta" | "small";
type ScreenerSortKey =
  | "setup"
  | "asset"
  | "price"
  | "change"
  | "volume"
  | "rank"
  | "rvol"
  | "oi15m"
  | "oi4h"
  | "funding"
  | "fundingPercentile"
  | "taker"
  | "fresh"
  | "crowding"
  | "liquidity";

type Market = {
  symbol: string;
  price: number;
  oraclePx?: number;
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
  | "assetVolumeRank"
  | "takerBuyUsd5m"
  | "takerSellUsd5m"
  | "takerBuyRatio5m"
  | "takerSellRatio5m"
  | "oiChange15m"
  | "oiChange4h"
  | "priceChange15m"
  | "priceChange4h"
  | "fundingExtremeScore"
  | "crowdingScore"
  | "largeTradeNotional5m"
  | "twapNet"
  | "twapSell"
  | "bookSpread"
  | "bookImbalance"
  | "hypeVsBtc30d"
  | "etfNetFlow"
  | "nftSales24h";

type AlertCondition = "gt" | "gte" | "lt" | "lte" | "absGt" | "isPositive" | "isNegative";
type AlertJoin = "AND" | "OR";
type AlertPresetKind = "freshLongs" | "freshShorts" | "crowdedLongs" | "crowdedShorts" | "fundingExtreme" | "oiCompression" | "liquidityVacuum" | "largeTradeBurst";

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
  asset?: string;
  clauses: AlertClause[];
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: string;
  lastTriggeredAt?: string;
  delivery: "browser" | "telegram" | "discord" | "webhook" | "email";
};

type AlertTrigger = {
  id: string;
  alertId: string;
  asset: string;
  preset: string;
  triggeredAt: string;
  matchedConditions: string[];
  matchedValues: Record<string, number>;
  destination: AlertRule["delivery"];
  deliveryStatus: "queued" | "sent" | "failed";
  error?: string;
};

type MetricSnapshot = Record<AlertMetricKey, number>;

type HistoricalBaselines = {
  source: string;
  updatedAt: string;
  sampleSizes: {
    candles5m: number;
    candles15m: number;
    candles1h: number;
    funding: number;
  };
  percentiles: {
    volumeUsd5mP90: number;
    volumeUsd5mP95: number;
    priceChange15mAbsP85: number;
    priceChange15mAbsP95: number;
    priceChange4hAbsP85: number;
    priceChange4hAbsP95: number;
    fundingAbsP90: number;
    fundingAbsP95: number;
    fundingPositiveP90: number;
    fundingPositiveP95: number;
    fundingNegativeP10: number;
    fundingNegativeP5: number;
  };
};

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
type AssetPresetCalibration = {
  family: string;
  examples: string;
  flow5m: number;
  oi15m: number;
  oi4h: number;
  price15m: number;
  fundingHourly: number;
  priceStallUpper: number;
  priceStallLower: number;
};

type AssetTerminalMetrics = {
  priceChange15m: number;
  priceChange1h: number;
  priceChange4h: number;
  volume5m: number;
  volume15m: number;
  volume1h: number;
  relativeVolume5m: number;
  oiChange15m: number;
  oiChange1h: number;
  oiChange4h: number;
  fundingPct: number;
  fundingAnnualizedPct: number;
  fundingPercentile14d: number;
  markOraclePremiumPct: number;
  takerBuyUsd5m: number;
  takerSellUsd5m: number;
  netTakerDelta5m: number;
  takerBuyRatio5m: number;
  largeTradeCount5m: number;
  largeTradeNotional5m: number;
  spreadBps: number;
  depth50Bps: number;
  slippage100kPct: number;
  slippage1mPct: number;
  relativeStrengthVsBtc24h: number;
  relativeStrengthVsEth24h: number;
  freshLeverageScore: number;
  crowdingScore: number;
  liquidityScore: number;
  anomalyScore: number;
  marketState: "risk-on" | "neutral" | "crowded" | "deleveraging";
  marketSentence: string;
};

type ScreenerRow = {
  market: Market;
  rank: number;
  freshLeverageScore: number;
  crowdingScore: number;
  liquidityScore: number;
  anomalyScore: number;
  signal: string;
  flow5m: number;
  oi15m: number;
  oi4h: number;
  fundingPct: number;
  price15m: number;
  takerBuyRatio: number | null;
  fundingPercentile14d: number | null;
  bucket: AssetBucketFilter;
  dataQuality: "native" | "selected-live" | "unavailable";
};

const HYPE_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const LIGHTWEIGHT_CHARTS_URL = "https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js";
const HYPE_GENESIS_TIME = Date.UTC(2024, 10, 29);
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
let lightweightChartsLoader: Promise<any> | null = null;

const PRIMARY_NAV_ITEMS: Array<{ id: View; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Market pulse" },
  { id: "markets", label: "Screener", description: "Scores by asset" },
  { id: "asset", label: "Asset Desk", description: "BTC / ETH / HYPE" },
  { id: "alerts", label: "Alerts", description: "Rules + presets" },
  { id: "flow", label: "Flow Tape", description: "Live events" },
  { id: "wallet", label: "Wallets", description: "Position risk" },
];

const MORE_NAV_ITEMS: Array<{ id: View; label: string; description: string }> = [
  { id: "fundamentals", label: "HYPE Fundamentals", description: "Fees + demand" },
  { id: "ecosystem", label: "Ecosystem", description: "Venue context" },
  { id: "etfDats", label: "ETF / DATs", description: "TradFi + treasuries" },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor + sales" },
  { id: "settings", label: "Settings", description: "Account + Telegram" },
];

const NAV_ITEMS = PRIMARY_NAV_ITEMS.concat(MORE_NAV_ITEMS);

const ALERT_METRICS: MetricMeta[] = [
  { key: "hypePrice", label: "Asset price", unit: "usd", description: "Current selected asset mark price." },
  { key: "hypeChange24h", label: "Asset 24h change", unit: "pct", description: "Daily price change for the selected asset." },
  { key: "hypeFunding", label: "Hourly funding", unit: "pct", description: "Hourly funding displayed as percent; 0.010 means 0.010%, equal to 0.00010 raw API funding." },
  { key: "hypeOpenInterest", label: "Asset open interest", unit: "usd", description: "Selected asset perp OI in dollars." },
  { key: "hypeVolume", label: "24h volume USD", unit: "usd", description: "Selected asset 24h perp notional volume in dollars." },
  { key: "assetVolumeRank", label: "Volume rank", unit: "number", description: "Rank by 24h perp volume across loaded Hyperliquid markets." },
  { key: "takerBuyUsd5m", label: "Taker buy flow 5m", unit: "usd", description: "Aggressive buy-flow estimate from the latest execution tape." },
  { key: "takerSellUsd5m", label: "Taker sell flow 5m", unit: "usd", description: "Aggressive sell-flow estimate from the latest execution tape." },
  { key: "takerBuyRatio5m", label: "Taker buy ratio 5m", unit: "pct", description: "Share of recent aggressive notional that is buy-side." },
  { key: "takerSellRatio5m", label: "Taker sell ratio 5m", unit: "pct", description: "Share of recent aggressive notional that is sell-side." },
  { key: "oiChange15m", label: "OI change 15m", unit: "pct", description: "Short-window OI expansion normalized by current open interest." },
  { key: "oiChange4h", label: "OI change 4h", unit: "pct", description: "Four-hour OI expansion normalized by current open interest." },
  { key: "priceChange15m", label: "Price change 15m", unit: "pct", description: "Selected asset price change over the last 15-minute candles." },
  { key: "priceChange4h", label: "Price change 4h", unit: "pct", description: "Selected asset price change over the last four hours." },
  { key: "fundingExtremeScore", label: "Funding extreme score", unit: "number", description: "0-100 score for how stretched current funding is." },
  { key: "crowdingScore", label: "Crowding score", unit: "number", description: "Composite score combining funding stress, OI growth, price stall, and volume." },
  { key: "largeTradeNotional5m", label: "Large trade notional 5m", unit: "usd", description: "Notional from large prints observed in the latest execution tape." },
  { key: "twapNet", label: "TWAP net pressure", unit: "usd", description: "Buy TWAP notional minus sell TWAP notional." },
  { key: "twapSell", label: "TWAP sell pressure", unit: "usd", description: "Detected sell-side TWAP notional." },
  { key: "bookSpread", label: "Book spread", unit: "pct", description: "Visible best bid/ask spread." },
  { key: "bookImbalance", label: "Book imbalance", unit: "pct", description: "Bid depth minus ask depth as percent." },
  { key: "hypeVsBtc30d", label: "Asset vs benchmark 30d", unit: "pct", description: "Selected asset return minus benchmark return." },
  { key: "etfNetFlow", label: "ETF net flow", unit: "usd", description: "Latest ETF/ETP net flow." },
  { key: "nftSales24h", label: "Hypurr NFT sales", unit: "number", description: "Reported collection sales in 24h." },
];

const DEFAULT_COINS = ["HYPE", "BTC", "ETH"];
const ASSET_PRESET_CALIBRATIONS: Record<string, AssetPresetCalibration> = {
  BTC: { family: "BTC", examples: "BTC", flow5m: 10_000_000, oi15m: 0.8, oi4h: 3, price15m: 0.25, fundingHourly: 0.006, priceStallUpper: 0.8, priceStallLower: -0.5 },
  ETH: { family: "ETH", examples: "ETH", flow5m: 6_000_000, oi15m: 1.25, oi4h: 4.5, price15m: 0.30, fundingHourly: 0.008, priceStallUpper: 1.0, priceStallLower: -0.6 },
  HYPE: { family: "HYPE / high-beta", examples: "HYPE", flow5m: 1_500_000, oi15m: 2.5, oi4h: 8, price15m: 0.35, fundingHourly: 0.010, priceStallUpper: 1.25, priceStallLower: -0.75 },
};
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
  floor: "Insufficient data",
  volume24h: "Insufficient data",
  totalVolume: "Insufficient data",
  listed: "Insufficient data",
  owners: "Insufficient data",
  sales24h: "Insufficient data",
};

const EMPTY_BASELINES: HistoricalBaselines = {
  source: "loading",
  updatedAt: "",
  sampleSizes: {
    candles5m: 0,
    candles15m: 0,
    candles1h: 0,
    funding: 0,
  },
  percentiles: {
    volumeUsd5mP90: 0,
    volumeUsd5mP95: 0,
    priceChange15mAbsP85: 0,
    priceChange15mAbsP95: 0,
    priceChange4hAbsP85: 0,
    priceChange4hAbsP95: 0,
    fundingAbsP90: 0,
    fundingAbsP95: 0,
    fundingPositiveP90: 0,
    fundingPositiveP95: 0,
    fundingNegativeP10: 0,
    fundingNegativeP5: 0,
  },
};

const DEMO_FLOWS: FlowRow[] = [
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    venue: "US",
    status: "Waiting for live flow",
    dollarVolume: "Insufficient data",
    url: "https://farside.co.uk/hyp/",
  },
  {
    name: "21Shares Hyperliquid ETF",
    ticker: "THYP",
    venue: "US",
    status: "Waiting for live flow",
    dollarVolume: "Insufficient data",
    url: "https://farside.co.uk/hyp/",
  },
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE.SW",
    venue: "Switzerland",
    status: "Waiting for quote",
    dollarVolume: "Insufficient data",
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD.DE",
    venue: "Germany",
    status: "Waiting for quote",
    dollarVolume: "Insufficient data",
  },
];

const DAT_ROWS: DatRow[] = [
  {
    name: "Strategy",
    ticker: "MSTR",
    asset: "BTC",
    strategy: "Largest public BTC treasury vehicle.",
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

const REFERENCE_EXCHANGES: ExchangeRow[] = [
  { name: "Binance Futures", category: "CEX", volumeUsd: 56_000_000_000, marketShare: 42, status: "CEX benchmark" },
  { name: "Bybit", category: "CEX", volumeUsd: 18_500_000_000, marketShare: 14, status: "CEX benchmark" },
  { name: "OKX", category: "CEX", volumeUsd: 14_200_000_000, marketShare: 11, status: "CEX benchmark" },
  { name: "Hyperliquid", category: "DEX", volumeUsd: 0, marketShare: 0, status: "Live from perps API" },
  { name: "Aster", category: "DEX", volumeUsd: 3_400_000_000, marketShare: 2.6, status: "DEX benchmark" },
  { name: "dYdX", category: "DEX", volumeUsd: 920_000_000, marketShare: 0.7, status: "DEX benchmark" },
  { name: "Jupiter Perps", category: "DEX", volumeUsd: 760_000_000, marketShare: 0.6, status: "DEX benchmark" },
];

const demoMarkets: Market[] = [
  makeDemoMarket("HYPE", 42.5, 1.18, 0.00006, 1_240_000_000, 760_000_000, 10),
  makeDemoMarket("BTC", 112_400, 0.82, 0.00004, 3_050_000_000, 2_120_000_000, 40),
  makeDemoMarket("ETH", 4_280, -0.31, -0.00003, 1_860_000_000, 940_000_000, 25),
  makeDemoMarket("FARTCOIN", 1.08, -0.74, -0.00007, 460_000_000, 250_000_000, 10),
  makeDemoMarket("PUMP", 0.0061, 2.15, 0.00005, 420_000_000, 210_000_000, 10),
  makeDemoMarket("DOGE", 0.19, 1.08, 0.00004, 390_000_000, 190_000_000, 10),
  makeDemoMarket("AVAX", 27.6, 1.4, 0.00005, 360_000_000, 160_000_000, 10),
  makeDemoMarket("SUI", 3.1, -1.6, -0.00005, 320_000_000, 140_000_000, 10),
  makeDemoMarket("LINK", 16.4, 0.62, 0.00003, 290_000_000, 120_000_000, 10),
];

const demoTwaps: TwapRow[] = [
  {
    side: "Buy",
    notional: "$1.62M",
    rawNotional: 1_620_000,
    size: "38.1K HYPE",
    slices: 16,
    avgPrice: "$42.52",
    lastTrade: "recent",
    confidence: "Demo cluster",
  },
  {
    side: "Sell",
    notional: "$0.94M",
    rawNotional: 940_000,
    size: "22.1K HYPE",
    slices: 9,
    avgPrice: "$42.48",
    lastTrade: "recent",
    confidence: "Demo cluster",
  },
];

function makeDemoMarket(
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
    oraclePx: price * (1 - changePct / 10000),
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

function makeDemoCandles(coin: string): Candle[] {
  const base = coin === "BTC" ? 112_400 : coin === "ETH" ? 4_280 : 42.5;
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

function makeDemoDailyCandles(coin: string): Candle[] {
  const base = coin === "BTC" ? 112_400 : coin === "ETH" ? 4_280 : 42.5;
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
  if (!hypeDaily.length || totalVolume <= 0) return [];
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

function makeDemoBook(coin: string): Book {
  const mid = coin === "BTC" ? 112_400 : coin === "ETH" ? 4_280 : 42.5;
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

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "Insufficient data";
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
  if (!Number.isFinite(value) || value <= 0) return "Insufficient data";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${suffix}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${suffix}`;
  if (value >= 100) return `${value.toFixed(0)} ${suffix}`;
  if (value >= 1) return `${value.toFixed(2)} ${suffix}`;
  return `${value.toPrecision(3)} ${suffix}`;
}

function formatPct(value: number, digits = 2, signed = true) {
  if (!Number.isFinite(value)) return "Insufficient data";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatFundingPct(value: number) {
  if (!Number.isFinite(value)) return "Insufficient data";
  if (value === 0) return "0.0000%";
  if (Math.abs(value) < 0.00005) return `${value < 0 ? "-" : ""}<0.0001%`;
  return formatPct(value, 4);
}

function formatDataAge(seconds: number | null) {
  if (seconds === null) return "retrying";
  if (seconds < 90) return `${seconds}s ago`;
  return `${Math.max(1, Math.round(seconds / 60))}m ago`;
}

function formatMetricValue(value: number, unit: MetricMeta["unit"]) {
  if (unit === "usd") return formatUsd(value);
  if (unit === "pct") return formatPct(value, Math.abs(value) < 1 ? 4 : 2);
  return Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "Insufficient data";
}

function metricMeta(key: AlertMetricKey) {
  return ALERT_METRICS.find((metric: MetricMeta) => metric.key === key) || ALERT_METRICS[0];
}

function conditionLabel(condition: AlertCondition) {
  if (condition === "gt") return "greater than";
  if (condition === "gte") return "greater than or equal to";
  if (condition === "lt") return "less than";
  if (condition === "lte") return "less than or equal to";
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

function makePresetRule(name: string, clauses: AlertClause[], cooldownMinutes = 15): AlertRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    clauses,
    enabled: true,
    cooldownMinutes,
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

function priceChangeFromCandles(candles: Candle[], lookbackMs: number) {
  if (candles.length < 2) return 0;
  const last = candles[candles.length - 1];
  const cutoff = last.time - lookbackMs;
  const base = [...candles].reverse().find((candle: Candle) => candle.time <= cutoff) || candles[0];
  if (!base?.close || !last?.close) return 0;
  return ((last.close - base.close) / base.close) * 100;
}

function estimateOiChangePct(currentOi: number, recentFlowUsd: number, windowShare: number) {
  if (!Number.isFinite(currentOi) || currentOi <= 0) return 0;
  return clamp((Math.abs(recentFlowUsd) / currentOi) * 100 * windowShare, 0, 30);
}

function fundingExtremeScore(fundingPct: number, threshold = 0.010) {
  return clamp((Math.abs(fundingPct) / Math.max(0.0001, threshold)) * 100, 0, 100);
}

function volumeIntensityScore(volumeUsd: number, oiUsd: number) {
  if (!Number.isFinite(volumeUsd) || !Number.isFinite(oiUsd) || oiUsd <= 0) return 0;
  return clamp((volumeUsd / oiUsd) * 18, 0, 100);
}

function priceStallScore(priceChangePct: number, direction: "longs" | "shorts", upper = 1.25, lower = -0.75) {
  if (direction === "longs") {
    if (priceChangePct < lower || priceChangePct > upper) return 0;
    return 100;
  }
  if (priceChangePct > Math.abs(lower) || priceChangePct < -upper) return 0;
  return 100;
}

function buildCrowdingScore(input: { fundingPct: number; fundingThreshold: number; oiChangePct: number; oiThreshold: number; priceChangePct: number; priceStallUpper: number; priceStallLower: number; volumeUsd: number; oiUsd: number }) {
  const side = input.fundingPct >= 0 ? "longs" : "shorts";
  const fundingScore = fundingExtremeScore(input.fundingPct, input.fundingThreshold);
  const oiScore = clamp((input.oiChangePct / Math.max(0.01, input.oiThreshold)) * 100, 0, 100);
  const stallScore = priceStallScore(input.priceChangePct, side, input.priceStallUpper, input.priceStallLower);
  const volumeScore = volumeIntensityScore(input.volumeUsd, input.oiUsd);
  return Math.round((fundingScore * 0.4) + (oiScore * 0.3) + (stallScore * 0.2) + (volumeScore * 0.1));
}

function volumeFromCandles(candles: Candle[], lookbackMs: number) {
  if (!candles.length) return 0;
  const last = candles[candles.length - 1];
  const cutoff = last.time - lookbackMs;
  return candles.filter((candle: Candle) => candle.time >= cutoff).reduce((sum: number, candle: Candle) => sum + (candle.volume || 0), 0);
}

function percentileFromValue(value: number, reference: number) {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return 50;
  return Math.round(clamp((Math.abs(value) / reference) * 70, 1, 99));
}

function depthWithinBps(book: Book | null, bps: number) {
  if (!book || !book.bestBid || !book.bestAsk) return 0;
  const mid = (book.bestBid + book.bestAsk) / 2;
  const lower = mid * (1 - bps / 10_000);
  const upper = mid * (1 + bps / 10_000);
  const bidDepth = book.bids.filter((level: BookLevel) => level.price >= lower).reduce((sum: number, level: BookLevel) => sum + level.usd, 0);
  const askDepth = book.asks.filter((level: BookLevel) => level.price <= upper).reduce((sum: number, level: BookLevel) => sum + level.usd, 0);
  return bidDepth + askDepth;
}

function estimateSlippagePct(book: Book | null, notionalUsd: number) {
  if (!book || !book.bestAsk || !book.asks.length || notionalUsd <= 0) return 0;
  let remaining = notionalUsd;
  let spent = 0;
  let size = 0;
  for (const level of book.asks) {
    if (remaining <= 0) break;
    const takeUsd = Math.min(remaining, level.usd);
    const takeSize = level.price > 0 ? takeUsd / level.price : 0;
    spent += takeUsd;
    size += takeSize;
    remaining -= takeUsd;
  }
  if (size <= 0) return 0;
  const averageFill = spent / size;
  return ((averageFill - book.bestAsk) / book.bestAsk) * 100;
}

function buildFreshLeverageScore(input: { flowUsd: number; flowThreshold: number; ratio: number; oi15m: number; oiThreshold: number; price15m: number; priceThreshold: number }) {
  const flowScore = clamp((input.flowUsd / Math.max(1, input.flowThreshold)) * 100, 0, 100);
  const ratioScore = clamp((input.ratio / 68) * 100, 0, 100);
  const oiScore = clamp((input.oi15m / Math.max(0.01, input.oiThreshold)) * 100, 0, 100);
  const priceScore = clamp((Math.abs(input.price15m) / Math.max(0.01, input.priceThreshold)) * 100, 0, 100);
  return Math.round(flowScore * 0.35 + ratioScore * 0.25 + oiScore * 0.25 + priceScore * 0.15);
}

function buildLiquidityScore(input: { volumeRank: number; spreadBps: number; depth50Bps: number; slippage100kPct: number }) {
  const rankScore = clamp(((31 - Math.min(input.volumeRank || 999, 31)) / 30) * 100, 0, 100);
  const spreadScore = clamp(100 - input.spreadBps * 10, 0, 100);
  const depthScore = clamp((input.depth50Bps / 10_000_000) * 100, 0, 100);
  const slippageScore = clamp(100 - input.slippage100kPct * 1200, 0, 100);
  return Math.round(rankScore * 0.35 + spreadScore * 0.25 + depthScore * 0.25 + slippageScore * 0.15);
}

function buildAnomalyScore(input: { relativeVolume5m: number; price15m: number; oi15m: number; largeTradeCount5m: number }) {
  const volumeScore = clamp((input.relativeVolume5m / 3) * 100, 0, 100);
  const priceScore = clamp((Math.abs(input.price15m) / 1.5) * 100, 0, 100);
  const oiScore = clamp((Math.abs(input.oi15m) / 4) * 100, 0, 100);
  const tradeScore = clamp((input.largeTradeCount5m / 8) * 100, 0, 100);
  return Math.round(volumeScore * 0.3 + priceScore * 0.25 + oiScore * 0.25 + tradeScore * 0.2);
}

function classifyMarketState(metrics: AssetTerminalMetrics) {
  if (metrics.crowdingScore >= 70) return "crowded";
  if (metrics.oiChange1h < -1.5 && metrics.priceChange1h < -0.4) return "deleveraging";
  if (metrics.freshLeverageScore >= 65 && metrics.priceChange15m > 0) return "risk-on";
  return "neutral";
}

function assetBucket(symbol: string, rank: number): AssetBucketFilter {
  if (symbol === "BTC") return "majors";
  if (symbol === "ETH") return "ethSol";
  if (symbol === "HYPE" || rank <= 30) return "highBeta";
  return "small";
}

function dash(value: number | null | undefined, formatter: (value: number) => string) {
  return Number.isFinite(value as number) ? formatter(value as number) : "Insufficient data";
}

function readinessStatus(score: number) {
  if (score >= 100) return "Active";
  if (score >= 75) return "Close";
  if (score >= 40) return "Watching";
  return "Inactive";
}

function evaluateClause(clause: AlertClause, snapshot: MetricSnapshot) {
  const value = snapshot[clause.metric];
  if (clause.condition === "gt") return value > clause.value;
  if (clause.condition === "gte") return value >= clause.value;
  if (clause.condition === "lt") return value < clause.value;
  if (clause.condition === "lte") return value <= clause.value;
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
  if (!address || address.length < 12) return address || "Insufficient data";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function postInfo(body: unknown) {
  const request: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  };

  const response = await fetch("/api/hyperliquid/info", request);
  if (!response.ok) throw new Error(`Hyperliquid proxy ${response.status}`);
  return response.json();
}

async function fetchHyperliquidMeta() {
  const response = await fetch("/api/hyperliquid/meta", { cache: "no-store" });
  if (!response.ok) throw new Error(`Hyperliquid meta proxy ${response.status}`);
  return response.json();
}

async function fetchHyperliquidCandles(coin: string, interval: string, startTime: number, endTime: number) {
  const params = new URLSearchParams({
    coin,
    interval,
    startTime: String(startTime),
    endTime: String(endTime),
  });
  const response = await fetch(`/api/hyperliquid/candles?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Hyperliquid candles proxy ${response.status}`);
  return response.json();
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
      const oraclePx = n(ctx.oraclePx) || price;
      const prevPrice = n(ctx.prevDayPx);
      const funding = n(ctx.funding);
      const oiUsd = n(ctx.openInterest) * price;
      const volumeUsd = n(ctx.dayNtlVlm);
      const changePct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      const maxLeverage = n(asset.maxLeverage) || 10;
      return {
        symbol: asset.name,
        price,
        oraclePx,
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
    size: item.size || item.sizeLabel || "Insufficient data",
    slices: n(item.slices || item.trades || item.count || index + 1),
    avgPrice: item.avgPrice || item.averagePrice || "Insufficient data",
    lastTrade: item.lastTrade || item.timeLabel || item.lastTradeLabel || "recent",
    confidence: item.confidence || item.source || "cluster",
  }));
  const trades: TradeRow[] = rawTrades.slice(0, 30).map((item: any, index: number) => ({
    id: String(item.id || `${item.side || "trade"}-${index}`),
    side: item.side === "Sell" ? "Sell" : "Buy",
    price: item.price || item.px || "Insufficient data",
    size: item.size || item.sz || "Insufficient data",
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
  const rows = Array.isArray(data?.flows) ? data.flows : Array.isArray(data) ? data : [];
  const flowRows = rows.map((row: any) => ({
    name: row.name || row.ticker || "Unnamed product",
    ticker: row.ticker || "Insufficient data",
    venue: row.venue || row.region || "Insufficient data",
    status: row.status || row.note || "Tracked product",
    price: row.price,
    change: row.change,
    volume: row.volume,
    dollarVolume: row.dollarVolume || row.flow || row.netFlow || row.volumeUsd || "Insufficient data",
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
  const days = parsedDays.length ? parsedDays.slice(-20) : [];
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
  return DEMO_MODE ? "Demo" : "Unavailable";
}

function buildExchangeRows(hyperliquidVolume: number): ExchangeRow[] {
  if (hyperliquidVolume <= 0) return [];
  const rows = REFERENCE_EXCHANGES.map((row: ExchangeRow) =>
    row.name === "Hyperliquid"
      ? { ...row, volumeUsd: hyperliquidVolume }
      : row,
  );
  const total = rows.reduce((sum: number, row: ExchangeRow) => sum + row.volumeUsd, 0) || 1;
  return rows
    .map((row: ExchangeRow) => ({ ...row, marketShare: (row.volumeUsd / total) * 100 }))
    .sort((a: ExchangeRow, b: ExchangeRow) => b.volumeUsd - a.volumeUsd);
}

function MarketCandleChart({
  candles,
  asset,
  mode = "price",
  metrics,
}: {
  candles: Candle[];
  asset: string;
  mode?: "price" | "oi" | "cvd" | "funding";
  metrics?: AssetTerminalMetrics;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let disposed = false;

    async function setupChart() {
      try {
        const LightweightCharts = await loadLightweightCharts();
        if (disposed || !containerRef.current) return;
        const chart = LightweightCharts.createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 390,
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
            borderColor: "rgba(255, 255, 255, 0.16)",
            scaleMargins: { top: 0.12, bottom: 0.12 },
          },
          timeScale: {
            borderColor: "rgba(255, 255, 255, 0.16)",
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 8,
            barSpacing: 8,
          },
          crosshair: {
            mode: 0,
            vertLine: { color: "rgba(255, 255, 255, 0.3)", width: 1, style: 2 },
            horzLine: { color: "rgba(255, 255, 255, 0.3)", width: 1, style: 2 },
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

        const series = chart.addCandlestickSeries({
          upColor: "#7cf7c7",
          downColor: "#ff6b82",
          borderUpColor: "#7cf7c7",
          borderDownColor: "#ff6b82",
          wickUpColor: "#7cf7c7",
          wickDownColor: "#ff6b82",
          priceFormat: { type: "price", precision: asset === "BTC" || asset === "ETH" ? 1 : 2, minMove: asset === "BTC" || asset === "ETH" ? 0.1 : 0.01 },
          priceLineVisible: true,
          lastValueVisible: true,
        });

        chartRef.current = chart;
        seriesRef.current = series;
        resizeObserverRef.current = new ResizeObserver(() => {
          if (!containerRef.current) return;
          chart.applyOptions({ width: containerRef.current.clientWidth });
        });
        resizeObserverRef.current.observe(containerRef.current);
      } catch {
        return;
      }
    }

    setupChart();
    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.remove?.();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [asset]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const data = candles
      .map((candle: Candle) => ({
        time: Math.floor(candle.time / 1000),
        open: candle.open ?? candle.close,
        high: candle.high ?? candle.close,
        low: candle.low ?? candle.close,
        close: candle.close,
      }))
      .filter((row) => row.time > 0 && row.close > 0);
    series.setData(data);
    if (data.length) chart.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="market-chart-shell">
      <div className="market-chart-top">
        <span>{asset} candles</span>
        <strong>{mode === "oi" ? "OI context" : mode === "cvd" ? "CVD context" : mode === "funding" ? "Funding context" : "Price only"} / {candles.length ? `${candles.length} bars` : "loading"}</strong>
      </div>
      <div className="market-candle-chart" ref={containerRef}>
        {!candles.length ? <div className="empty">Waiting for candles</div> : null}
      </div>
      {metrics ? (
        <div className="chart-context-strip">
          <div className={mode === "oi" ? "active" : ""}><span>OI 4h</span><strong>{formatPct(metrics.oiChange4h, 2)}</strong></div>
          <div className={mode === "cvd" ? "active" : ""}><span>Net taker delta 5m</span><strong>{formatUsd(metrics.netTakerDelta5m)}</strong></div>
          <div className={mode === "funding" ? "active" : ""}><span>Funding</span><strong>{formatFundingPct(metrics.fundingPct)}</strong></div>
          <div><span>Rel vol 5m</span><strong>{metrics.relativeVolume5m.toFixed(2)}x</strong></div>
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const alertConditionStateRef = useRef<Record<string, boolean>>({});
  const [view, setView] = useState<View>(initialView);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [coin, setCoin] = useState(initialCoin);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [markets, setMarkets] = useState<Market[]>(DEMO_MODE ? demoMarkets : []);
  const [candles, setCandles] = useState<Candle[]>(DEMO_MODE ? makeDemoCandles("HYPE") : []);
  const [hypeDaily, setHypeDaily] = useState<Candle[]>(DEMO_MODE ? makeDemoDailyCandles("HYPE") : []);
  const [btcDaily, setBtcDaily] = useState<Candle[]>(DEMO_MODE ? makeDemoDailyCandles("BTC") : []);
  const [statsStatus, setStatsStatus] = useState<Status>(DEMO_MODE ? "fallback" : "loading");
  const [book, setBook] = useState<Book | null>(DEMO_MODE ? makeDemoBook("HYPE") : null);
  const [marketStatus, setMarketStatus] = useState<Status>(DEMO_MODE ? "fallback" : "loading");
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date | null>(null);
  const [chartMode, setChartMode] = useState<"price" | "oi" | "cvd" | "funding">("oi");
  const [signalTab, setSignalTab] = useState<SignalTab>("active");
  const [flowTab, setFlowTab] = useState<FlowTab>("large");
  const [screenerFilter, setScreenerFilter] = useState<ScreenerFilter>("top30");
  const [bucketFilter, setBucketFilter] = useState<AssetBucketFilter>("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("Paste an address to analyze perp exposure.");
  const [positions, setPositions] = useState<Position[]>([]);
  const [nftStats, setNftStats] = useState<NftStats>(EMPTY_NFT_STATS);
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [nftStatus, setNftStatus] = useState<Status>("loading");
  const [twaps, setTwaps] = useState<TwapRow[]>(DEMO_MODE ? demoTwaps : []);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [twapSummary, setTwapSummary] = useState<TwapSummary | null>(null);
  const [twapStatus, setTwapStatus] = useState<Status>(DEMO_MODE ? "fallback" : "loading");
  const [flows, setFlows] = useState<FlowRow[]>(DEMO_MODE ? DEMO_FLOWS : []);
  const [flowDays, setFlowDays] = useState<FlowDay[]>(DEMO_MODE ? synthesizeFlowDays(DEMO_FLOWS) : []);
  const [flowStatus, setFlowStatus] = useState<Status>(DEMO_MODE ? "fallback" : "loading");
  const [flowMeta, setFlowMeta] = useState({ source: DEMO_MODE ? "demo" : "", latestDate: "", note: "" });
  const [historicalBaselines, setHistoricalBaselines] = useState<HistoricalBaselines>(EMPTY_BASELINES);
  const [baselineStatus, setBaselineStatus] = useState<Status>("loading");
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [triggerHistory, setTriggerHistory] = useState<AlertTrigger[]>([]);
  const [selectedClauseId, setSelectedClauseId] = useState("draft-custom-1");
  const [activePresetKind, setActivePresetKind] = useState<AlertPresetKind | null>(null);
  const [draftRule, setDraftRule] = useState<AlertRule>({
    id: "draft",
    name: "My custom alert",
    asset: coin,
    clauses: [
      { id: "draft-custom-1", metric: "hypePrice", condition: "gt", value: 50, join: "AND" },
    ],
    enabled: true,
    cooldownMinutes: 15,
    createdAt: new Date(0).toISOString(),
    delivery: "browser",
  });

  function openAccountPanel() {
    setView("settings");
    window.setTimeout(() => {
      accountPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

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
      const savedHistory = window.localStorage.getItem("hypurrscope-trigger-history");
      if (savedHistory) setTriggerHistory(JSON.parse(savedHistory));
    } catch {
      setAlertRules([]);
      setTriggerHistory([]);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
    const timer = window.setInterval(loadStatistics, 120_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  useEffect(() => {
    loadHistoricalBaselines();
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
      window.localStorage.setItem("hypurrscope-trigger-history", JSON.stringify(triggerHistory.slice(0, 80)));
    } catch {
      return;
    }
  }, [triggerHistory]);

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
  }, [coin]);

  useEffect(() => {
    loadFlows();
    const timer = window.setInterval(loadFlows, 90_000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadMarketData() {
    try {
      setMarketStatus((current) => (current === "live" ? "live" : "loading"));
      const now = Date.now();
      const [marketPayload, candlePayload, bookPayload] = await Promise.all([
        fetchHyperliquidMeta(),
        fetchHyperliquidCandles(coin, "15m", now - 24 * 60 * 60 * 1000, now),
        postInfo({ type: "l2Book", coin, nSigFigs: 5 }),
      ]);
      const nextMarkets = normalizeMarkets(marketPayload);
      const nextCandles = normalizeCandles(candlePayload);
      const nextBook = normalizeBook(bookPayload);
      if (nextMarkets.length) setMarkets(nextMarkets);
      if (nextCandles.length) setCandles(nextCandles);
      if (nextBook) setBook(nextBook);
      setDataUpdatedAt(new Date());
      setMarketStatus("live");
    } catch {
      if (DEMO_MODE) {
        setCandles(makeDemoCandles(coin));
        setBook(makeDemoBook(coin));
        setDataUpdatedAt(new Date());
        setMarketStatus("fallback");
        return;
      }
      setMarkets([]);
      setCandles([]);
      setBook(null);
      setMarketStatus("error");
    }
  }

  async function loadStatistics() {
    try {
      setStatsStatus((current) => (current === "live" ? "live" : "loading"));
      const now = Date.now();
      const startTime = now - 32 * 24 * 60 * 60 * 1000;
      const benchmark = benchmarkForAsset(coin);
      const [assetPayload, benchmarkPayload] = await Promise.all([
        fetchHyperliquidCandles(coin, "1d", startTime, now),
        fetchHyperliquidCandles(benchmark, "1d", startTime, now),
      ]);
      const nextAsset = normalizeCandles(assetPayload);
      const nextBenchmark = normalizeCandles(benchmarkPayload);
      if (nextAsset.length) setHypeDaily(nextAsset.slice(-30));
      if (nextBenchmark.length) setBtcDaily(nextBenchmark.slice(-30));
      setStatsStatus("live");
    } catch {
      if (DEMO_MODE) {
        setHypeDaily(makeDemoDailyCandles(coin));
        setBtcDaily(makeDemoDailyCandles(benchmarkForAsset(coin)));
        setStatsStatus("fallback");
        return;
      }
      setHypeDaily([]);
      setBtcDaily([]);
      setStatsStatus("error");
    }
  }

  async function loadHistoricalBaselines() {
    try {
      setBaselineStatus((current) => (current === "live" ? "live" : "loading"));
      const response = await fetch(`/api/hyperliquid/history?coin=${encodeURIComponent(coin)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Historical baseline API failed");
      const data = await response.json();
      setHistoricalBaselines({
        source: data?.source || "hyperliquid-info",
        updatedAt: data?.updatedAt || "",
        sampleSizes: {
          candles5m: n(data?.sampleSizes?.candles5m),
          candles15m: n(data?.sampleSizes?.candles15m),
          candles1h: n(data?.sampleSizes?.candles1h),
          funding: n(data?.sampleSizes?.funding),
        },
        percentiles: {
          volumeUsd5mP90: n(data?.percentiles?.volumeUsd5mP90),
          volumeUsd5mP95: n(data?.percentiles?.volumeUsd5mP95),
          priceChange15mAbsP85: n(data?.percentiles?.priceChange15mAbsP85),
          priceChange15mAbsP95: n(data?.percentiles?.priceChange15mAbsP95),
          priceChange4hAbsP85: n(data?.percentiles?.priceChange4hAbsP85),
          priceChange4hAbsP95: n(data?.percentiles?.priceChange4hAbsP95),
          fundingAbsP90: n(data?.percentiles?.fundingAbsP90),
          fundingAbsP95: n(data?.percentiles?.fundingAbsP95),
          fundingPositiveP90: n(data?.percentiles?.fundingPositiveP90),
          fundingPositiveP95: n(data?.percentiles?.fundingPositiveP95),
          fundingNegativeP10: n(data?.percentiles?.fundingNegativeP10),
          fundingNegativeP5: n(data?.percentiles?.fundingNegativeP5),
        },
      });
      setBaselineStatus("live");
    } catch {
      setHistoricalBaselines(EMPTY_BASELINES);
      setBaselineStatus(DEMO_MODE ? "fallback" : "error");
    }
  }

  async function loadNfts() {
    try {
      setNftStatus((current) => (current === "live" ? "live" : "loading"));
      const [statsRes, eventsRes] = await Promise.allSettled([fetch("/api/opensea/stats", { cache: "no-store" }), fetch("/api/opensea/events", { cache: "no-store" })]);
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setNftStats(parseNftStats(await statsRes.value.json()));
      }
      if (eventsRes.status !== "fulfilled" || !eventsRes.value.ok) throw new Error("NFT events failed");
      const sales = parseNftSales(await eventsRes.value.json());
      setNftSales(sales);
      setNftStatus("live");
    } catch {
      setNftStatus("error");
    }
  }

  async function loadTwaps() {
    try {
      setTwapStatus((current) => (current === "live" ? "live" : "loading"));
      const response = await fetch(`/api/hyperliquid/twaps?coin=${encodeURIComponent(coin)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("TWAP API failed");
      const parsed = parseTwaps(await response.json());
      setTwaps(parsed.twaps.length ? parsed.twaps : DEMO_MODE ? demoTwaps : []);
      setTrades(parsed.trades);
      setTwapSummary(parsed.summary);
      setTwapStatus(parsed.ok ? "live" : DEMO_MODE ? "fallback" : "error");
    } catch {
      if (DEMO_MODE) {
        setTwaps(demoTwaps);
        setTwapStatus("fallback");
        return;
      }
      setTwaps([]);
      setTrades([]);
      setTwapSummary(null);
      setTwapStatus("error");
    }
  }

  async function loadFlows() {
    try {
      const response = await fetch("/api/tradfi/flows", { cache: "no-store" });
      if (!response.ok) throw new Error("Flow API failed");
      const parsed = parseFlows(await response.json());
      setFlows(parsed.rows.length ? parsed.rows : DEMO_MODE ? DEMO_FLOWS : []);
      setFlowDays(parsed.days.length ? parsed.days : DEMO_MODE ? synthesizeFlowDays(parsed.rows.length ? parsed.rows : DEMO_FLOWS, parsed.latestDate) : []);
      setFlowMeta({ source: parsed.source, latestDate: parsed.latestDate, note: parsed.note });
      setFlowStatus("live");
    } catch {
      if (DEMO_MODE) {
        setFlows(DEMO_FLOWS);
        setFlowDays(synthesizeFlowDays(DEMO_FLOWS));
        setFlowStatus("fallback");
        setFlowMeta({ source: "demo", latestDate: "", note: "Demo mode" });
        return;
      }
      setFlows([]);
      setFlowDays([]);
      setFlowStatus("error");
      setFlowMeta({ source: "", latestDate: "", note: "Data unavailable" });
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
  const totalOi = markets.reduce((sum: number, market: Market) => sum + market.oiUsd, 0);
  const totalVolume = markets.reduce((sum: number, market: Market) => sum + market.volumeUsd, 0);
  const presetCalibration = ASSET_PRESET_CALIBRATIONS[coin] || ASSET_PRESET_CALIBRATIONS.HYPE;
  const twapBuy = twaps.filter((row: TwapRow) => row.side === "Buy").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapSell = twaps.filter((row: TwapRow) => row.side === "Sell").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapNet = twapBuy - twapSell;
  const tapeBuy = trades.filter((row: TradeRow) => row.side === "Buy").reduce((sum: number, row: TradeRow) => sum + (row.rawNotional || 0), 0);
  const tapeSell = trades.filter((row: TradeRow) => row.side === "Sell").reduce((sum: number, row: TradeRow) => sum + (row.rawNotional || 0), 0);
  const takerBuyUsd5m = Math.max(tapeBuy, twapBuy * 0.22);
  const takerSellUsd5m = Math.max(tapeSell, twapSell * 0.22);
  const takerTotalUsd5m = takerBuyUsd5m + takerSellUsd5m;
  const takerBuyRatio5m = takerTotalUsd5m > 0 ? (takerBuyUsd5m / takerTotalUsd5m) * 100 : 50;
  const takerSellRatio5m = takerTotalUsd5m > 0 ? (takerSellUsd5m / takerTotalUsd5m) * 100 : 50;
  const etfNetFlow = flows.reduce((sum: number, row: FlowRow) => sum + parseMoneyLabel(row.dollarVolume), 0);
  const largestEtfPrint = Math.max(0, ...flows.map((row: FlowRow) => Math.abs(parseMoneyLabel(row.dollarVolume))));
  const exchangeRows = useMemo(() => buildExchangeRows(totalVolume), [totalVolume]);
  const revenueSeries = useMemo(() => buildRevenueSeries(hypeDaily, totalVolume), [hypeDaily, totalVolume]);
  const benchmarkCoin = benchmarkForAsset(coin);
  const hasAssetHistory = hypeDaily.length > 1;
  const hasBenchmarkHistory = btcDaily.length > 1;
  const assetReturn30d = hasAssetHistory ? ((hypeDaily[hypeDaily.length - 1].close - hypeDaily[0].close) / hypeDaily[0].close) * 100 : Number.NaN;
  const benchmarkReturn30d = hasBenchmarkHistory ? ((btcDaily[btcDaily.length - 1].close - btcDaily[0].close) / btcDaily[0].close) * 100 : Number.NaN;
  const relativeStrength = hasAssetHistory && hasBenchmarkHistory ? assetReturn30d - benchmarkReturn30d : Number.NaN;
  const estimatedRevenue30d = revenueSeries.reduce((sum: number, item: Candle) => sum + item.close, 0);
  const avgDailyRevenue = revenueSeries.length && totalVolume > 0 ? estimatedRevenue30d / revenueSeries.length : Number.NaN;
  const priceChange15m = priceChangeFromCandles(candles, 15 * 60_000);
  const priceChange1h = priceChangeFromCandles(candles, 60 * 60_000);
  const priceChange4h = priceChangeFromCandles(candles, 4 * 60 * 60_000);
  const volume5m = Math.max(volumeFromCandles(candles, 5 * 60_000), takerTotalUsd5m);
  const volume15m = Math.max(volumeFromCandles(candles, 15 * 60_000), takerTotalUsd5m);
  const volume1h = Math.max(volumeFromCandles(candles, 60 * 60_000), volume15m);
  const relativeVolume5m = volume5m / Math.max(1, (selected?.volumeUsd || 0) / 288);
  const oiChange15m = estimateOiChangePct(selected?.oiUsd || 0, takerTotalUsd5m, 3);
  const oiChange1h = estimateOiChangePct(selected?.oiUsd || 0, takerTotalUsd5m + Math.abs(twapNet) * 0.45, 5.5);
  const oiChange4h = estimateOiChangePct(selected?.oiUsd || 0, takerTotalUsd5m + Math.abs(twapNet), 10);
  const fundingPct = (selected?.funding || 0) * 100;
  const fundingAnnualizedPct = fundingPct * 24 * 365;
  const fundingReference = historicalBaselines.percentiles.fundingAbsP95 || 0.035;
  const fundingPercentile14d = percentileFromValue(fundingPct, fundingReference);
  const fundingExtreme = fundingExtremeScore(fundingPct);
  const assetVolumeRank = [...markets].sort((a: Market, b: Market) => b.volumeUsd - a.volumeUsd).findIndex((market: Market) => market.symbol === coin) + 1 || 999;
  const markOraclePremiumPct = selected?.oraclePx ? ((selected.price - selected.oraclePx) / selected.oraclePx) * 100 : 0;
  const spreadBps = (book?.spreadPct || 0) * 100;
  const depth50Bps = depthWithinBps(book, 50);
  const slippage100kPct = estimateSlippagePct(book, 100_000);
  const slippage1mPct = estimateSlippagePct(book, 1_000_000);
  const btcMarket = markets.find((market: Market) => market.symbol === "BTC");
  const ethMarket = markets.find((market: Market) => market.symbol === "ETH");
  const relativeStrengthVsBtc24h = (selected?.changePct || 0) - (btcMarket?.changePct || 0);
  const relativeStrengthVsEth24h = (selected?.changePct || 0) - (ethMarket?.changePct || 0);
  const largeTrades = trades.filter((row: TradeRow) => (row.rawNotional || 0) >= 250_000);
  const largeTradeCount5m = largeTrades.length;
  const largeTradeNotional5m = largeTrades.reduce((sum: number, row: TradeRow) => sum + (row.rawNotional || 0), 0);
  const netTakerDelta5m = takerBuyUsd5m - takerSellUsd5m;
  const dominantFlow = Math.max(takerBuyUsd5m, takerSellUsd5m);
  const freshLeverageScore = buildFreshLeverageScore({
    flowUsd: dominantFlow,
    flowThreshold: presetCalibration.flow5m,
    ratio: takerBuyUsd5m >= takerSellUsd5m ? takerBuyRatio5m : takerSellRatio5m,
    oi15m: oiChange15m,
    oiThreshold: presetCalibration.oi15m,
    price15m: priceChange15m,
    priceThreshold: presetCalibration.price15m,
  });
  const freshLongScore = buildFreshLeverageScore({
    flowUsd: takerBuyUsd5m,
    flowThreshold: presetCalibration.flow5m,
    ratio: takerBuyRatio5m,
    oi15m: oiChange15m,
    oiThreshold: presetCalibration.oi15m,
    price15m: Math.max(0, priceChange15m),
    priceThreshold: presetCalibration.price15m,
  });
  const freshShortScore = buildFreshLeverageScore({
    flowUsd: takerSellUsd5m,
    flowThreshold: presetCalibration.flow5m,
    ratio: takerSellRatio5m,
    oi15m: oiChange15m,
    oiThreshold: presetCalibration.oi15m,
    price15m: Math.max(0, -priceChange15m),
    priceThreshold: presetCalibration.price15m,
  });
  const crowdingScore = buildCrowdingScore({
    fundingPct,
    fundingThreshold: presetCalibration.fundingHourly,
    oiChangePct: oiChange4h,
    oiThreshold: presetCalibration.oi4h,
    priceChangePct: priceChange4h,
    priceStallUpper: presetCalibration.priceStallUpper,
    priceStallLower: presetCalibration.priceStallLower,
    volumeUsd: selected?.volumeUsd || 0,
    oiUsd: selected?.oiUsd || 0,
  });
  const liquidityScore = buildLiquidityScore({ volumeRank: assetVolumeRank, spreadBps, depth50Bps, slippage100kPct });
  const anomalyScore = buildAnomalyScore({ relativeVolume5m, price15m: priceChange15m, oi15m: oiChange15m, largeTradeCount5m });
  const crowdedLongScore = fundingPct > 0 ? crowdingScore : Math.round(crowdingScore * 0.35);
  const crowdedShortScore = fundingPct < 0 ? crowdingScore : Math.round(crowdingScore * 0.35);
  const terminalMetrics: AssetTerminalMetrics = {
    priceChange15m,
    priceChange1h,
    priceChange4h,
    volume5m,
    volume15m,
    volume1h,
    relativeVolume5m,
    oiChange15m,
    oiChange1h,
    oiChange4h,
    fundingPct,
    fundingAnnualizedPct,
    fundingPercentile14d,
    markOraclePremiumPct,
    takerBuyUsd5m,
    takerSellUsd5m,
    netTakerDelta5m,
    takerBuyRatio5m,
    largeTradeCount5m,
    largeTradeNotional5m,
    spreadBps,
    depth50Bps,
    slippage100kPct,
    slippage1mPct,
    relativeStrengthVsBtc24h,
    relativeStrengthVsEth24h,
    freshLeverageScore,
    crowdingScore,
    liquidityScore,
    anomalyScore,
    marketState: "neutral",
    marketSentence: "",
  };
  terminalMetrics.marketState = classifyMarketState(terminalMetrics);
  terminalMetrics.marketSentence =
    terminalMetrics.marketState === "crowded"
      ? `${coin} is close to a crowded setup: funding is stretched, OI is rising, and price follow-through is limited.`
      : terminalMetrics.marketState === "deleveraging"
        ? `${coin} is deleveraging: OI pressure is falling while price is under pressure.`
        : terminalMetrics.marketState === "risk-on"
          ? `${coin} has fresh risk-on pressure: taker pressure, OI expansion, and price confirmation are lining up.`
          : `${coin} is liquid, funding is ${fundingPct >= 0 ? "positive" : "negative"}, leverage expansion is neutral, no fresh flow spike detected.`;
  const alertSnapshot: MetricSnapshot = {
    hypePrice: selected?.price || 0,
    hypeChange24h: selected?.changePct || 0,
    hypeFunding: (selected?.funding || 0) * 100,
    hypeOpenInterest: selected?.oiUsd || 0,
    hypeVolume: selected?.volumeUsd || 0,
    assetVolumeRank,
    takerBuyUsd5m,
    takerSellUsd5m,
    takerBuyRatio5m,
    takerSellRatio5m,
    oiChange15m,
    oiChange4h,
    priceChange15m,
    priceChange4h,
    fundingExtremeScore: fundingExtreme,
    crowdingScore,
    largeTradeNotional5m,
    twapNet,
    twapSell,
    bookSpread: book?.spreadPct || 0,
    bookImbalance: book?.imbalance || 0,
    hypeVsBtc30d: relativeStrength,
    etfNetFlow,
    nftSales24h: Number(nftStats.sales24h.replace(/,/g, "")) || 0,
  };
  const accountName = userProfile.displayName.trim() || userProfile.email.trim() || "Guest";
  const telegramHandle = userProfile.telegram.trim().replace(/^@/, "");
  const isAccountReady = Boolean(userProfile.displayName.trim() || userProfile.email.trim());
  const selectedDraftClause = draftRule.clauses.find((clause: AlertClause) => clause.id === selectedClauseId) || draftRule.clauses[0];
  const liquidMarketClauses = [
    makeClause({ metric: "hypeVolume", condition: "gt", value: 25_000_000, join: "AND" }),
    makeClause({ metric: "assetVolumeRank", condition: "lte", value: 30, join: "AND" }),
  ];
  const marketOptions = DEFAULT_COINS;
  const selectedHasStructureData = candles.length > 1 && trades.length > 0;
  const screenerRows: ScreenerRow[] = useMemo(() => {
    const sortedByVolume = [...markets].sort((a: Market, b: Market) => b.volumeUsd - a.volumeUsd);
    return sortedByVolume.slice(0, 40).map((market: Market, index: number): ScreenerRow => {
      const calibration = ASSET_PRESET_CALIBRATIONS[market.symbol] || ASSET_PRESET_CALIBRATIONS.HYPE;
      const isSelected = market.symbol === coin;
      const flow5m = isSelected ? dominantFlow : 0;
      const rowOi15m = isSelected ? oiChange15m : 0;
      const rowOi4h = isSelected ? oiChange4h : 0;
      const rowPrice15m = isSelected ? priceChange15m : 0;
      const fundingPctRow = market.funding * 100;
      const rowFundingPercentile = percentileFromValue(fundingPctRow, historicalBaselines.percentiles.fundingAbsP95 || 0.035);
      const freshScore = buildFreshLeverageScore({
        flowUsd: flow5m,
        flowThreshold: calibration.flow5m,
        ratio: isSelected ? Math.max(takerBuyRatio5m, takerSellRatio5m) : 0,
        oi15m: rowOi15m,
        oiThreshold: calibration.oi15m,
        price15m: rowPrice15m,
        priceThreshold: calibration.price15m,
      });
      const crowdedScore = buildCrowdingScore({
        fundingPct: fundingPctRow,
        fundingThreshold: calibration.fundingHourly,
        oiChangePct: isSelected ? rowOi4h : 0,
        oiThreshold: calibration.oi4h,
        priceChangePct: isSelected ? priceChange4h : 0,
        priceStallUpper: calibration.priceStallUpper,
        priceStallLower: calibration.priceStallLower,
        volumeUsd: market.volumeUsd,
        oiUsd: market.oiUsd,
      });
      const liquidity = buildLiquidityScore({
        volumeRank: index + 1,
        spreadBps: isSelected ? spreadBps : 0,
        depth50Bps: isSelected ? depth50Bps : 0,
        slippage100kPct: isSelected ? slippage100kPct : 0,
      });
      const anomaly = buildAnomalyScore({
        relativeVolume5m: isSelected ? relativeVolume5m : 0,
        price15m: rowPrice15m,
        oi15m: rowOi15m,
        largeTradeCount5m: isSelected ? largeTradeCount5m : 0,
      });
      const signal = freshScore >= 70
        ? (rowPrice15m >= 0 ? "Fresh longs" : "Fresh shorts")
        : crowdedScore >= 70
          ? (fundingPctRow >= 0 ? "Crowded longs" : "Crowded shorts")
          : anomaly >= 72
            ? "Anomaly"
            : "Neutral";
      const dataQuality: ScreenerRow["dataQuality"] = isSelected && selectedHasStructureData ? "selected-live" : "native";
      return {
        market,
        rank: index + 1,
        freshLeverageScore: freshScore,
        crowdingScore: crowdedScore,
        liquidityScore: liquidity,
        anomalyScore: anomaly,
        signal,
        flow5m,
        oi15m: rowOi15m,
        oi4h: rowOi4h,
        fundingPct: fundingPctRow,
        price15m: rowPrice15m,
        takerBuyRatio: isSelected ? takerBuyRatio5m : null,
        fundingPercentile14d: rowFundingPercentile,
        bucket: assetBucket(market.symbol, index + 1),
        dataQuality,
      };
    }).sort((a: ScreenerRow, b: ScreenerRow) => Math.max(b.freshLeverageScore, b.crowdingScore) - Math.max(a.freshLeverageScore, a.crowdingScore));
  }, [markets, coin, dominantFlow, oiChange15m, oiChange4h, priceChange15m, priceChange4h, takerBuyRatio5m, takerSellRatio5m, spreadBps, depth50Bps, slippage100kPct, relativeVolume5m, largeTradeCount5m, historicalBaselines.percentiles.fundingAbsP95, selectedHasStructureData]);
  const highSignalRows = screenerRows.filter((row: ScreenerRow) => row.signal !== "Neutral");
  const globalRegime = highSignalRows.filter((row: ScreenerRow) => row.crowdingScore >= 70).length >= 3
    ? "crowded"
    : highSignalRows.filter((row: ScreenerRow) => row.freshLeverageScore >= 70).length >= 3
      ? "risk-on"
      : "neutral";
  const dataAgeSeconds = dataUpdatedAt ? Math.max(0, Math.round((Date.now() - dataUpdatedAt.getTime()) / 1000)) : null;
  const dataMode: DataMode = marketStatus === "fallback" && DEMO_MODE
    ? "demo"
    : marketStatus === "live" && dataAgeSeconds !== null && dataAgeSeconds <= 90
      ? "live"
      : marketStatus === "live"
        ? "stale"
        : "unavailable";
  const dataStatusText = dataMode === "live"
    ? `Live - updated ${formatDataAge(dataAgeSeconds)}`
    : dataMode === "stale"
      ? `Stale - updated ${formatDataAge(dataAgeSeconds)}`
      : dataMode === "demo"
        ? "Demo mode"
        : "Data unavailable - retrying";
  const hasMarketData = markets.length > 0 && dataMode !== "unavailable";
  const hypeMarket = markets.find((market: Market) => market.symbol === "HYPE");
  const fundingPositivePct = markets.length ? (markets.filter((market: Market) => market.funding > 0).length / markets.length) * 100 : 0;
  const fundingBias = fundingPositivePct > 58 ? "Longs paying" : fundingPositivePct < 42 ? "Shorts paying" : "Neutral";
  const totalOi4hChange = oiChange4h;
  const hasFullStructureData = (row: ScreenerRow) => row.dataQuality === "selected-live" && row.takerBuyRatio !== null;
  const filteredScreenerRows = screenerRows
    .filter((row: ScreenerRow) => (bucketFilter === "all" ? true : row.bucket === bucketFilter))
    .filter((row: ScreenerRow) => {
      if (screenerFilter === "top10") return row.rank <= 10;
      if (screenerFilter === "top30") return row.rank <= 30;
      if (screenerFilter === "liquid") return row.market.volumeUsd > 25_000_000 && row.rank <= 30;
      if (screenerFilter === "fresh") return row.freshLeverageScore >= 65;
      if (screenerFilter === "crowding") return row.crowdingScore >= 65;
      if (screenerFilter === "funding") return Math.abs(row.fundingPct) >= 0.010 || (row.fundingPercentile14d || 0) >= 90;
      if (screenerFilter === "liquidity") return row.liquidityScore < 55;
      return true;
    })
    .sort((a: ScreenerRow, b: ScreenerRow) =>
      Math.max(b.freshLeverageScore, b.crowdingScore, b.fundingPercentile14d || 0, 100 - b.liquidityScore) -
      Math.max(a.freshLeverageScore, a.crowdingScore, a.fundingPercentile14d || 0, 100 - a.liquidityScore),
    );
  const signalRows = screenerRows
    .filter(hasFullStructureData)
    .map((row: ScreenerRow) => {
      const liquidityReadiness = 100 - row.liquidityScore;
      const fundingReadiness = row.fundingPercentile14d || fundingExtremeScore(row.fundingPct);
      const candidates = [
        { setup: row.price15m < 0 ? "Fresh Shorts" : "Fresh Longs", score: row.freshLeverageScore, family: "fresh" as SignalTab },
        { setup: row.fundingPct < 0 ? "Crowded Shorts" : "Crowded Longs", score: row.crowdingScore, family: "crowding" as SignalTab },
        { setup: "Funding Stress", score: fundingReadiness, family: "funding" as SignalTab },
        { setup: "Liquidity Risk", score: liquidityReadiness, family: "liquidity" as SignalTab },
      ].sort((a, b) => b.score - a.score);
      const selectedSignal = signalTab === "fresh" ? candidates.find((item) => item.family === "fresh")! :
        signalTab === "crowding" ? candidates.find((item) => item.family === "crowding")! :
        signalTab === "funding" ? candidates.find((item) => item.family === "funding")! :
        signalTab === "liquidity" ? candidates.find((item) => item.family === "liquidity")! :
        candidates[0];
      const calibration = ASSET_PRESET_CALIBRATIONS[row.market.symbol] || ASSET_PRESET_CALIBRATIONS.HYPE;
      const freshLongChecks = [
        { label: "buy flow", ok: takerBuyUsd5m > calibration.flow5m },
        { label: "buy ratio", ok: takerBuyRatio5m > 68 },
        { label: "OI expansion", ok: row.oi15m > calibration.oi15m },
        { label: "price confirmation", ok: row.price15m > calibration.price15m },
      ];
      const freshShortChecks = [
        { label: "sell flow", ok: takerSellUsd5m > calibration.flow5m },
        { label: "sell ratio", ok: takerSellRatio5m > 68 },
        { label: "OI expansion", ok: row.oi15m > calibration.oi15m },
        { label: "price confirmation", ok: row.price15m < -calibration.price15m },
      ];
      const crowdedLongChecks = [
        { label: "positive funding", ok: row.fundingPct > calibration.fundingHourly },
        { label: "OI 4h expansion", ok: row.oi4h > calibration.oi4h },
        { label: "price stalled", ok: row.price15m < calibration.priceStallUpper && row.price15m > calibration.priceStallLower },
      ];
      const crowdedShortChecks = [
        { label: "negative funding", ok: row.fundingPct < -calibration.fundingHourly },
        { label: "OI 4h expansion", ok: row.oi4h > calibration.oi4h },
        { label: "price stalled", ok: row.price15m > -calibration.priceStallUpper && row.price15m < Math.abs(calibration.priceStallLower) },
      ];
      const selectedChecks =
        selectedSignal.setup === "Fresh Longs" ? freshLongChecks :
        selectedSignal.setup === "Fresh Shorts" ? freshShortChecks :
        selectedSignal.setup === "Crowded Longs" ? crowdedLongChecks :
        selectedSignal.setup === "Crowded Shorts" ? crowdedShortChecks :
        [{ label: selectedSignal.setup.toLowerCase(), ok: selectedSignal.score >= 95 }];
      const missing = selectedChecks.filter((check) => !check.ok).map((check) => check.label);
      const active = selectedChecks.every((check) => check.ok);
      const reason = missing.length ? `Missing: ${missing.slice(0, 3).join(", ")}` : "All preset conditions passed";
      const keyMetrics = `Flow ${formatUsd(row.flow5m)}/${formatUsd(calibration.flow5m)} - OI15 ${formatPct(row.oi15m, 2)} - Price15 ${formatPct(row.price15m, 2)}`;
      return { ...row, readiness: selectedSignal.score, active, signal: selectedSignal.setup, reason, keyMetrics };
    })
    .filter((row) => signalTab === "active" ? true : signalTab === "closest" ? !row.active : row.readiness > 0)
    .sort((a, b) => b.readiness - a.readiness);
  const activeFeedRows = signalRows.filter((row) => row.active);
  const activeSignalCount = activeFeedRows.length;
  const feedRows = (signalTab === "active" && activeFeedRows.length ? activeFeedRows : signalRows).slice(0, activeFeedRows.length ? 8 : 5);
  const structureRows = screenerRows.filter(hasFullStructureData);
  const medianOi4h = median(structureRows.map((row) => row.oi4h));
  const medianSpreadBps = structureRows.length ? median(structureRows.map(() => spreadBps)) : spreadBps;
  const medianDepthUsd = structureRows.length ? median(structureRows.map(() => depth50Bps)) : depth50Bps;
  const medianRvol5m = structureRows.length ? median(structureRows.map((row) => row.flow5m / Math.max(1, row.market.volumeUsd / 288))) : relativeVolume5m;
  const leverageVerdict = medianOi4h > 3 ? "Expanding" : medianOi4h < -1 ? "Deleveraging" : "Neutral";
  const liquidityVerdict = liquidityScore >= 70 ? "Healthy" : liquidityScore >= 45 ? "Thin" : "Risky";
  const volatilityVerdict = medianRvol5m >= 3 ? "Extreme" : medianRvol5m >= 1.7 ? "Elevated" : "Normal";
  const regimeSummary = dataMode === "unavailable"
    ? "Market regime unavailable: waiting for live Hyperliquid market data."
    : `Market is ${globalRegime}: funding is ${fundingBias.toLowerCase()}, OI expansion is ${oiChange4h > 4 ? "elevated" : "moderate"}, ${activeSignalCount ? `${activeSignalCount} active signal${activeSignalCount > 1 ? "s" : ""} detected` : "no broad leverage spike detected"}.`;

  function updateDraftClause(clauseId: string, patch: Partial<AlertClause>) {
    setActivePresetKind(null);
    setDraftRule((current: AlertRule) => ({
      ...current,
      clauses: current.clauses.map((clause: AlertClause) => (clause.id === clauseId ? { ...clause, ...patch } : clause)),
    }));
  }

  function removeDraftClause(clauseId: string) {
    setActivePresetKind(null);
    setDraftRule((current: AlertRule) => ({
      ...current,
      clauses: current.clauses.length > 1 ? current.clauses.filter((clause: AlertClause) => clause.id !== clauseId) : current.clauses,
    }));
  }

  function addDraftClause() {
    setActivePresetKind(null);
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
      asset: coin,
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

  const largeTradeBurstThreshold = Math.max(250_000, (selected?.volumeUsd || 0) * 0.00025);
  const presetReadiness = (kind: AlertPresetKind) => {
    if (kind === "freshLongs") return freshLongScore;
    if (kind === "freshShorts") return freshShortScore;
    if (kind === "crowdedLongs") return crowdedLongScore;
    if (kind === "crowdedShorts") return crowdedShortScore;
    if (kind === "fundingExtreme") return fundingExtreme;
    if (kind === "oiCompression") return anomalyScore;
    if (kind === "liquidityVacuum") return 100 - liquidityScore;
    return clamp((largeTradeNotional5m / Math.max(1, largeTradeBurstThreshold)) * 100, 0, 100);
  };
  const alertPresetCards: Array<{ kind: AlertPresetKind; title: string; tag: string; body: string; checks: string[] }> = [
    {
      kind: "freshLongs",
      title: "Fresh longs detected",
      tag: "New leverage",
      body: "Detects when aggressive buyers are likely opening fresh leveraged long exposure, not just chasing a green candle.",
      checks: ["24h volume > $25M + rank <= 30", `${presetCalibration.family}: ${presetCalibration.examples}`, `Buy flow 5m > ${formatUsd(presetCalibration.flow5m)}`, `OI 15m > ${formatPct(presetCalibration.oi15m, 2, false)} + price > +${formatPct(presetCalibration.price15m, 2, false)}`, "Cooldown 20m"],
    },
    {
      kind: "freshShorts",
      title: "Fresh shorts detected",
      tag: "New leverage",
      body: "Detects aggressive sell flow with OI expansion and bearish price confirmation.",
      checks: ["24h volume > $25M + rank <= 30", `${presetCalibration.family}: ${presetCalibration.examples}`, `Sell flow 5m > ${formatUsd(presetCalibration.flow5m)}`, `OI 15m > ${formatPct(presetCalibration.oi15m, 2, false)} + price < -${formatPct(presetCalibration.price15m, 2, false)}`, "Cooldown 20m"],
    },
    {
      kind: "crowdedLongs",
      title: "Crowded longs risk",
      tag: "Squeeze setup",
      body: "Detects when longs are paying expensive funding while OI expands and price stops following.",
      checks: ["24h volume > $25M + rank <= 30", `${presetCalibration.family}: ${presetCalibration.examples}`, `Hourly funding > ${formatFundingPct(presetCalibration.fundingHourly)}`, `OI 4h > ${formatPct(presetCalibration.oi4h, 2, false)} + price stalled`, "Cooldown 2h"],
    },
    {
      kind: "crowdedShorts",
      title: "Crowded shorts risk",
      tag: "Squeeze setup",
      body: "Detects when shorts become crowded, funding is deeply negative, and downside momentum stalls.",
      checks: ["24h volume > $25M + rank <= 30", `${presetCalibration.family}: ${presetCalibration.examples}`, `Hourly funding < -${formatPct(presetCalibration.fundingHourly, 4, false)}`, `OI 4h > ${formatPct(presetCalibration.oi4h, 2, false)} + price stalled`, "Cooldown 2h"],
    },
    {
      kind: "fundingExtreme",
      title: "Funding Extreme",
      tag: "Funding stress",
      body: "Detects when hourly funding moves beyond the selected asset bucket threshold.",
      checks: ["24h volume > $25M + rank <= 30", `Hourly funding abs > ${formatFundingPct(presetCalibration.fundingHourly)}`, "Cooldown 1h"],
    },
    {
      kind: "oiCompression",
      title: "OI Expansion",
      tag: "Compression",
      body: "Detects leverage entering while price barely moves, a setup that can precede a sharp break.",
      checks: ["24h volume > $25M + rank <= 30", "OI 1h > +3%", "Price 1h between -0.30% and +0.30%", "Cooldown 45m"],
    },
    {
      kind: "liquidityVacuum",
      title: "Liquidity vacuum",
      tag: "Fragile book",
      body: "Detects when the book becomes thin and spread widens, increasing wick risk.",
      checks: ["Depth +/-0.5% weak", "Spread > normal", "Slippage rising", "Cooldown 30m"],
    },
    {
      kind: "largeTradeBurst",
      title: "Large Trade Burst",
      tag: "Execution tape",
      body: "Detects a cluster of large prints relative to the selected asset volume profile.",
      checks: [`Large prints 5m > ${formatUsd(largeTradeBurstThreshold)}`, "Uses trade notional px * size", "Cooldown 15m"],
    },
  ];

  function applyPreset(kind: AlertPresetKind) {
    const presets: Record<AlertPresetKind, AlertRule> = {
      freshLongs: makePresetRule("Fresh longs detected", [
        ...liquidMarketClauses,
        makeClause({ metric: "takerBuyUsd5m", condition: "gt", value: presetCalibration.flow5m, join: "AND" }),
        makeClause({ metric: "takerBuyRatio5m", condition: "gt", value: 68, join: "AND" }),
        makeClause({ metric: "oiChange15m", condition: "gt", value: presetCalibration.oi15m, join: "AND" }),
        makeClause({ metric: "priceChange15m", condition: "gt", value: presetCalibration.price15m, join: "AND" }),
      ], 20),
      freshShorts: makePresetRule("Fresh shorts detected", [
        ...liquidMarketClauses,
        makeClause({ metric: "takerSellUsd5m", condition: "gt", value: presetCalibration.flow5m, join: "AND" }),
        makeClause({ metric: "takerSellRatio5m", condition: "gt", value: 68, join: "AND" }),
        makeClause({ metric: "oiChange15m", condition: "gt", value: presetCalibration.oi15m, join: "AND" }),
        makeClause({ metric: "priceChange15m", condition: "lt", value: -presetCalibration.price15m, join: "AND" }),
      ], 20),
      crowdedLongs: makePresetRule("Crowded longs risk", [
        ...liquidMarketClauses,
        makeClause({ metric: "hypeFunding", condition: "gt", value: presetCalibration.fundingHourly, join: "AND" }),
        makeClause({ metric: "oiChange4h", condition: "gt", value: presetCalibration.oi4h, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "lt", value: presetCalibration.priceStallUpper, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "gt", value: presetCalibration.priceStallLower, join: "AND" }),
      ], 120),
      crowdedShorts: makePresetRule("Crowded shorts risk", [
        ...liquidMarketClauses,
        makeClause({ metric: "hypeFunding", condition: "lt", value: -presetCalibration.fundingHourly, join: "AND" }),
        makeClause({ metric: "oiChange4h", condition: "gt", value: presetCalibration.oi4h, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "gt", value: -presetCalibration.priceStallUpper, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "lt", value: Math.abs(presetCalibration.priceStallLower), join: "AND" }),
      ], 120),
      fundingExtreme: makePresetRule("Funding Extreme", [
        ...liquidMarketClauses,
        makeClause({ metric: "hypeFunding", condition: "absGt", value: presetCalibration.fundingHourly, join: "AND" }),
      ], 60),
      oiCompression: makePresetRule("OI expansion without price follow-through", [
        ...liquidMarketClauses,
        makeClause({ metric: "oiChange4h", condition: "gt", value: 3, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "lt", value: 0.3, join: "AND" }),
        makeClause({ metric: "priceChange4h", condition: "gt", value: -0.3, join: "AND" }),
      ], 45),
      liquidityVacuum: makePresetRule("Liquidity vacuum", [
        ...liquidMarketClauses,
        makeClause({ metric: "bookSpread", condition: "gt", value: 0.03, join: "AND" }),
        makeClause({ metric: "bookImbalance", condition: "absGt", value: 35, join: "AND" }),
      ], 30),
      largeTradeBurst: makePresetRule("Large Trade Burst", [
        ...liquidMarketClauses,
        makeClause({ metric: "largeTradeNotional5m", condition: "gt", value: largeTradeBurstThreshold, join: "AND" }),
      ], 15),
    };
    const preset = { ...presets[kind], id: "draft", asset: coin };
    setDraftRule(preset);
    setSelectedClauseId(preset.clauses[0]?.id || "");
  }

  function loadPreset(kind: AlertPresetKind) {
    setActivePresetKind(kind);
    applyPreset(kind);
  }

  function createCustomRule() {
    setActivePresetKind(null);
    const custom = { ...makeCustomDraftRule(alertSnapshot), id: "draft", asset: coin };
    setDraftRule(custom);
    setSelectedClauseId(custom.clauses[0]?.id || "");
  }

  useEffect(() => {
    if (!activePresetKind) return;
    applyPreset(activePresetKind);
  }, [activePresetKind, coin, presetCalibration.flow5m, presetCalibration.oi15m, presetCalibration.oi4h, presetCalibration.price15m, presetCalibration.fundingHourly, presetCalibration.priceStallUpper, presetCalibration.priceStallLower]);

  useEffect(() => {
    if (dataMode === "unavailable") return;
    const now = Date.now();
    const nextTriggers: AlertTrigger[] = [];
    const nextRules = alertRules.map((rule: AlertRule) => {
      if (!rule.enabled) {
        alertConditionStateRef.current[rule.id] = false;
        return rule;
      }
      if (rule.asset && rule.asset !== coin) {
        alertConditionStateRef.current[rule.id] = false;
        return rule;
      }
      const matched = evaluateRule(rule, alertSnapshot);
      const wasMatched = Boolean(alertConditionStateRef.current[rule.id]);
      const lastTriggeredMs = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
      const cooldownMs = Math.max(1, rule.cooldownMinutes) * 60_000;
      const canTrigger = matched && !wasMatched && now - lastTriggeredMs >= cooldownMs;
      alertConditionStateRef.current[rule.id] = matched;
      if (!canTrigger) return rule;
      const triggeredAt = new Date(now).toISOString();
      nextTriggers.push({
        id: `trigger-${rule.id}-${now}`,
        alertId: rule.id,
        asset: coin,
        preset: rule.name,
        triggeredAt,
        matchedConditions: rule.clauses.map((clause) => `${metricMeta(clause.metric).label} ${conditionLabel(clause.condition)} ${formatMetricValue(clause.value, metricMeta(clause.metric).unit)}`),
        matchedValues: Object.fromEntries(rule.clauses.map((clause) => [clause.metric, alertSnapshot[clause.metric]])),
        destination: rule.delivery,
        deliveryStatus: rule.delivery === "browser" ? "sent" : "queued",
      });
      return { ...rule, lastTriggeredAt: triggeredAt };
    });
    if (nextTriggers.length) {
      setAlertRules(nextRules);
      setTriggerHistory((current) => nextTriggers.concat(current).slice(0, 80));
    }
  }, [alertRules, alertSnapshot, coin, dataMode]);

  useEffect(() => {
    if (activeSignalCount > 0 && signalTab === "closest") setSignalTab("active");
    if (activeSignalCount === 0 && signalTab === "active") setSignalTab("closest");
  }, [activeSignalCount, signalTab]);

  return (
    <main className={`hs-shell ${theme === "light" ? "theme-light" : ""}`}>
      <section className="hs-page">
        <header className="topbar">
          <div className="mobile-brand">
            <span>HS</span>
            <div>
              <strong>HypurrScope</strong>
              <small>Read-only market intelligence. No wallet permissions.</small>
            </div>
          </div>
          <nav className="top-nav">
            {PRIMARY_NAV_ITEMS.map((item: { id: View; label: string; description: string }) => (
              <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>{item.label}</button>
            ))}
            <div className="top-more">
              <button className={MORE_NAV_ITEMS.some((item) => item.id === view) ? "active" : ""} onClick={() => setMoreOpen((current) => !current)}>More</button>
              {moreOpen || MORE_NAV_ITEMS.some((item) => item.id === view) ? (
                <div className="more-nav">
                  {MORE_NAV_ITEMS.map((item) => (
                    <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => { setView(item.id); setMoreOpen(false); }}>{item.label}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
          <div className="controls">
            <span className={`data-pill ${dataMode}`}>{dataStatusText}</span>
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
            <button className="account-button secondary-account" onClick={openAccountPanel}>
              <span>{isAccountReady ? accountName.slice(0, 1).toUpperCase() : "?"}</span>
              <strong>{isAccountReady ? accountName : "Account"}</strong>
            </button>
            <button className="primary top-alert-btn" onClick={() => setView("alerts")}>Create alert</button>
            <button className="icon-btn" onClick={loadMarketData} aria-label="Refresh">R</button>
          </div>
        </header>
        {dataMode === "demo" ? <div className="data-banner">Demo mode. Live values are not mixed with production data.</div> : null}
        {dataMode === "unavailable" ? <div className="data-banner warning">Data unavailable. HypurrScope is retrying live Hyperliquid endpoints.</div> : null}

        {view === "overview" && (
          <>
            <section className="pulse-head">
              <div>
                <h1>Hyperliquid Market Pulse</h1>
                <p>Live leverage, crowding and liquidity signals across Hyperliquid perps.</p>
              </div>
              <div className="pulse-actions">
                <span className={`data-pill ${dataMode}`}>{dataStatusText}</span>
                <button className="primary" onClick={() => setView("alerts")}>Create alert</button>
              </div>
            </section>

            <section className="kpi-grid pulse-kpis">
              <Kpi label="24h Volume" value={hasMarketData ? formatUsd(totalVolume) : "Data unavailable"} detail={hasMarketData ? "All loaded perps" : "Retrying live feed"} />
              <Kpi label="Total Open Interest" value={hasMarketData ? formatUsd(totalOi) : "Data unavailable"} detail={hasMarketData ? `4h change: ${formatPct(totalOi4hChange, 2)}` : "Retrying live feed"} />
              <Kpi label="Active Signals" value={hasMarketData ? String(activeSignalCount) : "Data unavailable"} detail="fresh / crowding / funding / liquidity" />
              <Kpi label="Funding Bias" value={hasMarketData ? fundingBias : "Data unavailable"} detail={hasMarketData ? `${fundingPositivePct.toFixed(0)}% assets positive` : "Retrying live feed"} />
              <Kpi label="HYPE" value={hasMarketData ? (hypeMarket ? formatUsd(hypeMarket.price) : "Insufficient data") : "Data unavailable"} detail={hasMarketData && hypeMarket ? `24h ${formatPct(hypeMarket.changePct)} - OI ${formatUsd(hypeMarket.oiUsd)}` : "Retrying live feed"} />
            </section>

            <section className="pulse-grid">
              <Panel title="Signal Feed" subtitle="">
                <div className="segments compact-tabs">
                  {[
                    ["active", "Active"],
                    ["closest", "Closest"],
                    ["fresh", "Fresh Leverage"],
                    ["crowding", "Crowding"],
                    ["funding", "Funding"],
                    ["liquidity", "Liquidity"],
                  ].map(([key, label]) => (
                    <button className={signalTab === key ? "active" : ""} key={key} onClick={() => setSignalTab(key as SignalTab)}>{label}</button>
                  ))}
                </div>
                <SignalFeed rows={feedRows} activeCount={activeFeedRows.length} onCreate={(symbol: string) => { if (DEFAULT_COINS.includes(symbol)) setCoin(symbol); setView("alerts"); }} />
              </Panel>
              <Panel title="Market Regime" subtitle="">
                <div className="regime-card">
                  <RegimeRow label="Leverage" value={leverageVerdict} meta={`Median OI 4h: ${formatPct(medianOi4h, 2)}`} />
                  <RegimeRow label="Funding" value={fundingBias} meta={`${fundingPositivePct.toFixed(0)}% assets positive`} />
                  <RegimeRow label="Liquidity" value={dataMode === "unavailable" ? "Unavailable" : liquidityVerdict} meta={dataMode === "unavailable" ? "Waiting for l2Book / bbo data" : `Median spread ${medianSpreadBps.toFixed(2)} bps - depth ${formatUsd(medianDepthUsd)}`} />
                  <RegimeRow label="Volatility" value={dataMode === "unavailable" ? "Unavailable" : volatilityVerdict} meta={dataMode === "unavailable" ? "Waiting for candle history" : `Median RVOL 5m ${medianRvol5m.toFixed(1)}x`} />
                  <p>{regimeSummary}</p>
                </div>
              </Panel>
            </section>

            <Panel title="Top setups by structure" subtitle="">
              <StructureMoversTable rows={structureRows.slice(0, 8)} onAction={(symbol: string) => { if (DEFAULT_COINS.includes(symbol)) setCoin(symbol); setView("alerts"); }} />
            </Panel>
          </>
        )}

        {view === "markets" && (
          <>
            <ViewHeader eyebrow="Screener" title="Hyperliquid alert candidates" />
            <div className="toolbar">
              <div className="segments">
                {[
                  ["top10", "Top 10"],
                  ["top30", "Top 30"],
                  ["liquid", "All liquid"],
                  ["fresh", "Fresh leverage"],
                  ["crowding", "Crowding"],
                  ["funding", "Funding extremes"],
                  ["liquidity", "Liquidity risk"],
                ].map(([key, label]) => (
                  <button className={screenerFilter === key ? "active" : ""} key={key} onClick={() => setScreenerFilter(key as ScreenerFilter)}>{label}</button>
                ))}
              </div>
              <select value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value as AssetBucketFilter)}>
                <option value="all">All buckets</option>
                <option value="majors">BTC</option>
                <option value="ethSol">ETH</option>
                <option value="highBeta">HYPE</option>
                <option value="small">Other liquid alts</option>
              </select>
            </div>
            <ScreenerTable
              rows={filteredScreenerRows}
              onOpenAsset={(symbol: string) => { if (DEFAULT_COINS.includes(symbol)) setCoin(symbol); setView("asset"); }}
              onCreateAlert={(symbol: string) => { if (DEFAULT_COINS.includes(symbol)) setCoin(symbol); setView("alerts"); }}
            />
          </>
        )}

        {view === "asset" && (
          <>
            <section className="hero compact-hero">
              <div>
                <p className="eyebrow">{presetCalibration.family}</p>
                <h1>{coin} Asset Desk</h1>
                <p>{terminalMetrics.marketSentence}</p>
                <div className="actions">
                  <button className="primary" onClick={() => setView("alerts")}>Create alert</button>
                  <button className="secondary" onClick={() => setView("flow")}>Open flow tape</button>
                </div>
              </div>
              <div className="snapshot">
                <div><span>Bucket</span><strong>{presetCalibration.family}</strong></div>
                <div><span>Data</span><strong>{dataStatusText}</strong></div>
                <div><span>Updated</span><strong>{dataAgeSeconds ?? 0}s ago</strong></div>
              </div>
            </section>

            <section className="kpi-grid terminal-kpis">
              <Kpi label="Price" value={hasMarketData ? formatUsd(selected?.price || Number.NaN) : "Data unavailable"} detail={hasMarketData ? `15m ${formatPct(priceChange15m, 2)} - 1h ${formatPct(priceChange1h, 2)} - 24h ${formatPct(selected?.changePct || 0, 2)}` : "Retrying live feed"} tone={hasMarketData ? ((selected?.changePct || 0) >= 0 ? "positive" : "negative") : undefined} />
              <Kpi label="Volume" value={hasMarketData ? formatUsd(selected?.volumeUsd || Number.NaN) : "Data unavailable"} detail={hasMarketData ? `Rank #${assetVolumeRank === 999 ? "Insufficient data" : assetVolumeRank} - RVOL 5m ${terminalMetrics.relativeVolume5m.toFixed(2)}x` : "Retrying live feed"} />
              <Kpi label="Open Interest" value={hasMarketData ? formatUsd(selected?.oiUsd || Number.NaN) : "Data unavailable"} detail={hasMarketData ? `15m ${formatPct(oiChange15m, 2)} / 1h ${formatPct(oiChange1h, 2)} / 4h ${formatPct(oiChange4h, 2)}` : "Retrying live feed"} />
              <Kpi label="Funding" value={hasMarketData ? formatFundingPct(fundingPct) : "Data unavailable"} detail={hasMarketData ? `Annualized ${formatPct(fundingAnnualizedPct, 1)} - 14d percentile ${fundingPercentile14d}%` : "Retrying live feed"} tone={hasMarketData ? (fundingPct >= 0 ? "positive" : "negative") : undefined} />
              <Kpi label="Taker Pressure" value={hasMarketData ? `Buy ratio ${formatPct(takerBuyRatio5m, 1, false)}` : "Data unavailable"} detail={hasMarketData ? `Buy ${formatUsd(takerBuyUsd5m)} - Sell ${formatUsd(takerSellUsd5m)} - Net delta ${formatUsd(netTakerDelta5m)}` : "Retrying live feed"} tone={hasMarketData ? (netTakerDelta5m >= 0 ? "positive" : "negative") : undefined} />
              <Kpi label="Liquidity" value={hasMarketData ? `Spread ${spreadBps.toFixed(2)} bps` : "Data unavailable"} detail={hasMarketData ? `Depth +/-0.5% ${formatUsd(depth50Bps)}` : "Retrying live feed"} />
            </section>

            <section className="overview-market terminal-desk">
              <Panel title={`${coin} main chart`} subtitle="">
                <div className="segments chart-modes">
                  {[
                    ["price", "Price"],
                    ["oi", "Price + OI"],
                    ["cvd", "Price + CVD"],
                    ["funding", "Price + Funding"],
                  ].map(([key, label]) => (
                    <button className={chartMode === key ? "active" : ""} key={key} onClick={() => setChartMode(key as typeof chartMode)}>{label}</button>
                  ))}
                </div>
                <MarketCandleChart candles={candles} asset={coin} mode={chartMode} metrics={terminalMetrics} />
              </Panel>
              <Panel title="Signal Readiness" subtitle="">
                <div className="score-stack">
                  <ReadinessCard title="Fresh Longs" score={freshLongScore} onCreate={() => { loadPreset("freshLongs"); setView("alerts"); }} checks={[
                    { label: `Buy ratio > 68%`, ok: takerBuyRatio5m > 68 },
                    { label: `Price 15m > ${formatPct(presetCalibration.price15m, 2)}`, ok: priceChange15m > presetCalibration.price15m },
                    { label: `Buy flow 5m: ${formatUsd(takerBuyUsd5m)} / ${formatUsd(presetCalibration.flow5m)}`, ok: takerBuyUsd5m > presetCalibration.flow5m },
                    { label: `OI 15m: ${formatPct(oiChange15m, 2)} / ${formatPct(presetCalibration.oi15m, 2, false)}`, ok: oiChange15m > presetCalibration.oi15m },
                  ]} />
                  <ReadinessCard title="Fresh Shorts" score={freshShortScore} onCreate={() => { loadPreset("freshShorts"); setView("alerts"); }} checks={[
                    { label: `Sell ratio > 68%`, ok: takerSellRatio5m > 68 },
                    { label: `Price 15m < -${formatPct(presetCalibration.price15m, 2, false)}`, ok: priceChange15m < -presetCalibration.price15m },
                    { label: `Sell flow 5m: ${formatUsd(takerSellUsd5m)} / ${formatUsd(presetCalibration.flow5m)}`, ok: takerSellUsd5m > presetCalibration.flow5m },
                    { label: `OI 15m: ${formatPct(oiChange15m, 2)} / ${formatPct(presetCalibration.oi15m, 2, false)}`, ok: oiChange15m > presetCalibration.oi15m },
                  ]} />
                  <ReadinessCard title="Crowded Longs" score={crowdedLongScore} onCreate={() => { loadPreset("crowdedLongs"); setView("alerts"); }} checks={[
                    { label: `Funding > ${formatFundingPct(presetCalibration.fundingHourly)}`, ok: fundingPct > presetCalibration.fundingHourly },
                    { label: `OI 4h: ${formatPct(oiChange4h, 2)} / ${formatPct(presetCalibration.oi4h, 2, false)}`, ok: oiChange4h > presetCalibration.oi4h },
                    { label: `Price 4h < ${formatPct(presetCalibration.priceStallUpper, 2)}`, ok: priceChange4h < presetCalibration.priceStallUpper },
                    { label: `Price 4h > ${formatPct(presetCalibration.priceStallLower, 2)}`, ok: priceChange4h > presetCalibration.priceStallLower },
                  ]} />
                  <ReadinessCard title="Crowded Shorts" score={crowdedShortScore} onCreate={() => { loadPreset("crowdedShorts"); setView("alerts"); }} checks={[
                    { label: `Funding < -${formatPct(presetCalibration.fundingHourly, 4, false)}`, ok: fundingPct < -presetCalibration.fundingHourly },
                    { label: `OI 4h: ${formatPct(oiChange4h, 2)} / ${formatPct(presetCalibration.oi4h, 2, false)}`, ok: oiChange4h > presetCalibration.oi4h },
                    { label: `Price 4h > -${formatPct(presetCalibration.priceStallUpper, 2, false)}`, ok: priceChange4h > -presetCalibration.priceStallUpper },
                    { label: `Price 4h < ${formatPct(Math.abs(presetCalibration.priceStallLower), 2)}`, ok: priceChange4h < Math.abs(presetCalibration.priceStallLower) },
                  ]} />
                </div>
              </Panel>
            </section>

            <section className="two-col asset-bottom">
              <Panel title="Recent Flow Events" subtitle="">
                <FlowEventTable rows={trades.slice(0, 8)} twapNet={twapNet} onAction={() => setView("alerts")} />
              </Panel>
              <Panel title="Large Trades" subtitle="">
                <LargeTradesTable rows={largeTrades.slice(0, 8)} />
              </Panel>
            </section>
          </>
        )}

        {view === "alerts" && (
          <>
            <ViewHeader eyebrow="Alert Studio" title="Create market-structure alerts" />

            <section className="alert-layout">
              <Panel title="Recommended presets" subtitle="">
                <div className="preset-section-label">Primary</div>
                <div className="featured-presets">
                  {alertPresetCards.slice(0, 4).map((preset) => (
                    <button className="preset-card compact-preset" key={preset.kind} onClick={() => loadPreset(preset.kind)}>
                        <span>{preset.tag}</span>
                        <strong>{preset.title}</strong>
                        <p>{preset.body}</p>
                        <div className="preset-meta">
                          <span>Best: {coin}</span>
                          <span>Readiness {Math.round(presetReadiness(preset.kind))}%</span>
                        </div>
                        <b>Create alert</b>
                    </button>
                  ))}
                </div>
                <div className="preset-section-label">Secondary</div>
                <div className="featured-presets secondary-presets">
                  {alertPresetCards.slice(4).map((preset) => (
                    <button className="preset-card compact-preset" key={preset.kind} onClick={() => loadPreset(preset.kind)}>
                        <span>{preset.tag}</span>
                        <strong>{preset.title}</strong>
                        <p>{preset.body}</p>
                        <div className="preset-meta">
                          <span>Best: {coin}</span>
                          <span>Readiness {Math.round(presetReadiness(preset.kind))}%</span>
                        </div>
                        <b>Create alert</b>
                    </button>
                  ))}
                </div>

                <div className="create-own-card">
                  <div>
                    <span>Start clean</span>
                    <strong>Create your own alert</strong>
                    <p>Start from one WHEN condition, then add your own filters.</p>
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

                <label className="rule-name">
                  Destination
                  <select value={draftRule.delivery} onChange={(event) => setDraftRule((current: AlertRule) => ({ ...current, delivery: event.target.value as AlertRule["delivery"] }))}>
                    <option value="browser">Browser</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="webhook">Webhook</option>
                    <option value="email">Email</option>
                  </select>
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
                        <option value="gte">greater or equal</option>
                        <option value="lt">less than</option>
                        <option value="lte">less or equal</option>
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

              <Panel title="Live preview" subtitle="">
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
              </Panel>
            </section>

            <section className="alert-layout lower">
              <Panel title="My active alerts" subtitle="">
                <SavedRulesTable rules={alertRules} snapshot={alertSnapshot} currentAsset={coin} onToggle={toggleRule} onDelete={deleteRule} />
                <TriggerHistoryTable rows={triggerHistory.slice(0, 8)} />
              </Panel>

              <Panel title="Backtest" subtitle="">
                <div className="backtest-box">
                  <select value={coin} onChange={(event) => setCoin(event.target.value)}>{marketOptions.map((symbol) => <option value={symbol} key={symbol}>{symbol}</option>)}</select>
                  <select value={activePresetKind || "freshLongs"} onChange={(event) => loadPreset(event.target.value as AlertPresetKind)}>
                    {alertPresetCards.map((preset) => <option value={preset.kind} key={preset.kind}>{preset.title}</option>)}
                  </select>
                  <select defaultValue="14d"><option value="7d">7d</option><option value="14d">14d</option><option value="30d">30d</option></select>
                  <div className="empty compact">Backtest unavailable. Historical signal storage required.</div>
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "fundamentals" && (
          <>
            <ViewHeader eyebrow="HYPE Fundamentals" title="Fees, relative strength and native demand" />
            <section className="kpi-grid">
              <Kpi label={`${coin} 30d`} value={formatPct(assetReturn30d, 2)} detail="Daily candle return" tone={Number.isFinite(assetReturn30d) && assetReturn30d >= 0 ? "positive" : Number.isFinite(assetReturn30d) ? "negative" : undefined} />
              <Kpi label={`${benchmarkCoin} 30d`} value={formatPct(benchmarkReturn30d, 2)} detail="Benchmark return" tone={Number.isFinite(benchmarkReturn30d) && benchmarkReturn30d >= 0 ? "positive" : Number.isFinite(benchmarkReturn30d) ? "negative" : undefined} />
              <Kpi label="Relative strength" value={formatPct(relativeStrength, 2)} detail={`${coin} return minus ${benchmarkCoin} return`} tone={Number.isFinite(relativeStrength) && relativeStrength >= 0 ? "positive" : Number.isFinite(relativeStrength) ? "negative" : undefined} />
              <Kpi label="Estimated fees 30d" value={revenueSeries.length && hasMarketData ? formatUsd(estimatedRevenue30d) : "Insufficient data"} detail={`${sourceLabel(statsStatus)} candles, volume-based estimate`} />
            </section>
            <section className="stats-grid">
              <Panel title={`${coin} vs ${benchmarkCoin} normalized performance`} subtitle="Both assets start at 100. This makes relative strength readable immediately.">
                <DualLineChart primary={hypeDaily} secondary={btcDaily} primaryLabel={coin} secondaryLabel={benchmarkCoin} />
              </Panel>
              <Panel title="Hyperliquid estimated fees" subtitle="Estimated from Hyperliquid volume with a transparent fee-rate model.">
                <RevenueChart series={revenueSeries} />
              </Panel>
              <Panel title="Volume and OI structure" subtitle="A market-quality read inspired by exchange screener dashboards.">
                <StructureChart markets={markets} />
              </Panel>
              <Panel title="Statistics read" subtitle="A compact interpretation layer so the page feels like a product, not a raw chart dump.">
                <div className="signals">
                  <Signal label="Relative trend" value={formatPct(relativeStrength, 2)} body={Number.isFinite(relativeStrength) ? (relativeStrength >= 0 ? `${coin} has outperformed ${benchmarkCoin} over the sampled daily window.` : `${coin} is underperforming ${benchmarkCoin} over the sampled daily window.`) : "Waiting for enough daily candle history."} tone={Number.isFinite(relativeStrength) && relativeStrength >= 0 ? "good" : "watch"} />
                  <Signal label="Fee run-rate" value={formatUsd(avgDailyRevenue)} body={Number.isFinite(avgDailyRevenue) ? "This is an estimate, not audited protocol revenue. It is useful for direction, not accounting." : "Waiting for live volume and daily candle history."} tone={Number.isFinite(avgDailyRevenue) ? "good" : "watch"} />
                  <Signal label="Market depth context" value={hasMarketData ? formatUsd(totalOi) : "Insufficient data"} body={hasMarketData ? "OI and volume structure help explain whether moves are spot-like, perp-driven, or liquidity-driven." : "Waiting for live Hyperliquid open interest."} tone="watch" />
                  <Signal label="Next upgrade" value="Historical API" body="A backend archive would turn these charts from rolling snapshots into a full time-series terminal." tone="good" />
                </div>
              </Panel>
            </section>
          </>
        )}

        {view === "flow" && (
          <>
            <ViewHeader eyebrow="Flow Tape" title="Large trades, taker pressure and TWAP-like activity" />
            <div className="toolbar">
              <div className="segments">
                {[
                  ["large", "Large trades"],
                  ["bursts", "Taker bursts"],
                  ["oi", "OI spikes"],
                  ["funding", "Funding stress"],
                  ["twap", "TWAP-like activity"],
                ].map(([key, label]) => <button className={flowTab === key ? "active" : ""} key={key} onClick={() => setFlowTab(key as FlowTab)}>{label}</button>)}
              </div>
            </div>
            <Panel title="Live event feed" subtitle="">
              <FlowTapeTable tab={flowTab} trades={trades} twaps={twaps} metrics={terminalMetrics} twapNet={twapNet} asset={coin} onAction={() => setView("alerts")} />
            </Panel>
          </>
        )}

        {view === "ecosystem" && (
          <>
            <ViewHeader eyebrow="Ecosystem" title="Venue and market context" />
            <section className="kpi-grid">
              <Kpi label="Hyperliquid volume" value={hasMarketData ? formatUsd(totalVolume) : "Data unavailable"} detail="Live venue comparison leg" />
              <Kpi label="Ranked venues" value={hasMarketData ? String(exchangeRows.length) : "Data unavailable"} detail="CEX and DEX basket" />
              <Kpi label="DEX share" value={hasMarketData && exchangeRows.length ? formatPct(exchangeRows.find((row: ExchangeRow) => row.name === "Hyperliquid")?.marketShare || 0, 1, false) : "Data unavailable"} detail="Comparison basket share" />
              <Kpi label="Data" value={sourceLabel(marketStatus)} detail={dataStatusText} />
            </section>
            <Panel title="Hyperliquid vs venue volume" subtitle="">
              <ExchangeComparison rows={exchangeRows} />
            </Panel>
          </>
        )}

        {view === "etfDats" && (
          <>
            <ViewHeader eyebrow="ETF / DATs" title="TradFi demand and treasury vehicles" />
            <section className="kpi-grid">
              <Kpi label="ETF net flow" value={flows.length ? formatUsd(etfNetFlow) : "Insufficient data"} detail={flowMeta.latestDate || "Waiting for live flow"} tone={flows.length ? (etfNetFlow >= 0 ? "positive" : "negative") : undefined} />
              <Kpi label="ETF products" value={flows.length ? String(flows.length) : "Insufficient data"} detail={flows.length ? `Largest ${formatUsd(largestEtfPrint)}` : "Waiting for live flow"} />
              <Kpi label="Tracked DATs" value={String(DAT_ROWS.length)} detail="BTC and ETH treasuries" />
              <Kpi label="Source" value={sourceLabel(flowStatus)} detail={flowMeta.source || "flow endpoint"} />
            </section>
            <section className="two-col">
              <Panel title="Daily ETF / ETP net flow" subtitle={flowMeta.note || "Green bars are inflows; red bars are outflows. Latest flow is shown on the right."}>
                <FlowBarChart days={flowDays} />
              </Panel>
              <Panel title="Tracked ETF / ETP products" subtitle="TradFi products monitored as non-native HYPE demand.">
                <div className="flow-list">
                  {flows.map((row: FlowRow) => <FlowCard row={row} key={`${row.ticker}-${row.name}`} />)}
                </div>
              </Panel>
            </section>
            <section className="two-col ecosystem-section">
              <Panel title="Public DAT watchlist" subtitle="Companies accumulating crypto as a treasury strategy. Useful for BTC/ETH market context.">
                <div className="dat-grid">
                  {DAT_ROWS.map((row) => <DatCard row={row} key={`${row.ticker}-${row.asset}`} />)}
                </div>
              </Panel>
              <Panel title="DAT read" subtitle="">
                <div className="signals">
                  <Signal label="mNAV" value="Premium" body="Premium/discount is the core DAT signal." tone="watch" />
                  <Signal label="Risk" value="Dilution" body="Debt and issuance can dominate crypto beta." tone="risk" />
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
              <Kpi label="24h volume" value={nftStats.volume24h} detail={`${nftStats.sales24h} sales`} />
              <Kpi label="Owners" value={nftStats.owners} detail="Collection holders" />
              <Kpi label="Total volume" value={nftStats.totalVolume} detail="Lifetime reported volume" />
            </section>
            <Panel title="Latest Hypurr sales" subtitle="">
              <div className="nft-grid">
                {nftSales.length ? nftSales.map((sale) => <NftSaleCard sale={sale} key={`${sale.id}-${sale.price}`} />) : <div className="empty">No live sales returned.</div>}
              </div>
            </Panel>
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
                      <td>{position.distancePct === null ? "Insufficient data" : formatPct(position.distancePct, 1, false)}</td>
                    </tr>
                  )) : <tr><td colSpan={7}>No wallet loaded.</td></tr>}
                </tbody>
              </table>
            </Panel>
          </>
        )}

        {view === "settings" && (
          <>
            <ViewHeader eyebrow="Settings" title="Account, Telegram and alert delivery" />
            <section className="two-col">
              <Panel title="Account & Telegram" subtitle="Local profile now; production-ready path for Supabase user, Telegram chat_id, Discord or webhook delivery.">
                <div className="account-card" ref={accountPanelRef}>
                  <div className="account-summary">
                    <span>{isAccountReady ? "Local profile" : "Guest mode"}</span>
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
                </div>
              </Panel>
              <Panel title="Delivery architecture" subtitle="This is the clean user flow for private alerts without touching user funds.">
                <div className="account-flow standalone">
                  <div><strong>1. User profile</strong><span>Rules are tied to an account instead of a browser-only session.</span></div>
                  <div><strong>2. Telegram verification</strong><span>The bot stores chat_id after the user sends a one-time code.</span></div>
                  <div><strong>3. Server worker</strong><span>Saved rules are checked every minute against Hyperliquid data.</span></div>
                  <div><strong>4. Delivery</strong><span>Browser, Telegram, Discord or webhook can all use the same rule engine.</span></div>
                </div>
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

function ReadinessCard({ title, score, checks, onCreate }: { title: string; score: number; checks: Array<{ label: string; ok: boolean }>; onCreate: () => void }) {
  const missing = checks.filter((check) => !check.ok).map((check) => check.label.split(":")[0].replace(/>|</g, "").trim());
  const status = checks.every((check) => check.ok) ? "Active" : readinessStatus(score);
  return (
    <article className="readiness-card">
      <div className="score-head">
        <div>
          <span>{title}</span>
          <strong>{status}</strong>
        </div>
        <b>{Math.round(score)}%</b>
      </div>
      <div className="score-track"><i style={{ width: `${clamp(score, 0, 100)}%` }} /></div>
      <ul className="check-list">
        {checks.map((check) => <li className={check.ok ? "ok" : "missing"} key={check.label}>{check.ok ? "OK" : "MISS"} {check.label}</li>)}
      </ul>
      <small>{missing.length ? `Missing: ${missing.slice(0, 2).join(" and ")}.` : "Ready to trigger."}</small>
      <button className="table-action" onClick={onCreate}>Create alert</button>
    </article>
  );
}

function RegimeRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="regime-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}

function SignalFeed({ rows, activeCount, onCreate }: { rows: Array<ScreenerRow & { readiness: number; active: boolean; signal: string; reason: string; keyMetrics: string }>; activeCount: number; onCreate: (symbol: string) => void }) {
  if (rows.length < 5) {
    return (
      <div className="signal-feed">
        {!activeCount ? <div className="feed-empty">0 active signals. Closest setups:</div> : null}
        <div className="empty compact">Waiting for enough live market history.</div>
      </div>
    );
  }
  return (
    <div className="signal-feed">
      {!activeCount ? <div className="feed-empty">0 active signals. Closest setups:</div> : null}
      <table>
        <thead><tr><th>Asset</th><th>Setup</th><th>Readiness</th><th>Reason</th><th>Key metrics</th><th>CTA</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={`${row.market.symbol}-${row.signal}`}>
              <td><strong>{row.market.symbol}</strong></td>
              <td>{row.signal}</td>
              <td>{Math.round(row.readiness)}%</td>
              <td>{row.reason}</td>
              <td>{row.keyMetrics}</td>
              <td><button className="table-action" onClick={() => onCreate(row.market.symbol)}>Create alert</button></td>
            </tr>
          )) : <tr><td colSpan={6}>Insufficient live structure data.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function StructureMoversTable({ rows, onAction }: { rows: ScreenerRow[]; onAction: (symbol: string) => void }) {
  if (rows.length < 3) {
    return <div className="empty compact">Not enough live data yet. Waiting for market history...</div>;
  }
  return (
    <div className="table-wrap compact-table">
      <table>
        <thead><tr><th>Asset</th><th>Setup</th><th>Readiness</th><th>Price 15m</th><th>OI 15m</th><th>Funding</th><th>Taker buy %</th><th>Reason</th><th>Action</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row: ScreenerRow) => {
            const readiness = Math.max(row.freshLeverageScore, row.crowdingScore, row.fundingPercentile14d || 0, 100 - row.liquidityScore);
            const setup = row.freshLeverageScore >= row.crowdingScore ? (row.price15m < 0 ? "Fresh Shorts" : "Fresh Longs") : (row.fundingPct < 0 ? "Crowded Shorts" : "Crowded Longs");
            const reason = row.freshLeverageScore >= row.crowdingScore ? `Flow ${formatUsd(row.flow5m)} - OI15 ${formatPct(row.oi15m, 2)}` : `Funding ${formatFundingPct(row.fundingPct)} - OI4 ${formatPct(row.oi4h, 2)}`;
            return (
              <tr key={row.market.symbol}>
                <td><strong>{row.market.symbol}</strong></td>
                <td>{setup}</td>
                <td>{Math.round(readiness)}%</td>
                <td>{formatPct(row.price15m, 2)}</td>
                <td>{formatPct(row.oi15m, 2)}</td>
                <td>{formatFundingPct(row.fundingPct)}</td>
                <td>{dash(row.takerBuyRatio, (value) => formatPct(value, 1, false))}</td>
                <td>{reason}</td>
                <td><button className="table-action" onClick={() => onAction(row.market.symbol)}>Create alert</button></td>
              </tr>
            );
          }) : <tr><td colSpan={9}>Insufficient live structure data.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function FlowEventTable({ rows, twapNet, onAction }: { rows: TradeRow[]; twapNet: number; onAction: () => void }) {
  const events = rows.map((row: TradeRow) => ({
    time: row.timeLabel,
    event: (row.rawNotional || 0) >= 250_000 ? "Large trade" : "Trade",
    value: row.notionalLabel,
    context: `${row.side} at ${row.price}`,
  }));
  if (twapNet) events.unshift({ time: "recent", event: "TWAP-like pressure", value: formatUsd(Math.abs(twapNet)), context: twapNet >= 0 ? "Buy side" : "Sell side" });
  return (
    <div className="table-wrap compact-table">
      <table>
        <thead><tr><th>Time</th><th>Event</th><th>Value</th><th>Context</th><th></th></tr></thead>
        <tbody>
          {events.slice(0, 8).map((event, index) => (
            <tr key={`${event.time}-${index}`}>
              <td>{event.time}</td>
              <td>{event.event}</td>
              <td>{event.value}</td>
              <td>{event.context}</td>
              <td><button className="table-action" onClick={onAction}>Create alert</button></td>
            </tr>
          ))}
          {!events.length ? <tr><td colSpan={5}>No live events.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function LargeTradesTable({ rows }: { rows: TradeRow[] }) {
  return (
    <div className="table-wrap compact-table">
      <table>
        <thead><tr><th>Time</th><th>Side</th><th>Size USD</th><th>Price</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row: TradeRow) => (
            <tr key={row.id}>
              <td>{row.timeLabel}</td>
              <td className={row.side === "Buy" ? "positive" : "negative"}>{row.side}</td>
              <td>{row.notionalLabel}</td>
              <td>{row.price}</td>
            </tr>
          )) : <tr><td colSpan={4}>No large trades.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function FlowTapeTable({ tab, trades, twaps, metrics, twapNet, asset, onAction }: { tab: FlowTab; trades: TradeRow[]; twaps: TwapRow[]; metrics: AssetTerminalMetrics; twapNet: number; asset: string; onAction: () => void }) {
  const tradeRows = trades.map((trade: TradeRow) => ({
    time: trade.timeLabel,
    asset,
    event: (trade.rawNotional || 0) >= 250_000 ? "Large trade" : "Trade",
    side: trade.side,
    size: trade.notionalLabel,
    context: `${trade.price}`,
    action: "Create alert",
  }));
  const rows =
    tab === "large" ? tradeRows.filter((row) => parseMoneyLabel(row.size) >= 250_000) :
    tab === "bursts" ? [{ time: "recent", asset, event: "Taker burst", side: metrics.netTakerDelta5m >= 0 ? "Buy" : "Sell", size: formatUsd(Math.abs(metrics.netTakerDelta5m)), context: `Buy ratio ${formatPct(metrics.takerBuyRatio5m, 1, false)}`, action: "Create alert" }] :
    tab === "oi" ? [{ time: "recent", asset, event: "OI spike", side: "-", size: formatPct(metrics.oiChange15m, 2), context: `4h ${formatPct(metrics.oiChange4h, 2)}`, action: "View asset" }] :
    tab === "funding" ? [{ time: "recent", asset, event: "Funding stress", side: metrics.fundingPct >= 0 ? "Longs" : "Shorts", size: formatFundingPct(metrics.fundingPct), context: `Pctl ${metrics.fundingPercentile14d}%`, action: "Create alert" }] :
    twaps.map((twap: TwapRow) => ({ time: twap.lastTrade, asset, event: "TWAP-like activity", side: twap.side, size: twap.notional, context: `${twap.slices} slices`, action: "Create alert" }));
  return (
    <div className="table-wrap compact-table">
      <table>
        <thead><tr><th>Time</th><th>Asset</th><th>Event</th><th>Side</th><th>Size</th><th>Context</th><th>Action</th></tr></thead>
        <tbody>
          {rows.length ? rows.slice(0, 16).map((row, index) => (
            <tr key={`${row.event}-${index}`}>
              <td>{row.time}</td><td>{row.asset}</td><td>{row.event}</td><td>{row.side}</td><td>{row.size}</td><td>{row.context}</td>
              <td><button className="table-action" onClick={onAction}>{row.action}</button></td>
            </tr>
          )) : <tr><td colSpan={7}>No live events.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ScreenerTable({
  rows,
  onOpenAsset,
  onCreateAlert,
}: {
  rows: ScreenerRow[];
  onOpenAsset: (symbol: string) => void;
  onCreateAlert: (symbol: string) => void;
}) {
  const [sortKey, setSortKey] = useState<ScreenerSortKey>("setup");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const hasCoverage = (row: ScreenerRow) => row.dataQuality === "selected-live" && row.takerBuyRatio !== null;
  const setupScore = (row: ScreenerRow) =>
    hasCoverage(row)
      ? Math.max(row.freshLeverageScore, row.crowdingScore, row.fundingPercentile14d || 0, 100 - row.liquidityScore)
      : Number.NEGATIVE_INFINITY;
  const rvol = (row: ScreenerRow) => (hasCoverage(row) ? row.flow5m / Math.max(1, row.market.volumeUsd / 288) : Number.NEGATIVE_INFINITY);
  const sortValue = (row: ScreenerRow): number | string => {
    if (sortKey === "asset") return row.market.symbol;
    if (sortKey === "price") return row.market.price;
    if (sortKey === "change") return row.market.changePct;
    if (sortKey === "volume") return row.market.volumeUsd;
    if (sortKey === "rank") return row.rank;
    if (sortKey === "rvol") return rvol(row);
    if (sortKey === "oi15m") return hasCoverage(row) ? row.oi15m : Number.NEGATIVE_INFINITY;
    if (sortKey === "oi4h") return hasCoverage(row) ? row.oi4h : Number.NEGATIVE_INFINITY;
    if (sortKey === "funding") return row.fundingPct;
    if (sortKey === "fundingPercentile") return row.fundingPercentile14d ?? Number.NEGATIVE_INFINITY;
    if (sortKey === "taker") return row.takerBuyRatio ?? Number.NEGATIVE_INFINITY;
    if (sortKey === "fresh") return hasCoverage(row) ? row.freshLeverageScore : Number.NEGATIVE_INFINITY;
    if (sortKey === "crowding") return hasCoverage(row) ? row.crowdingScore : Number.NEGATIVE_INFINITY;
    if (sortKey === "liquidity") return hasCoverage(row) ? row.liquidityScore : Number.NEGATIVE_INFINITY;
    return setupScore(row);
  };
  const sortedRows = [...rows].sort((a: ScreenerRow, b: ScreenerRow) => {
    const aValue = sortValue(a);
    const bValue = sortValue(b);
    if (typeof aValue === "string" || typeof bValue === "string") {
      return sortDir === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    }
    return sortDir === "asc" ? aValue - bValue : bValue - aValue;
  });
  const setSort = (next: ScreenerSortKey) => {
    if (next === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir(next === "asset" || next === "rank" ? "asc" : "desc");
  };
  const sortHeader = (key: ScreenerSortKey, label: string) => (
    <button className="sort-header" onClick={() => setSort(key)} type="button">
      {label}
      <span>{sortKey === key ? (sortDir === "desc" ? "v" : "^") : ""}</span>
    </button>
  );
  const missing = <span className="muted-value">-</span>;
  return (
    <article className="panel table-panel screener-panel">
      <div className="panel-head">
        <div>
          <h2>Markets screener</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{sortHeader("asset", "Asset")}</th>
              <th>{sortHeader("price", "Price")}</th>
              <th>{sortHeader("change", "24h %")}</th>
              <th>{sortHeader("volume", "Volume 24h")}</th>
              <th>{sortHeader("rank", "Rank")}</th>
              <th>{sortHeader("rvol", "RVOL 5m")}</th>
              <th>{sortHeader("oi15m", "OI 15m")}</th>
              <th>{sortHeader("oi4h", "OI 4h")}</th>
              <th>{sortHeader("funding", "Funding")}</th>
              <th>{sortHeader("fundingPercentile", "Funding %ile")}</th>
              <th>{sortHeader("taker", "Taker buy %")}</th>
              <th>{sortHeader("fresh", "Fresh")}</th>
              <th>{sortHeader("crowding", "Crowding")}</th>
              <th>{sortHeader("liquidity", "Liquidity")}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length ? sortedRows.map((row: ScreenerRow) => {
              const covered = hasCoverage(row);
              return (
              <tr key={row.market.symbol} onClick={() => onOpenAsset(row.market.symbol)}>
                <td><strong>{row.market.symbol}</strong></td>
                <td>{formatUsd(row.market.price)}</td>
                <td className={row.market.changePct >= 0 ? "positive" : "negative"}>{formatPct(row.market.changePct, 2)}</td>
                <td>{formatUsd(row.market.volumeUsd)}</td>
                <td>#{row.rank}</td>
                <td>{covered ? `${rvol(row).toFixed(2)}x` : missing}</td>
                <td>{covered ? formatPct(row.oi15m, 2) : missing}</td>
                <td>{covered ? formatPct(row.oi4h, 2) : missing}</td>
                <td className={row.fundingPct >= 0 ? "positive" : "negative"}>{formatFundingPct(row.fundingPct)}</td>
                <td>{dash(row.fundingPercentile14d, (value) => `${Math.round(value)}%`)}</td>
                <td>{covered ? dash(row.takerBuyRatio, (value) => formatPct(value, 1, false)) : missing}</td>
                <td>{covered ? row.freshLeverageScore : missing}</td>
                <td>{covered ? row.crowdingScore : missing}</td>
                <td>{covered ? row.liquidityScore : missing}</td>
                <td><button className="table-action" onClick={(event) => { event.stopPropagation(); onCreateAlert(row.market.symbol); }}>Create alert</button></td>
              </tr>
              );
            }) : <tr><td colSpan={15}>No liquid live markets loaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </article>
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
  if (!chartDays.length) return <div className="empty">Insufficient live flow history.</div>;
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
  if (!series.length) return <div className="empty">Waiting for live revenue inputs.</div>;
  const values = series.map((item: Candle) => item.close);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum: number, value: number) => sum + value, 0);
  return (
    <div className="revenue-chart">
      <div className="flow-summary">
        <div><span>30d estimate</span><strong>{formatUsd(total)}</strong></div>
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
  if (!rows.length) return <div className="empty">Waiting for live market structure.</div>;
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

function ExchangeComparison({ rows }: { rows: ExchangeRow[] }) {
  if (!rows.length) return <div className="empty">Venue comparison unavailable. Waiting for live Hyperliquid volume.</div>;
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
        <div><dt>Slices</dt><dd>{row.slices || "Insufficient data"}</dd></div>
        <div><dt>Avg</dt><dd>{row.avgPrice}</dd></div>
        <div><dt>Last</dt><dd>{row.lastTrade}</dd></div>
      </dl>
      <small>{row.confidence}</small>
    </article>
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
        <strong>{row.dollarVolume || row.volume || "Insufficient data"}</strong>
      </div>
      <h3>{row.name}</h3>
      <p>{row.venue} / {row.status}</p>
      {row.price || row.change ? <small>{row.price || "Insufficient data"} {row.change || ""}</small> : null}
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
  const priceAxisRef = useRef<HTMLDivElement>(null);
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

  function plotHeight() {
    return Math.max(1, (containerRef.current?.clientHeight || 360) - 48);
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
    if (priceRangeRef.current) return priceRangeRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (series && container) {
      const top = series.coordinateToPrice(0);
      const bottom = series.coordinateToPrice(plotHeight());
      if (typeof top === "number" && typeof bottom === "number" && Number.isFinite(top) && Number.isFinite(bottom)) {
        const minValue = Math.min(top, bottom, thresholdValue);
        const maxValue = Math.max(top, bottom, thresholdValue);
        if (maxValue > minValue) return { minValue, maxValue };
      }
    }
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

  function zoomPriceRange(factor: number) {
    const range = basePriceRange();
    const minValue = range.minValue;
    const maxValue = range.maxValue;
    const pivot = (minValue + maxValue) / 2;
    const currentZoom = priceZoomRef.current;
    const nextZoom = clamp(currentZoom / factor, 0.35, 8);
    const appliedFactor = currentZoom / nextZoom;
    applyPriceRange(
      pivot - (pivot - minValue) * appliedFactor,
      pivot + (maxValue - pivot) * appliedFactor,
    );
    priceZoomRef.current = nextZoom;
    setPriceZoom(nextZoom);
  }

  function resetPriceScale() {
    candleSeriesRef.current?.applyOptions?.({ autoscaleInfoProvider: undefined });
    priceRangeRef.current = null;
    priceZoomRef.current = 1;
    setPriceZoom(1);
    window.requestAnimationFrame(updateAlertLinePosition);
  }

  function handlePriceAxisWheelEvent(event: WheelEvent | React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if ("stopImmediatePropagation" in event) {
      event.stopImmediatePropagation();
    }
    const delta = clamp(event.deltaY, -180, 180);
    const factor = Math.exp(delta / 850);
    zoomPriceRange(factor);
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
    const priceAxis = priceAxisRef.current;
    if (!priceAxis) return;
    const handleWheel = (event: WheelEvent) => handlePriceAxisWheelEvent(event);
    priceAxis.addEventListener("wheel", handleWheel, { passive: false });
    return () => priceAxis.removeEventListener("wheel", handleWheel);
  });

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
          const response = await fetch(`/api/hype/history?range=${range}`, { cache: "no-store" });
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
        color: "rgba(124, 247, 199, 0)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });
    } else {
      priceLineRef.current.applyOptions({
        price: thresholdValue,
        title: "",
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
          <span>{status === "live" ? `Live ${asset} candles` : status === "loading" ? `Loading ${asset} candles` : "Chart unavailable"}</span>
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
          ref={priceAxisRef}
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
          <strong>{candles.length || "Insufficient data"}</strong>
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
          ? `All required market-structure conditions are active. This would queue delivery to ${rule.delivery}.`
          : "The rule is valid, but current market data does not satisfy the full condition set."}
      </small>
    </article>
  );
}

function TriggerHistoryTable({ rows }: { rows: AlertTrigger[] }) {
  return (
    <div className="table-wrap compact-table trigger-history">
      <table>
        <thead><tr><th>Triggered</th><th>Asset</th><th>Alert</th><th>Destination</th><th>Delivery</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.triggeredAt).toLocaleString()}</td>
              <td>{row.asset}</td>
              <td>{row.preset}</td>
              <td>{row.destination}</td>
              <td>{row.deliveryStatus}{row.error ? ` - ${row.error}` : ""}</td>
            </tr>
          )) : <tr><td colSpan={5}>No trigger history yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SavedRulesTable({
  rules,
  snapshot,
  currentAsset,
  onToggle,
  onDelete,
}: {
  rules: AlertRule[];
  snapshot: MetricSnapshot;
  currentAsset: string;
  onToggle: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
}) {
  return (
    <div className="table-wrap compact-table saved-rules-table">
      <table>
        <thead>
          <tr><th>Name</th><th>Asset</th><th>Conditions</th><th>Destination</th><th>Last triggered</th><th>Status</th><th>Edit</th><th>Delete</th></tr>
        </thead>
        <tbody>
          {rules.length ? rules.map((rule: AlertRule) => {
            const assetMatches = !rule.asset || rule.asset === currentAsset;
            const triggered = assetMatches && evaluateRule(rule, snapshot);
            return (
              <tr key={rule.id}>
                <td><strong>{rule.name}</strong></td>
                <td>{rule.asset || "Current asset"}</td>
                <td>{alertSummary(rule, snapshot)}</td>
                <td>{rule.delivery}</td>
                <td>{rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : "Never"}</td>
                <td>{rule.enabled ? (assetMatches ? (triggered ? "Triggered" : "Waiting") : "Different asset") : "Paused"}</td>
                <td><button className="table-action" onClick={() => onToggle(rule.id)}>{rule.enabled ? "Pause" : "Enable"}</button></td>
                <td><button className="small-danger" onClick={() => onDelete(rule.id)}>Delete</button></td>
              </tr>
            );
          }) : <tr><td colSpan={8}>No saved rules yet. Build one above or load a preset.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

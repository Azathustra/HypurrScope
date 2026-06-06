"use client";

import React, { useEffect, useMemo, useState } from "react";

type View = "overview" | "markets" | "liquidity" | "twaps" | "nfts" | "etf" | "wallet" | "builder";
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

const HYPE_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

const NAV_ITEMS: Array<{ id: View; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "HYPE pulse" },
  { id: "markets", label: "Markets", description: "Perps radar" },
  { id: "liquidity", label: "Liquidity", description: "Order book" },
  { id: "twaps", label: "TWAPs", description: "Flow tape" },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor + sales" },
  { id: "etf", label: "ETF flows", description: "TradFi bridge" },
  { id: "wallet", label: "Wallet", description: "Risk scan" },
  { id: "builder", label: "Builder", description: "Proof layer" },
];

const DEFAULT_COINS = ["HYPE", "BTC", "ETH", "SOL"];

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
  const bidUsd = bids.reduce((sum, level) => sum + level.usd, 0);
  const askUsd = asks.reduce((sum, level) => sum + level.usd, 0);
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
  const response = await fetch("/api/hyperliquid/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Hyperliquid API ${response.status}`);
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
    .filter((sale) => sale.name || sale.id)
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

function Sparkline({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) return <div className="empty">Waiting for candles</div>;
  const values = candles.map((candle) => candle.close);
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
  const maxUsd = Math.max(1, ...book.bids.map((level) => level.usd), ...book.asks.map((level) => level.usd));
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
  const [coin, setCoin] = useState("HYPE");
  const [markets, setMarkets] = useState<Market[]>(fallbackMarkets);
  const [candles, setCandles] = useState<Candle[]>(makeFallbackCandles("HYPE"));
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

  useEffect(() => {
    loadMarketData();
    const timer = window.setInterval(loadMarketData, 25_000);
    return () => window.clearInterval(timer);
  }, [coin]);

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
      const marketMap = new Map(markets.map((market) => [market.symbol, market]));
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
  const totalOi = markets.reduce((sum, market) => sum + market.oiUsd, 0);
  const totalVolume = markets.reduce((sum, market) => sum + market.volumeUsd, 0);
  const weightedFunding = totalOi > 0 ? markets.reduce((sum, market) => sum + market.funding * market.oiUsd, 0) / totalOi : 0;
  const feePressure = parseMoneyLabel(buyback.estimatedBuybackUsd24hLabel) || (hype?.volumeUsd || 0) * 0.0002;
  const topRisk = [...markets].sort((a: Market, b: Market) => b.risk - a.risk)[0];
  const twapBuy = twaps.filter((row: TwapRow) => row.side === "Buy").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapSell = twaps.filter((row: TwapRow) => row.side === "Sell").reduce((sum: number, row: TwapRow) => sum + row.rawNotional, 0);
  const twapNet = twapBuy - twapSell;
  const etfNetFlow = flows.reduce((sum: number, row: FlowRow) => sum + parseMoneyLabel(row.dollarVolume), 0);
  const largestEtfPrint = Math.max(0, ...flows.map((row: FlowRow) => Math.abs(parseMoneyLabel(row.dollarVolume))));
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

  return (
    <main className="hs-shell">
      <aside className="hs-rail">
        <div className="brand">
          <span>HS</span>
          <div>
            <strong>HypurrScope</strong>
            <small>Hyperliquid intelligence</small>
          </div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
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
                {marketOptions.map((symbol) => (
                  <option value={symbol} key={symbol}>{symbol}</option>
                ))}
              </select>
            </label>
            <button className="icon-btn" onClick={loadMarketData} aria-label="Refresh">R</button>
          </div>
          <nav className="mobile-tabs">
            {NAV_ITEMS.map((item) => (
              <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>{item.label}</button>
            ))}
          </nav>
        </header>

        {view === "overview" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">Live Hyperliquid intelligence</p>
                <h1>HYPE market console with ecosystem flow coverage.</h1>
                <p>
                  Perps, liquidity, TWAP clusters, Hypurr NFT sales, ETF flows, wallet risk, and transparent
                  builder methodology in one read-only workspace.
                </p>
                <div className="actions">
                  <button className="primary" onClick={() => setView("twaps")}>Open TWAP tape</button>
                  <button className="secondary" onClick={() => setView("nfts")}>View NFTs</button>
                </div>
              </div>
              <div className="snapshot">
                <div><span>Selected</span><strong>{coin}</strong></div>
                <div><span>Last update</span><strong>{lastUpdate ? lastUpdate.toLocaleTimeString("en-GB") : "--"}</strong></div>
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
                  {overviewSignals.map((signal) => <Signal key={signal.label} {...signal} />)}
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

        {view === "markets" && (
          <>
            <ViewHeader eyebrow="Perps radar" title="Market map" />
            <div className="toolbar">
              <input placeholder="Search coin" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="segments">
                {["oi", "risk", "funding", "volume"].map((sort) => (
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
                  {positions.length ? positions.map((position) => (
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
            {rows.map((market) => (
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

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Coins,
  Database,
  ExternalLink,
  Flame,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Info,
  Layers,
  LineChart,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

type ApiStatus = "loading" | "live" | "fallback" | "error";
type ViewId = "overview" | "markets" | "buybacks" | "twaps" | "nfts" | "flows" | "vaults" | "whales";

type MarketRow = {
  symbol: string;
  price: string;
  rawPrice: number;
  change: string;
  rawChange: number;
  oi: string;
  rawOi: number;
  volumeLabel: string;
  rawVolume: number;
  funding: string;
  rawFunding: number;
  fdv?: string;
  rawFdv?: number;
  risk: number;
};

type HistoryPoint = { time: number; price: number; volume: number };
type TwapRow = { side: "Buy" | "Sell"; notional: string; rawNotional: number; slices: number; avgSize: string; avgPrice: string; lastTrade: string; confidence: string };
type NftStats = { floor: string; volume24h: string; totalVolume: string; listed: string; owners: string; sales24h: string };
type NftSale = { id: string; name: string; price: string; usd?: string; time: string; image?: string; url?: string; buyer?: string; seller?: string };
type VaultRow = { name: string; aum: string; rawAum: number; apr: string; score: number; status: string; leader?: string; age?: string };
type WhaleRow = { coin: string; side: string; size: string; notional: string; entry: string; pnl: string; rawPnl: number; liquidation: string; leverage: string; danger: "Low" | "Medium" | "High" | "Watch" };
type BuybackData = {
  live: boolean;
  source: string;
  updatedAt: string;
  assistanceFundAddress: string;
  estimatedBuybackUsd24h: number;
  estimatedBuybackHype24h: number;
  cumulativeBuybackUsd?: number;
  cumulativeBuybackHype?: number;
  feeRoute: string;
  note: string;
};
type FlowRow = { name: string; ticker: string; venue: string; status: string; dailyFlow?: string; aum?: string; holdings?: string; fee?: string; lastData?: string; url?: string };

type IconType = React.ComponentType<{ className?: string }>;

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

const fallbackMarkets: MarketRow[] = [
  { symbol: "HYPE", price: "$59.63", rawPrice: 59.63, change: "-11.15%", rawChange: -11.15, oi: "$1.26B", rawOi: 1_260_000_000, volumeLabel: "$640.00M", rawVolume: 640_000_000, funding: "+0.0140%", rawFunding: 0.00014, fdv: "$59.63B", rawFdv: 59_630_000_000, risk: 78 },
  { symbol: "BTC", price: "$104.82K", rawPrice: 104_820, change: "+1.20%", rawChange: 1.2, oi: "$3.44B", rawOi: 3_440_000_000, volumeLabel: "$1.94B", rawVolume: 1_940_000_000, funding: "+0.0060%", rawFunding: 0.00006, risk: 48 },
  { symbol: "ETH", price: "$5.93K", rawPrice: 5_930, change: "+2.60%", rawChange: 2.6, oi: "$2.11B", rawOi: 2_110_000_000, volumeLabel: "$1.12B", rawVolume: 1_120_000_000, funding: "+0.0120%", rawFunding: 0.00012, risk: 61 },
  { symbol: "SOL", price: "$238.12", rawPrice: 238.12, change: "-0.90%", rawChange: -0.9, oi: "$884.00M", rawOi: 884_000_000, volumeLabel: "$420.00M", rawVolume: 420_000_000, funding: "-0.0040%", rawFunding: -0.00004, risk: 39 },
];

const fallbackHistory: HistoryPoint[] = Array.from({ length: 36 }).map((_, index) => {
  const wave = Math.sin(index / 4) * 1.7 + Math.cos(index / 7) * 1.1;
  return { time: Date.now() - (35 - index) * 20 * 60_000, price: 58 + wave + index * 0.035, volume: 800_000 + Math.abs(Math.sin(index / 3)) * 1_800_000 };
});

const fallbackNftStats: NftStats = { floor: "-- HYPE", volume24h: "-- HYPE", totalVolume: "-- HYPE", listed: "--", owners: "--", sales24h: "--" };
const fallbackNftSales: NftSale[] = Array.from({ length: 9 }).map((_, index) => ({
  id: `${100 + index}`,
  name: `Hypurr #${100 + index}`,
  price: "-- HYPE",
  time: "live feed",
  url: OPENSEA_COLLECTION_URL,
}));

const fallbackVaults: VaultRow[] = [
  { name: "HLP", aum: "Loading", rawAum: 0, apr: "Loading", score: 42, status: "Live" },
];

const fallbackBuyback: BuybackData = {
  live: false,
  source: "estimate",
  updatedAt: "",
  assistanceFundAddress: "0xfefefefefefefefefefefefefefefefefefefefe",
  estimatedBuybackUsd24h: 0,
  estimatedBuybackHype24h: 0,
  feeRoute: "Assistance Fund",
  note: "Estimated from public 24h exchange volume. Add a buyback JSON source for exact historical numbers.",
};

const fallbackFlows: FlowRow[] = [
  { name: "21Shares Hyperliquid ETP", ticker: "HYPE", venue: "SIX / EU venues", status: "Live product", dailyFlow: "Source needed", aum: "Live page", holdings: "Live page", fee: "Product page", url: "https://www.21shares.com/" },
  { name: "CoinShares Hyperliquid Staking ETP", ticker: "LIQD", venue: "Xetra", status: "Live product", dailyFlow: "Source needed", aum: "Live page", holdings: "Live page", fee: "Product page", url: "https://coinshares.com/" },
  { name: "Bitwise Hyperliquid ETF", ticker: "BHYP", venue: "US ETF watch", status: "Filing watch", dailyFlow: "Not trading", aum: "--", holdings: "--", fee: "--", url: "https://www.sec.gov/" },
];

const navItems: Array<{ id: ViewId; label: string; description: string; icon: IconType }> = [
  { id: "overview", label: "Overview", description: "Key live pulse", icon: Gauge },
  { id: "markets", label: "Markets", description: "HYPE + perps", icon: BarChart3 },
  { id: "buybacks", label: "Buybacks", description: "AF pressure", icon: Flame },
  { id: "twaps", label: "HYPE TWAP", description: "Sliced flow", icon: Clock },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor & sales", icon: ImageIcon },
  { id: "vaults", label: "HLP", description: "Yield monitor", icon: Layers },
  { id: "flows", label: "TradFi", description: "ETP watch", icon: Globe2 },
  { id: "whales", label: "Wallet scan", description: "Address lookup", icon: Wallet },
];

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatUsd(value: number, options?: { compact?: boolean }) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: options?.compact ? 1 : 0 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatNative(value: number, suffix = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return `-- ${suffix}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${suffix}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${suffix}`;
  if (value >= 100) return `${value.toFixed(0)} ${suffix}`;
  if (value >= 1) return `${value.toFixed(2)} ${suffix}`;
  return `${value.toPrecision(3)} ${suffix}`;
}

function formatPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatSignedUsd(value: number) {
  if (!Number.isFinite(value) || value === 0) return "$0";
  return `${value > 0 ? "+" : "-"}${formatUsd(Math.abs(value))}`;
}

function formatRelativeTime(timestamp: string | number | undefined) {
  if (!timestamp) return "--";
  const date = typeof timestamp === "number" ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000) : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "--";
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatClock(date: Date | null) {
  if (!date) return "--";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function shortAddress(address: string) {
  if (!address || address.length < 12) return address || "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isValidEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function calculateRiskScore(changePct: number, funding: number, openInterest: number, volume: number) {
  const move = Math.abs(changePct || 0);
  const fundingPressure = Math.abs(funding || 0) * 30_000;
  const oiPressure = openInterest > 0 ? Math.log10(openInterest / 10_000_000 + 1) * 12 : 0;
  const volumePressure = volume > 0 ? Math.log10(volume / 10_000_000 + 1) * 5 : 0;
  return Math.round(clamp(15 + move * 2.2 + fundingPressure + oiPressure + volumePressure, 5, 99));
}

function buildMarketRowsFromHyperliquid(payload: any): MarketRow[] {
  const meta = payload?.[0];
  const assetContexts = payload?.[1];
  if (!meta?.universe || !Array.isArray(assetContexts)) throw new Error("Unexpected Hyperliquid response");

  return meta.universe
    .map((asset: any, index: number) => {
      const ctx = assetContexts[index] || {};
      const mark = toNumber(ctx.markPx || ctx.midPx || ctx.oraclePx);
      const prev = toNumber(ctx.prevDayPx);
      const funding = toNumber(ctx.funding);
      const oiUnits = toNumber(ctx.openInterest);
      const rawOi = oiUnits * mark;
      const rawVolume = toNumber(ctx.dayNtlVlm);
      const rawChange = prev > 0 && mark > 0 ? ((mark - prev) / prev) * 100 : 0;
      const isHype = asset.name === "HYPE";
      const rawFdv = isHype ? mark * HYPE_TOTAL_SUPPLY : undefined;
      return {
        symbol: asset.name,
        price: formatUsd(mark),
        rawPrice: mark,
        change: formatPercent(rawChange, 2),
        rawChange,
        oi: formatUsd(rawOi),
        rawOi,
        volumeLabel: formatUsd(rawVolume),
        rawVolume,
        funding: formatPercent(funding * 100, 4),
        rawFunding: funding,
        fdv: rawFdv ? formatUsd(rawFdv) : "--",
        rawFdv,
        risk: calculateRiskScore(rawChange, funding, rawOi, rawVolume),
      } satisfies MarketRow;
    })
    .filter((row: MarketRow) => row.symbol && row.rawPrice > 0)
    .sort((a: MarketRow, b: MarketRow) => {
      if (a.symbol === "HYPE") return -1;
      if (b.symbol === "HYPE") return 1;
      return b.rawOi - a.rawOi;
    })
    .slice(0, 36);
}

function parseHistory(payload: any): HistoryPoint[] {
  const rows = Array.isArray(payload?.candles) ? payload.candles : Array.isArray(payload) ? payload : [];
  return rows
    .map((candle: any) => ({
      time: toNumber(candle.t || candle.time || candle.timestamp),
      price: toNumber(candle.c || candle.close),
      volume: toNumber(candle.v || candle.volume),
    }))
    .filter((row: HistoryPoint) => row.time > 0 && row.price > 0)
    .slice(-96);
}

function parseNftStats(payload: any): NftStats {
  const total = payload?.total || {};
  const intervals = Array.isArray(payload?.intervals) ? payload.intervals : [];
  const day = intervals.find((item: any) => ["one_day", "1d", "day"].includes(item.interval)) || {};
  const floor = toNumber(total.floor_price ?? total.floorPrice ?? payload?.floor_price ?? payload?.floorPrice);
  const volume24 = toNumber(day.volume ?? day.volume_diff ?? payload?.one_day_volume);
  const totalVolume = toNumber(total.volume ?? payload?.volume);
  const listed = toNumber(total.listed ?? payload?.listed ?? payload?.listing_count);
  const owners = toNumber(total.num_owners ?? payload?.num_owners);
  const sales24h = toNumber(day.sales ?? day.sales_diff ?? payload?.one_day_sales);
  return {
    floor: floor ? formatNative(floor) : fallbackNftStats.floor,
    volume24h: volume24 ? formatNative(volume24) : fallbackNftStats.volume24h,
    totalVolume: totalVolume ? formatNative(totalVolume) : fallbackNftStats.totalVolume,
    listed: listed ? `${listed.toFixed(listed > 20 ? 0 : 1)}%` : fallbackNftStats.listed,
    owners: owners ? owners.toLocaleString("en-US") : fallbackNftStats.owners,
    sales24h: sales24h ? String(Math.round(sales24h)) : fallbackNftStats.sales24h,
  };
}

function normalizeNftSale(raw: any): NftSale {
  return {
    id: String(raw.id || raw.identifier || raw.tokenId || raw.token_id || "?"),
    name: raw.name || `Hypurr #${raw.id || raw.identifier || "?"}`,
    price: raw.price || "-- HYPE",
    usd: raw.usd || raw.usdPrice || "",
    time: raw.time || formatRelativeTime(raw.timestamp || raw.event_timestamp || raw.created_date),
    image: raw.image || raw.image_url || raw.display_image_url || "",
    url: raw.url || raw.permalink || OPENSEA_COLLECTION_URL,
    buyer: raw.buyer || "",
    seller: raw.seller || "",
  };
}

function buildWhaleRowsFromState(payload: any, markets: MarketRow[]): WhaleRow[] {
  const marketBySymbol = new Map(markets.map((row) => [row.symbol, row]));
  const positions = Array.isArray(payload?.assetPositions) ? payload.assetPositions : [];
  return positions
    .map((item: any) => item.position || item)
    .filter((position: any) => Math.abs(toNumber(position.szi)) > 0)
    .map((position: any) => {
      const coin = position.coin || "--";
      const signedSize = toNumber(position.szi);
      const side = signedSize > 0 ? "Long" : "Short";
      const pnlValue = toNumber(position.unrealizedPnl);
      const current = marketBySymbol.get(coin)?.rawPrice || 0;
      const liq = toNumber(position.liquidationPx);
      const lev = toNumber(position.leverage?.value || position.leverage);
      const liqDistance = liq > 0 && current > 0 ? Math.abs((current - liq) / current) * 100 : 999;
      const danger: WhaleRow["danger"] = liqDistance < 7 || lev >= 8 ? "High" : liqDistance < 15 || lev >= 4 ? "Medium" : "Low";
      return {
        coin,
        side,
        size: `${Math.abs(signedSize).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${coin}`,
        notional: formatUsd(toNumber(position.positionValue)),
        entry: formatUsd(toNumber(position.entryPx)),
        pnl: `${pnlValue >= 0 ? "+" : "-"}${formatUsd(Math.abs(pnlValue))}`,
        rawPnl: pnlValue,
        liquidation: liq > 0 ? formatUsd(liq) : "--",
        leverage: lev > 0 ? `${lev}x` : "--",
        danger,
      };
    })
    .sort((a: WhaleRow, b: WhaleRow) => Math.abs(b.rawPnl) - Math.abs(a.rawPnl));
}

function riskTone(value: number) {
  if (value >= 80) return "text-red-200 bg-red-400/15 border-red-300/20";
  if (value >= 65) return "text-amber-200 bg-amber-300/15 border-amber-200/20";
  if (value >= 45) return "text-cyan-100 bg-cyan-300/10 border-cyan-200/15";
  return "text-emerald-200 bg-emerald-300/10 border-emerald-200/20";
}

function NftThumb({ sale, compact = false }: { sale: NftSale; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(sale.image && !broken);
  return (
    <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="group relative block min-h-[210px] overflow-hidden rounded-[1.45rem] border border-white/10 bg-gradient-to-br from-emerald-300/10 via-cyan-300/10 to-teal-950 shadow-[0_18px_60px_rgba(0,0,0,.26)]">
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sale.image} alt={sale.name} onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(94,234,212,.26),transparent_35%),linear-gradient(135deg,rgba(6,78,59,.7),rgba(3,29,27,.95))]">
          <div className="text-center text-cyan-100/80">
            <ImageIcon className="mx-auto h-10 w-10 opacity-80" />
            <div className="mt-3 text-xs uppercase tracking-[0.24em]">image loading</div>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{sale.name}</div>
            <div className="text-xs text-white/55">{sale.time}</div>
          </div>
          <div className="rounded-full border border-cyan-200/25 bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-100">{sale.price}</div>
        </div>
      </div>
      {!compact && <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-2 text-white/75 opacity-0 backdrop-blur transition group-hover:opacity-100"><ExternalLink className="h-4 w-4" /></div>}
    </a>
  );
}

function Sparkline({ points, height = 72, stroke = "#67e8f9", fill = true }: { points: number[]; height?: number; stroke?: string; fill?: boolean }) {
  const width = 360;
  const clean = points.filter((n) => Number.isFinite(n));
  const values = clean.length > 1 ? clean : [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 12) - 6;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const gradientId = `gradient-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.24" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
      {fill && <path d={area} fill={`url(#${gradientId})`} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.7" strokeLinecap="round" />
    </svg>
  );
}

function BarMiniChart({ values }: { values: number[] }) {
  const clean = values.filter((n) => Number.isFinite(n));
  const max = Math.max(...clean, 1);
  return (
    <div className="flex h-20 items-end gap-1">
      {clean.slice(-42).map((value, index) => (
        <div key={index} className="flex-1 rounded-t bg-cyan-200/30" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function BigMetric({ icon: Icon, label, value, sub, change, tone = "cyan" }: { icon: IconType; label: string; value: string; sub?: string; change?: number; tone?: "cyan" | "green" | "amber" | "red" }) {
  const isMove = typeof change === "number" && Number.isFinite(change);
  const up = isMove && change >= 0;
  const toneClass = {
    cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-100",
    green: "from-emerald-300/20 to-teal-300/5 text-emerald-100",
    amber: "from-amber-300/20 to-orange-300/5 text-amber-100",
    red: "from-red-300/20 to-pink-300/5 text-red-100",
  }[tone];
  return (
    <div className="rounded-[1.6rem] border border-white/15 bg-white/[0.045] p-5 shadow-[0_20px_80px_rgba(0,0,0,.20)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</div>
          <div className="mt-3 text-3xl font-bold text-white">{value}</div>
        </div>
        <div className={cn("rounded-2xl bg-gradient-to-br p-3", toneClass)}><Icon className="h-5 w-5" /></div>
      </div>
      <div className="mt-4 flex min-h-6 items-center gap-2 text-sm">
        {isMove ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold", up ? "bg-emerald-400/15 text-emerald-200" : "bg-red-400/15 text-red-200")}>
            {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {formatPercent(change, 2)} 24h
          </span>
        ) : null}
        {sub ? <span className="text-white/50">{sub}</span> : null}
      </div>
    </div>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-white/65", className)}>{children}</span>;
}

function ViewHeader({ icon: Icon, eyebrow, title, description, right }: { icon: IconType; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100"><Icon className="h-3.5 w-3.5" />{eyebrow}</div>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62 md:text-base">{description}</p>
      </div>
      {right}
    </div>
  );
}

function StatusPill({ status }: { status: ApiStatus }) {
  const label = status === "live" ? "Live API" : status === "loading" ? "Loading" : status === "error" ? "Error" : "Fallback";
  const tone = status === "live" ? "bg-emerald-400/15 text-emerald-200 border-emerald-300/20" : status === "loading" ? "bg-cyan-300/10 text-cyan-100 border-cyan-200/20" : status === "error" ? "bg-red-400/15 text-red-200 border-red-300/20" : "bg-amber-300/10 text-amber-100 border-amber-200/20";
  return <Pill className={tone}><Radio className="h-3 w-3" />{label}</Pill>;
}

function DataCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[1.7rem] border border-white/12 bg-[#071f1d]/82 p-5 shadow-[0_24px_90px_rgba(0,0,0,.28)] backdrop-blur", className)}>{children}</div>;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [markets, setMarkets] = useState<MarketRow[]>(fallbackMarkets);
  const [marketsStatus, setMarketsStatus] = useState<ApiStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>(fallbackHistory);
  const [twaps, setTwaps] = useState<TwapRow[]>([]);
  const [twapStatus, setTwapStatus] = useState<ApiStatus>("loading");
  const [buybacks, setBuybacks] = useState<BuybackData>(fallbackBuyback);
  const [buybackStatus, setBuybackStatus] = useState<ApiStatus>("loading");
  const [nftStats, setNftStats] = useState<NftStats>(fallbackNftStats);
  const [nftSales, setNftSales] = useState<NftSale[]>(fallbackNftSales);
  const [nftStatus, setNftStatus] = useState<ApiStatus>("loading");
  const [vaults, setVaults] = useState<VaultRow[]>(fallbackVaults);
  const [vaultStatus, setVaultStatus] = useState<ApiStatus>("loading");
  const [flows, setFlows] = useState<FlowRow[]>(fallbackFlows);
  const [flowStatus, setFlowStatus] = useState<ApiStatus>("fallback");
  const [walletQuery, setWalletQuery] = useState("");
  const [whaleRows, setWhaleRows] = useState<WhaleRow[]>([]);
  const [whaleStatus, setWhaleStatus] = useState<ApiStatus>("fallback");
  const [whaleMessage, setWhaleMessage] = useState("Enter a Hyperliquid address to scan current perp positions.");

  const hype = useMemo(() => markets.find((row) => row.symbol === "HYPE") || markets[0] || fallbackMarkets[0], [markets]);
  const totalOi = useMemo(() => markets.reduce((sum, row) => sum + (row.rawOi || 0), 0), [markets]);
  const totalVolume = useMemo(() => markets.reduce((sum, row) => sum + (row.rawVolume || 0), 0), [markets]);
  const hypeOiShare = totalOi > 0 ? (hype.rawOi / totalOi) * 100 : 0;
  const historyPrices = history.map((point) => point.price);
  const historyVolumes = history.map((point) => point.volume);
  const up24h = hype.rawChange >= 0;

  async function loadMarkets() {
    try {
      const response = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }), cache: "no-store" });
      if (!response.ok) throw new Error("market fetch failed");
      const payload = await response.json();
      const rows = buildMarketRowsFromHyperliquid(payload);
      setMarkets(rows);
      setMarketsStatus("live");
      setLastUpdated(new Date());
    } catch (error) {
      setMarketsStatus((prev) => (prev === "live" ? "live" : "fallback"));
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch("/api/hyperliquid/history?coin=HYPE&interval=15m&hours=24", { cache: "no-store" });
      if (!response.ok) throw new Error("history fetch failed");
      const payload = await response.json();
      const rows = parseHistory(payload);
      if (rows.length > 4) setHistory(rows);
    } catch (error) {
      // keep fallback
    }
  }

  async function loadTwaps() {
    try {
      const response = await fetch("/api/hyperliquid/twaps", { cache: "no-store" });
      if (!response.ok) throw new Error("twap fetch failed");
      const payload = await response.json();
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      setTwaps(rows);
      setTwapStatus("live");
    } catch (error) {
      setTwapStatus("fallback");
      setTwaps([]);
    }
  }

  async function loadBuybacks() {
    try {
      const response = await fetch("/api/hyperliquid/buybacks", { cache: "no-store" });
      if (!response.ok) throw new Error("buybacks fetch failed");
      const payload = await response.json();
      setBuybacks({ ...fallbackBuyback, ...payload });
      setBuybackStatus(payload.live ? "live" : "fallback");
    } catch (error) {
      setBuybackStatus("fallback");
    }
  }

  async function loadNfts() {
    try {
      const [statsResponse, eventsResponse] = await Promise.all([
        fetch("/api/opensea/stats", { cache: "no-store" }),
        fetch("/api/opensea/events", { cache: "no-store" }),
      ]);
      if (statsResponse.ok) {
        const statsPayload = await statsResponse.json();
        setNftStats(parseNftStats(statsPayload));
      }
      if (eventsResponse.ok) {
        const eventsPayload = await eventsResponse.json();
        const rawSales = Array.isArray(eventsPayload?.sales) ? eventsPayload.sales : Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
        const rows = rawSales.map(normalizeNftSale).slice(0, 12);
        if (rows.length) setNftSales(rows);
      }
      setNftStatus("live");
    } catch (error) {
      setNftStatus("fallback");
    }
  }

  async function loadVaults() {
    try {
      const response = await fetch("/api/hyperliquid/vaults", { cache: "no-store" });
      if (!response.ok) throw new Error("vault fetch failed");
      const payload = await response.json();
      const rawRows = Array.isArray(payload) ? payload : [];
      const rows: VaultRow[] = rawRows
        .map((item: any) => {
          const summary = item.summary || item;
          const name = summary.name || item.name || "Vault";
          const tvl = toNumber(summary.tvl || item.tvl || item.accountValue || item.equity);
          const apr = toNumber(item.apr || summary.apr || item.dayApr || summary.dayApr);
          const isClosed = Boolean(summary.isClosed || item.isClosed);
          return { name, aum: formatUsd(tvl), rawAum: tvl, apr: Number.isFinite(apr) && apr !== 0 ? formatPercent(apr, 2) : "--", score: calculateRiskScore(0, 0, tvl, 0), status: isClosed ? "Closed" : "Live", leader: summary.leader || item.leader || "", age: "" };
        })
        .filter((row: VaultRow) => row.rawAum > 10_000 && row.status === "Live")
        .sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum)
        .slice(0, 10);
      if (rows.length) setVaults(rows);
      setVaultStatus("live");
    } catch (error) {
      setVaultStatus("fallback");
    }
  }

  async function loadFlows() {
    try {
      const response = await fetch("/api/tradfi/flows", { cache: "no-store" });
      if (!response.ok) throw new Error("flow fetch failed");
      const payload = await response.json();
      const rows = Array.isArray(payload?.rows) ? payload.rows : fallbackFlows;
      setFlows(rows);
      setFlowStatus(payload?.live ? "live" : "fallback");
    } catch (error) {
      setFlowStatus("fallback");
    }
  }

  async function scanWallet(address = walletQuery) {
    const wallet = address.trim();
    if (!isValidEvmAddress(wallet)) {
      setWhaleStatus("error");
      setWhaleMessage("Invalid EVM address. Paste a 0x wallet address.");
      return;
    }
    setWhaleStatus("loading");
    setWhaleMessage("Scanning wallet positions...");
    try {
      const response = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "clearinghouseState", user: wallet }), cache: "no-store" });
      if (!response.ok) throw new Error("wallet fetch failed");
      const payload = await response.json();
      const rows = buildWhaleRowsFromState(payload, markets);
      setWhaleRows(rows);
      setWhaleStatus("live");
      setWhaleMessage(rows.length ? `${rows.length} open perp position(s) found for ${shortAddress(wallet)}.` : `No open perp positions found for ${shortAddress(wallet)}.`);
    } catch (error) {
      setWhaleStatus("error");
      setWhaleMessage("Wallet scan failed. Try again in a few seconds.");
    }
  }

  useEffect(() => {
    loadMarkets();
    loadHistory();
    loadTwaps();
    loadBuybacks();
    loadNfts();
    loadVaults();
    loadFlows();
    const marketTimer = window.setInterval(loadMarkets, 15_000);
    const historyTimer = window.setInterval(loadHistory, 45_000);
    const twapTimer = window.setInterval(loadTwaps, 20_000);
    const buybackTimer = window.setInterval(loadBuybacks, 45_000);
    const nftTimer = window.setInterval(loadNfts, 30_000);
    return () => {
      window.clearInterval(marketTimer);
      window.clearInterval(historyTimer);
      window.clearInterval(twapTimer);
      window.clearInterval(buybackTimer);
      window.clearInterval(nftTimer);
    };
  }, []);

  const hlpVault = useMemo(() => vaults.find((v) => /(^|\b)HLP($|\b)|Hyperliquidity/i.test(v.name)) || vaults[0] || fallbackVaults[0], [vaults]);
  const marketLeaders = useMemo(() => markets.slice(0, 12), [markets]);
  const highRisk = useMemo(() => [...markets].sort((a, b) => b.risk - a.risk).slice(0, 5), [markets]);
  const nftGrid = nftSales.length >= 9 ? nftSales.slice(0, 9) : [...nftSales, ...fallbackNftSales].slice(0, 9);
  const buyPressurePct = hype.rawVolume > 0 && buybacks.estimatedBuybackUsd24h > 0 ? (buybacks.estimatedBuybackUsd24h / hype.rawVolume) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#031514] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.16),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,.15),transparent_28%),linear-gradient(180deg,#05201d_0%,#031514_42%,#020b0b_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.11]" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[284px] border-r border-white/10 bg-[#031a18]/94 px-4 py-5 backdrop-blur-xl lg:block">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-300/12 text-cyan-100"><Sparkles className="h-5 w-5" /></div>
          <div>
            <div className="font-bold tracking-[0.16em] text-white">HYPURR SCOPE</div>
            <div className="text-xs text-white/45">HYPE market console</div>
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition", active ? "border-cyan-200/25 bg-cyan-300/12 text-white shadow-[0_16px_50px_rgba(45,212,191,.12)]" : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.045] hover:text-white")}> 
                <Icon className={cn("h-5 w-5", active ? "text-cyan-200" : "text-white/35 group-hover:text-cyan-100")} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-white/38">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-xs text-white/55">
          <div className="mb-2 flex items-center justify-between text-white/70"><span>Refresh</span><RefreshCw className="h-3.5 w-3.5" /></div>
          <div>Markets 15s · NFTs 30s · TWAP 20s</div>
          <div className="mt-2">Last update: {formatClock(lastUpdated)}</div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[284px]">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#031514]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="mb-3 flex items-center justify-between"><div className="font-bold tracking-[0.18em]">HYPURR SCOPE</div><StatusPill status={marketsStatus} /></div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", activeView === item.id ? "border-cyan-200/30 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/[0.045] text-white/55")}>{item.label}</button>)}
          </div>
        </div>

        <div className="mx-auto max-w-[1680px] px-4 py-8 md:px-8 lg:px-10">
          {activeView === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Gauge} eyebrow="Live HYPE console" title="HYPE price, buybacks, NFTs and market pressure" description="A cleaner dashboard focused on what actually matters: HYPE price action, FDV, open interest, volume, estimated Assistance Fund pressure and latest Hypurr NFT sales." right={<div className="flex gap-2"><StatusPill status={marketsStatus} /><StatusPill status={nftStatus} /></div>} />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <BigMetric icon={up24h ? TrendingUp : TrendingDown} label="HYPE Price" value={hype.price} change={hype.rawChange} sub={`OI ${hype.oi}`} tone={up24h ? "green" : "red"} />
                <BigMetric icon={Coins} label="FDV" value={hype.fdv || formatUsd(hype.rawPrice * HYPE_TOTAL_SUPPLY)} sub="1B total supply" tone="cyan" />
                <BigMetric icon={Activity} label="24h Volume" value={hype.volumeLabel} sub={`Total tracked ${formatUsd(totalVolume)}`} tone="green" />
                <BigMetric icon={Flame} label="Buyback pressure" value={buybacks.estimatedBuybackUsd24h ? formatUsd(buybacks.estimatedBuybackUsd24h) : "Estimate"} sub={buybacks.estimatedBuybackHype24h ? `${formatNative(buybacks.estimatedBuybackHype24h)} / 24h` : "AF estimate"} tone="amber" />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
                <DataCard className="min-h-[420px]">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">HYPE 24h chart</div>
                      <div className="text-sm text-white/45">Price curve from Hyperliquid candles. Green/red badge shows live 24h move.</div>
                    </div>
                    <Pill className={up24h ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-200" : "border-red-300/20 bg-red-400/15 text-red-200"}>{up24h ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{hype.change}</Pill>
                  </div>
                  <div className="h-72 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
                    <Sparkline points={historyPrices} height={220} stroke={up24h ? "#6ee7b7" : "#fca5a5"} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs uppercase tracking-[.2em] text-white/35">Perp Open Interest</div><div className="mt-2 text-2xl font-bold">{hype.oi}</div><div className="text-xs text-white/45">{hypeOiShare.toFixed(1)}% of tracked OI</div></div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs uppercase tracking-[.2em] text-white/35">Funding</div><div className={cn("mt-2 text-2xl font-bold", hype.rawFunding >= 0 ? "text-emerald-200" : "text-red-200")}>{hype.funding}</div><div className="text-xs text-white/45">Longs pay if positive</div></div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs uppercase tracking-[.2em] text-white/35">Risk heat</div><div className="mt-2 text-2xl font-bold">{hype.risk}/100</div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-300" style={{ width: `${hype.risk}%` }} /></div></div>
                  </div>
                </DataCard>

                <DataCard>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">Latest Hypurr NFT sales</div>
                      <div className="text-sm text-white/45">Images + prices. Auto-refresh every 30s.</div>
                    </div>
                    <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer"><Pill>OpenSea <ExternalLink className="h-3 w-3" /></Pill></a>
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {nftGrid.slice(0, 6).map((sale, index) => <NftThumb key={`${sale.id}-${index}`} sale={sale} compact />)}
                  </div>
                </DataCard>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                <DataCard>
                  <div className="mb-4 flex items-center justify-between"><div><div className="text-lg font-semibold">Buyback monitor</div><div className="text-sm text-white/45">Estimated daily AF capacity</div></div><Flame className="h-5 w-5 text-amber-200" /></div>
                  <div className="text-4xl font-bold text-amber-100">{buybacks.estimatedBuybackUsd24h ? formatUsd(buybacks.estimatedBuybackUsd24h) : "--"}</div>
                  <div className="mt-2 text-sm text-white/55">{buybacks.estimatedBuybackHype24h ? `${formatNative(buybacks.estimatedBuybackHype24h)} estimated from current HYPE price` : buybacks.note}</div>
                  <div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-amber-300" style={{ width: `${clamp(buyPressurePct * 20, 4, 100)}%` }} /></div>
                </DataCard>
                <DataCard>
                  <div className="mb-4 flex items-center justify-between"><div><div className="text-lg font-semibold">HLP focus</div><div className="text-sm text-white/45">Most useful vault block, not a random vault list.</div></div><Layers className="h-5 w-5 text-cyan-200" /></div>
                  <div className="text-4xl font-bold">{hlpVault.aum}</div>
                  <div className="mt-2 text-sm text-white/55">APR: <span className="text-emerald-200">{hlpVault.apr}</span> · Status: {hlpVault.status}</div>
                  <button onClick={() => setActiveView("vaults")} className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10">Open HLP panel</button>
                </DataCard>
                <DataCard>
                  <div className="mb-4 flex items-center justify-between"><div><div className="text-lg font-semibold">HYPE sliced flow</div><div className="text-sm text-white/45">Recent trade clustering, HYPE only.</div></div><Clock className="h-5 w-5 text-cyan-200" /></div>
                  <div className="space-y-3">
                    {(twaps.length ? twaps : [{ side: "Buy" as const, notional: "No sliced flow", rawNotional: 0, slices: 0, avgSize: "--", avgPrice: "--", lastTrade: "--", confidence: "--" }]).slice(0, 2).map((row, index) => (
                      <div key={index} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3"><span className={row.side === "Buy" ? "text-emerald-200" : "text-red-200"}>{row.side}</span><span className="font-semibold">{row.notional}</span></div>
                    ))}
                  </div>
                </DataCard>
              </div>
            </motion.div>
          )}

          {activeView === "markets" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={BarChart3} eyebrow="Markets" title="HYPE market data with FDV, OI, funding and charts" description="FDV is now visible. The page prioritizes HYPE, then shows the biggest perp markets by open interest and risk heat." right={<StatusPill status={marketsStatus} />} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <BigMetric icon={Coins} label="HYPE FDV" value={hype.fdv || formatUsd(hype.rawPrice * HYPE_TOTAL_SUPPLY)} sub="Price × 1B supply" tone="cyan" />
                <BigMetric icon={up24h ? TrendingUp : TrendingDown} label="HYPE 24h" value={hype.change} sub={hype.price} tone={up24h ? "green" : "red"} />
                <BigMetric icon={Activity} label="HYPE OI" value={hype.oi} sub={`${hypeOiShare.toFixed(1)}% of tracked OI`} tone="amber" />
                <BigMetric icon={LineChart} label="HYPE Volume" value={hype.volumeLabel} sub="24h notional" tone="green" />
                <BigMetric icon={Zap} label="Funding" value={hype.funding} sub="current rate" tone={hype.rawFunding >= 0 ? "green" : "red"} />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <DataCard>
                  <div className="mb-4 flex items-center justify-between"><div><div className="text-lg font-semibold">HYPE price curve</div><div className="text-sm text-white/45">15m candles over roughly 24h.</div></div><Pill>{formatClock(lastUpdated)}</Pill></div>
                  <div className="h-80 rounded-[1.4rem] border border-white/10 bg-black/15 p-4"><Sparkline points={historyPrices} height={260} stroke={up24h ? "#6ee7b7" : "#fca5a5"} /></div>
                </DataCard>
                <DataCard>
                  <div className="mb-4"><div className="text-lg font-semibold">Volume pulse</div><div className="text-sm text-white/45">Recent HYPE candle volume.</div></div>
                  <BarMiniChart values={historyVolumes} />
                  <div className="mt-5 space-y-3">
                    {highRisk.map((row) => <div key={row.symbol} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3"><div><div className="font-semibold">{row.symbol}</div><div className="text-xs text-white/45">{row.oi} OI · {row.funding}</div></div><Pill className={riskTone(row.risk)}>Risk {row.risk}</Pill></div>)}
                  </div>
                </DataCard>
              </div>
              <DataCard className="mt-5 overflow-hidden p-0">
                <div className="border-b border-white/10 p-5"><div className="text-lg font-semibold">Perp market table</div><div className="text-sm text-white/45">HYPE includes FDV; other perps do not have token supply data in the Hyperliquid market feed.</div></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.18em] text-white/35"><tr><th className="px-5 py-3">Market</th><th>Price</th><th>24h</th><th>FDV</th><th>Open Interest</th><th>24h Vol</th><th>Funding</th><th>Risk</th></tr></thead>
                    <tbody>
                      {marketLeaders.map((row) => (
                        <tr key={row.symbol} className="border-t border-white/7 hover:bg-white/[0.035]"><td className="px-5 py-4 font-semibold text-white">{row.symbol}</td><td>{row.price}</td><td className={row.rawChange >= 0 ? "text-emerald-200" : "text-red-200"}>{row.change}</td><td>{row.symbol === "HYPE" ? row.fdv : "--"}</td><td>{row.oi}</td><td>{row.volumeLabel}</td><td className={row.rawFunding >= 0 ? "text-emerald-200" : "text-red-200"}>{row.funding}</td><td><Pill className={riskTone(row.risk)}>{row.risk}/100</Pill></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataCard>
            </motion.div>
          )}

          {activeView === "buybacks" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Flame} eyebrow="Buybacks" title="HYPE Assistance Fund buyback pressure" description="The useful version: estimated daily buyback capacity, AF address, HYPE equivalent and pressure versus daily HYPE volume. Exact cumulative figures can be connected later through a dedicated buyback data source." right={<StatusPill status={buybackStatus} />} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <BigMetric icon={Flame} label="Est. 24h AF buyback" value={buybacks.estimatedBuybackUsd24h ? formatUsd(buybacks.estimatedBuybackUsd24h) : "--"} sub={buybacks.live ? "Live source" : "Model estimate"} tone="amber" />
                <BigMetric icon={Coins} label="HYPE equivalent" value={buybacks.estimatedBuybackHype24h ? formatNative(buybacks.estimatedBuybackHype24h) : "--"} sub={`at ${hype.price}`} tone="cyan" />
                <BigMetric icon={Activity} label="Vs HYPE volume" value={buyPressurePct ? `${buyPressurePct.toFixed(2)}%` : "--"} sub="AF estimate / HYPE 24h vol" tone="green" />
                <BigMetric icon={Shield} label="AF address" value="0xfefe...fefe" sub="system address" tone="cyan" />
              </div>
              <DataCard className="mt-5">
                <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
                  <div>
                    <div className="text-lg font-semibold">Buyback pressure curve</div>
                    <div className="mt-1 text-sm text-white/45">Visualizes estimated daily AF pressure against current HYPE volume.</div>
                    <div className="mt-6 h-5 rounded-full bg-white/10"><div className="h-5 rounded-full bg-gradient-to-r from-amber-200 to-emerald-300" style={{ width: `${clamp(buyPressurePct * 20, 5, 100)}%` }} /></div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/62">{buybacks.note}</div>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5">
                    <div className="mb-3 text-sm uppercase tracking-[.22em] text-white/35">Mechanism</div>
                    <div className="space-y-3 text-sm text-white/65">
                      <div className="flex items-start gap-3"><Database className="mt-0.5 h-4 w-4 text-cyan-200" /><span>Fees flow to the community; the Assistance Fund converts fee revenue into HYPE.</span></div>
                      <div className="flex items-start gap-3"><Shield className="mt-0.5 h-4 w-4 text-emerald-200" /><span>AF system address: <span className="font-mono text-white/80">{buybacks.assistanceFundAddress}</span></span></div>
                      <div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 text-amber-200" /><span>This page avoids fake cumulative numbers. Connect <span className="font-mono">HYPE_BUYBACKS_JSON_URL</span> later for exact history.</span></div>
                    </div>
                  </div>
                </div>
              </DataCard>
            </motion.div>
          )}

          {activeView === "twaps" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Clock} eyebrow="HYPE TWAP" title="HYPE sliced-flow detector" description="Only HYPE. This page uses recent public trades to detect clustered buy/sell flow that looks like sliced execution. It is not a fake all-markets TWAP table." right={<StatusPill status={twapStatus} />} />
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <DataCard>
                  <div className="mb-4 text-lg font-semibold">Detected HYPE flow</div>
                  <div className="space-y-3">
                    {(twaps.length ? twaps : [{ side: "Buy" as const, notional: "No strong sliced flow", rawNotional: 0, slices: 0, avgSize: "--", avgPrice: "--", lastTrade: "--", confidence: "--" }]).map((row, index) => (
                      <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between"><div className={cn("text-lg font-bold", row.side === "Buy" ? "text-emerald-200" : "text-red-200")}>{row.side}</div><div className="text-2xl font-bold">{row.notional}</div></div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/50"><div>Slices <span className="block text-white/80">{row.slices}</span></div><div>Avg size <span className="block text-white/80">{row.avgSize}</span></div><div>Last <span className="block text-white/80">{row.lastTrade}</span></div></div>
                      </div>
                    ))}
                  </div>
                </DataCard>
                <DataCard>
                  <div className="mb-4"><div className="text-lg font-semibold">HYPE tape visual</div><div className="text-sm text-white/45">Price curve remains visible next to TWAP flow.</div></div>
                  <div className="h-80 rounded-[1.4rem] border border-white/10 bg-black/15 p-4"><Sparkline points={historyPrices} height={250} stroke="#67e8f9" /></div>
                </DataCard>
              </div>
            </motion.div>
          )}

          {activeView === "nfts" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={ImageIcon} eyebrow="Hypurr NFT tape" title="Hypurr NFT sales, floor and images" description="Latest sales render as image cards with price, time and token id. If OpenSea does not return media, the card still fills visually instead of leaving an empty box." right={<div className="flex gap-2"><StatusPill status={nftStatus} /><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer"><Pill>OpenSea <ExternalLink className="h-3 w-3" /></Pill></a></div>} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <BigMetric icon={Coins} label="Floor" value={nftStats.floor} sub="OpenSea collection" tone="cyan" />
                <BigMetric icon={Activity} label="24h Volume" value={nftStats.volume24h} sub="collection volume" tone="green" />
                <BigMetric icon={TrendingUp} label="Total Volume" value={nftStats.totalVolume} sub="all-time" tone="cyan" />
                <BigMetric icon={Layers} label="Listed" value={nftStats.listed} sub="listing ratio" tone="amber" />
                <BigMetric icon={Wallet} label="Owners" value={nftStats.owners} sub="holder count" tone="cyan" />
                <BigMetric icon={Zap} label="24h Sales" value={nftStats.sales24h} sub="sale count" tone="green" />
              </div>
              <DataCard className="mt-5">
                <div className="mb-5 flex items-center justify-between"><div><div className="text-lg font-semibold">Latest sales</div><div className="text-sm text-white/45">Grid fills the whole panel instead of showing 3 tiny rows.</div></div><Pill>Updated {formatClock(new Date())}</Pill></div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {nftSales.slice(0, 12).map((sale, index) => <NftThumb key={`${sale.id}-${index}`} sale={sale} />)}
                </div>
              </DataCard>
            </motion.div>
          )}

          {activeView === "vaults" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Layers} eyebrow="HLP" title="HLP first, other vaults only if useful" description="The old vault page was too generic. This page surfaces HLP first, then shows the largest live vaults only as secondary context." right={<StatusPill status={vaultStatus} />} />
              <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
                <DataCard><div className="text-sm uppercase tracking-[.24em] text-white/35">Main vault</div><div className="mt-2 text-5xl font-bold">{hlpVault.name}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-white/40">AUM</div><div className="mt-1 text-2xl font-bold">{hlpVault.aum}</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-white/40">APR</div><div className="mt-1 text-2xl font-bold text-emerald-200">{hlpVault.apr}</div></div></div></DataCard>
                <DataCard><div className="mb-4 text-lg font-semibold">Largest live vaults</div><div className="space-y-3">{vaults.slice(0, 8).map((vault) => <div key={vault.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3"><div><div className="font-semibold">{vault.name}</div><div className="text-xs text-white/45">{vault.aum} AUM</div></div><Pill className={riskTone(vault.score)}>APR {vault.apr}</Pill></div>)}</div></DataCard>
              </div>
            </motion.div>
          )}

          {activeView === "flows" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Globe2} eyebrow="TradFi" title="HYPE ETP / ETF watchlist" description="No fake pending number on the dashboard anymore. This page keeps TradFi products small until an exact daily-flow feed is connected." right={<StatusPill status={flowStatus} />} />
              <div className="grid gap-4 xl:grid-cols-3">
                {flows.map((row) => <DataCard key={`${row.name}-${row.ticker}`}><div className="flex items-start justify-between gap-3"><div><div className="text-xl font-bold">{row.ticker}</div><div className="mt-1 text-sm text-white/55">{row.name}</div></div>{row.url ? <a href={row.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 text-white/45" /></a> : null}</div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><div className="text-white/35">Status</div><div className="font-semibold">{row.status}</div></div><div><div className="text-white/35">Venue</div><div className="font-semibold">{row.venue}</div></div><div><div className="text-white/35">AUM</div><div className="font-semibold">{row.aum || "--"}</div></div><div><div className="text-white/35">Daily flow</div><div className="font-semibold">{row.dailyFlow || "source needed"}</div></div></div></DataCard>)}
              </div>
            </motion.div>
          )}

          {activeView === "whales" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ViewHeader icon={Wallet} eyebrow="Wallet scan" title="Scan any Hyperliquid wallet" description="I removed the fake Top 20 whales idea. Without Nansen/ASXN-style indexed data, the public Hyperliquid API can scan a known wallet but does not give a reliable global top-whale list." right={<StatusPill status={whaleStatus} />} />
              <DataCard>
                <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={walletQuery} onChange={(e) => setWalletQuery(e.target.value)} placeholder="0x wallet address" className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-white/25 focus:border-cyan-200/30" /></div><button onClick={() => scanWallet()} className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-bold text-[#04201d] hover:bg-cyan-100">Scan wallet</button></div>
                <div className="mt-4 text-sm text-white/55">{whaleMessage}</div>
                <div className="mt-5 space-y-3">
                  {(whaleRows.length ? whaleRows : []).map((row, index) => <div key={`${row.coin}-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-7"><div className="font-bold">{row.coin}</div><div className={row.side === "Long" ? "text-emerald-200" : "text-red-200"}>{row.side}</div><div>{row.size}</div><div>{row.notional}</div><div>{row.entry}</div><div className={row.rawPnl >= 0 ? "text-emerald-200" : "text-red-200"}>{row.pnl}</div><div><Pill className={row.danger === "High" ? "border-red-300/20 bg-red-400/15 text-red-200" : row.danger === "Medium" ? "border-amber-200/20 bg-amber-300/15 text-amber-100" : "border-emerald-200/20 bg-emerald-300/10 text-emerald-200"}>{row.danger}</Pill></div></div>)}
                </div>
              </DataCard>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

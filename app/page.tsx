"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Layers,
  LineChart,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

type ViewId = "overview" | "markets" | "buybacks" | "twaps" | "nfts" | "vaults" | "flows" | "whales";
type ApiStatus = "loading" | "live" | "fallback" | "error";
type IconType = React.ComponentType<{ className?: string }>;

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
type NftSale = { id: string; name: string; price: string; usd?: string; time: string; image?: string; url?: string; imageStatus?: string };
type VaultRow = { name: string; aum: string; rawAum: number; apr: string; score: number; status: string; leader?: string; age?: string };
type WhaleRow = { coin: string; side: string; size: string; notional: string; entry: string; pnl: string; rawPnl: number; liquidation: string; leverage: string; danger: "Low" | "Medium" | "High" | "Watch" };
type BuybackData = { live: boolean; source: string; updatedAt: string; assistanceFundAddress: string; estimatedBuybackUsd24h: number; estimatedBuybackHype24h: number; cumulativeBuybackUsd?: number; cumulativeBuybackHype?: number; feeRoute: string; note: string };
type FlowRow = { name: string; ticker: string; venue: string; status: string; dailyFlow?: string; aum?: string; holdings?: string; fee?: string; lastData?: string; url?: string };

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

const fallbackMarkets: MarketRow[] = [
  { symbol: "HYPE", price: "$59.63", rawPrice: 59.63, change: "-11.15%", rawChange: -11.15, oi: "$1.26B", rawOi: 1_260_000_000, volumeLabel: "$640.00M", rawVolume: 640_000_000, funding: "+0.0140%", rawFunding: 0.00014, fdv: "$59.63B", rawFdv: 59_630_000_000, risk: 78 },
  { symbol: "BTC", price: "$104.82K", rawPrice: 104_820, change: "+1.20%", rawChange: 1.2, oi: "$3.44B", rawOi: 3_440_000_000, volumeLabel: "$1.94B", rawVolume: 1_940_000_000, funding: "+0.0060%", rawFunding: 0.00006, risk: 48 },
  { symbol: "ETH", price: "$5.93K", rawPrice: 5_930, change: "+2.60%", rawChange: 2.6, oi: "$2.11B", rawOi: 2_110_000_000, volumeLabel: "$1.12B", rawVolume: 1_120_000_000, funding: "+0.0120%", rawFunding: 0.00012, risk: 61 },
  { symbol: "SOL", price: "$238.12", rawPrice: 238.12, change: "-0.90%", rawChange: -0.9, oi: "$884.00M", rawOi: 884_000_000, volumeLabel: "$420.00M", rawVolume: 420_000_000, funding: "-0.0040%", rawFunding: -0.00004, risk: 39 },
];

const fallbackHistory: HistoryPoint[] = Array.from({ length: 42 }).map((_, index) => {
  const wave = Math.sin(index / 4) * 1.9 + Math.cos(index / 7) * 1.3;
  return { time: Date.now() - (41 - index) * 20 * 60_000, price: 58 + wave + index * 0.02, volume: 900_000 + Math.abs(Math.sin(index / 3)) * 1_800_000 };
});

const fallbackNftStats: NftStats = { floor: "-- HYPE", volume24h: "-- HYPE", totalVolume: "-- HYPE", listed: "--", owners: "--", sales24h: "--" };
const fallbackVaults: VaultRow[] = [{ name: "HLP", aum: "Loading", rawAum: 0, apr: "Loading", score: 42, status: "Live" }];
const fallbackBuyback: BuybackData = {
  live: false,
  source: "estimate",
  updatedAt: "",
  assistanceFundAddress: "0xfefefefefefefefefefefefefefefefefefefefe",
  estimatedBuybackUsd24h: 0,
  estimatedBuybackHype24h: 0,
  feeRoute: "Assistance Fund",
  note: "Estimated from public 24h exchange volume. Add a buyback source for exact historical numbers.",
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
function formatUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
function formatRelativeTime(timestamp: string | number | undefined) {
  if (!timestamp) return "recent";
  const number = Number(timestamp);
  const date = typeof timestamp === "number" || Number.isFinite(number) ? new Date(number > 10_000_000_000 ? number : number * 1000) : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "recent";
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

function normalizeOpenSeaPrice(event: any) {
  if (typeof event.price === "string") return event.price;
  if (typeof event.priceLabel === "string") return event.priceLabel;
  const payment = event.payment || event.payment_token || event.price?.currency || {};
  const rawQuantity = event.payment?.quantity ?? event.closing_price ?? event.price?.quantity ?? event.quantity;
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? 18);
  const symbol = payment.symbol || event.price?.currency?.symbol || event.token?.symbol || "HYPE";
  const rawNumber = Number(rawQuantity);
  if (!Number.isFinite(rawNumber) || rawNumber <= 0) return `-- ${symbol}`;
  const normalized = rawNumber > 1_000_000_000 ? rawNumber / 10 ** decimals : rawNumber;
  return formatNative(normalized, symbol);
}
function normalizeNftSale(raw: any, index: number): NftSale {
  const nft = raw.nft || raw.asset || raw.item || raw;
  const id = String(raw.id || nft.identifier || nft.token_id || raw.tokenId || raw.token_id || raw.nft_id || index + 1);
  const image = raw.image || raw.image_url || raw.display_image_url || nft.image || nft.image_url || nft.display_image_url || nft.metadata?.image || "";
  const name = raw.name || nft.name || `Hypurr #${id}`;
  const time = raw.time || formatRelativeTime(raw.timestamp || raw.event_timestamp || raw.created_date || raw.transaction?.timestamp);
  return {
    id,
    name,
    price: normalizeOpenSeaPrice(raw),
    usd: raw.usd || raw.usdPrice || raw.usd_price || "",
    time,
    image,
    url: raw.url || raw.permalink || nft.permalink || OPENSEA_COLLECTION_URL,
    imageStatus: raw.imageStatus || raw.image_status || "",
  };
}
function parseNftSales(payload: any): NftSale[] {
  const candidates = payload?.sales || payload?.items || payload?.results || payload?.asset_events || payload?.events || [];
  if (!Array.isArray(candidates)) return [];
  return candidates
    .filter((event: any) => {
      const eventType = String(event.event_type || event.eventType || event.type || "sale").toLowerCase();
      return eventType.includes("sale") || eventType === "successful" || event.price || event.payment;
    })
    .map(normalizeNftSale)
    .filter((sale: NftSale) => sale.name || sale.id)
    .slice(0, 12);
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
function parseVaults(payload: any): VaultRow[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.vaults) ? payload.vaults : [];
  return rows
    .map((vault: any) => {
      const summary = vault.summary || vault;
      const name = summary.name || vault.name || "Unnamed vault";
      const aum = toNumber(summary.tvl || vault.tvl || vault.accountValue || vault.equity);
      const apr = toNumber(vault.apr || summary.apr || vault.apy || summary.apy);
      return { name, aum: formatUsd(aum), rawAum: aum, apr: apr ? formatPercent(apr, 2) : "--", score: Math.round(clamp(35 + Math.abs(apr) * 0.25, 5, 99)), status: summary.isClosed ? "Closed" : "Open", leader: summary.leader || vault.leader || "", age: "--" } satisfies VaultRow;
    })
    .filter((row: VaultRow) => row.rawAum > 0)
    .sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum)
    .slice(0, 8);
}
function riskTone(value: number) {
  if (value >= 80) return "text-red-200 bg-red-400/15 border-red-300/20";
  if (value >= 65) return "text-amber-200 bg-amber-300/15 border-amber-200/20";
  if (value >= 45) return "text-cyan-100 bg-cyan-300/10 border-cyan-200/15";
  return "text-emerald-200 bg-emerald-300/10 border-emerald-200/20";
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
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
      {fill ? <path d={area} fill="url(#hypurrGradient)" opacity="0.35" /> : null}
      <path d={path} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="hypurrGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.55" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
function BarMiniChart({ values }: { values: number[] }) {
  const clean = values.filter((n) => Number.isFinite(n));
  const max = Math.max(...clean, 1);
  return (
    <div className="flex h-24 items-end gap-1 rounded-2xl border border-white/10 bg-black/20 p-3">
      {clean.slice(-42).map((value, index) => (
        <div key={index} className="flex-1 rounded-t bg-cyan-300/50" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}
function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]", className)}>{children}</span>;
}
function DataCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[1.35rem] border border-white/15 bg-white/[0.045] shadow-2xl shadow-black/20 backdrop-blur", className)}>{children}</div>;
}
function StatusPill({ status }: { status: ApiStatus }) {
  const tone = status === "live" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : status === "loading" ? "border-cyan-200/20 bg-cyan-300/10 text-cyan-100" : status === "error" ? "border-red-300/25 bg-red-400/10 text-red-200" : "border-amber-200/20 bg-amber-300/10 text-amber-100";
  return <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", tone)}><Radio className="h-3 w-3" />{status === "live" ? "Live API" : status === "loading" ? "Loading" : status === "error" ? "Error" : "Fallback"}</span>;
}
function BigMetric({ icon: Icon, label, value, sub, change, tone = "cyan" }: { icon: IconType; label: string; value: string; sub?: string; change?: number; tone?: "cyan" | "green" | "amber" | "red" }) {
  const isMove = typeof change === "number" && Number.isFinite(change);
  const up = isMove && change >= 0;
  const moveTone = up ? "bg-emerald-400/15 text-emerald-200 border-emerald-300/20" : "bg-red-400/15 text-red-200 border-red-300/20";
  const toneClass = { cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-100", green: "from-emerald-300/20 to-teal-300/5 text-emerald-100", amber: "from-amber-300/20 to-orange-300/5 text-amber-100", red: "from-red-300/20 to-pink-300/5 text-red-100" }[tone];
  return (
    <DataCard className="group relative overflow-hidden p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      <div className={cn("absolute right-4 top-4 rounded-2xl bg-gradient-to-br p-3", toneClass)}><Icon className="h-5 w-5" /></div>
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">{label}</p>
        <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
          {isMove ? <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-bold", moveTone)}>{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{formatPercent(change, 2)} 24h</span> : null}
          {sub ? <span>{sub}</span> : null}
        </div>
      </div>
    </DataCard>
  );
}
function ViewHeader({ icon: Icon, eyebrow, title, description, right }: { icon: IconType; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Pill className="border-cyan-200/20 bg-cyan-300/10 text-cyan-100"><Icon className="mr-2 h-3.5 w-3.5" />{eyebrow}</Pill>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-cyan-50/75">{description}</p>
      </div>
      {right}
    </div>
  );
}
function NftEmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center", compact ? "min-h-[180px]" : "min-h-[260px]")}> 
      <ImageIcon className="h-9 w-9 text-cyan-100/50" />
      <p className="mt-3 text-sm font-bold text-white">No live NFT sales loaded</p>
      <p className="mt-1 max-w-xs text-xs text-white/50">{message}</p>
      <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-cyan-100 hover:bg-white/10">OpenSea <ExternalLink className="h-3 w-3" /></a>
    </div>
  );
}
function NftSaleCard({ sale, compact = false }: { sale: NftSale; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(sale.image && !broken);
  return (
    <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-white/15 bg-[#071f1d]/90 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.06]">
      <div className={cn("relative flex aspect-square items-start justify-start overflow-hidden bg-gradient-to-br from-[#0b3a35] via-[#082b28] to-[#061716]")}> 
        {hasImage ? (
          <img
            src={sale.image}
            alt={sale.name}
            onError={() => setBroken(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-auto max-w-none origin-left object-left-top transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-cyan-100/45">
            <ImageIcon className="h-8 w-8" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]">No image</span>
          </div>
        )}
      </div>
      <div className={cn("space-y-2", compact ? "p-3.5" : "p-4")}> 
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{sale.name}</p>
            <p className="text-[11px] text-white/45">{sale.time}</p>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-black text-cyan-50">{sale.price}</span>
        </div>
        {!compact && sale.usd ? <p className="text-xs text-white/40">{sale.usd}</p> : null}
      </div>
    </a>
  );
}
function NftGrid({ sales, loading, message, compact = false, max = 12 }: { sales: NftSale[]; loading: boolean; message: string; compact?: boolean; max?: number }) {
  if (!loading && sales.length === 0) return <NftEmptyState message={message} compact={compact} />;
  if (loading && sales.length === 0) {
    return (
      <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}> 
        {Array.from({ length: compact ? 4 : 12 }).map((_, index) => <div key={index} className={cn("animate-pulse rounded-2xl border border-white/10 bg-white/[0.045]", compact ? "h-64" : "h-80")} />)}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}> 
      {sales.slice(0, max).map((sale) => <NftSaleCard key={`${sale.id}-${sale.price}-${sale.time}`} sale={sale} compact={compact} />)}
    </div>
  );
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
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [nftStatus, setNftStatus] = useState<ApiStatus>("loading");
  const [nftMessage, setNftMessage] = useState("Loading real Hypurr sales from OpenSea.");
  const [nftLastUpdated, setNftLastUpdated] = useState<Date | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>(fallbackVaults);
  const [vaultStatus, setVaultStatus] = useState<ApiStatus>("loading");
  const [flows, setFlows] = useState<FlowRow[]>(fallbackFlows);
  const [flowStatus, setFlowStatus] = useState<ApiStatus>("fallback");
  const [wallet, setWallet] = useState("");
  const [whaleRows, setWhaleRows] = useState<WhaleRow[]>([]);
  const [whaleStatus, setWhaleStatus] = useState<ApiStatus>("fallback");
  const [whaleMessage, setWhaleMessage] = useState("Paste a wallet to scan open perp positions.");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadMarkets() {
      try {
        setMarketsStatus((current) => (current === "live" ? "live" : "loading"));
        const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) });
        if (!res.ok) throw new Error("market api");
        const payload = await res.json();
        const rows = buildMarketRowsFromHyperliquid(payload);
        if (mounted && rows.length) { setMarkets(rows); setMarketsStatus("live"); setLastUpdated(new Date()); }
      } catch {
        if (mounted) { setMarkets(fallbackMarkets); setMarketsStatus("fallback"); setLastUpdated(new Date()); }
      }
    }
    loadMarkets();
    const interval = window.setInterval(loadMarkets, 20_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadHistory() {
      try {
        const end = Date.now();
        const start = end - 24 * 60 * 60 * 1000;
        const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "candleSnapshot", req: { coin: "HYPE", interval: "15m", startTime: start, endTime: end } }) });
        if (!res.ok) throw new Error("history api");
        const points = parseHistory(await res.json());
        if (mounted && points.length > 4) setHistory(points);
      } catch {
        if (mounted) setHistory(fallbackHistory);
      }
    }
    loadHistory();
    const interval = window.setInterval(loadHistory, 60_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadNfts() {
      try {
        setNftStatus((current) => (current === "live" ? "live" : "loading"));
        const [statsRes, eventsRes] = await Promise.allSettled([
          fetch("/api/opensea/stats", { method: "GET" }),
          fetch("/api/opensea/events", { method: "GET" }),
        ]);
        if (statsRes.status === "fulfilled" && statsRes.value.ok) setNftStats(parseNftStats(await statsRes.value.json()));
        if (eventsRes.status !== "fulfilled" || !eventsRes.value.ok) throw new Error("events api");
        const sales = parseNftSales(await eventsRes.value.json());
        if (!sales.length) throw new Error("no sales");
        if (mounted) { setNftSales(sales); setNftStatus("live"); setNftMessage("Real Hypurr sale feed loaded."); setNftLastUpdated(new Date()); }
      } catch {
        if (mounted) { setNftSales([]); setNftStatus("error"); setNftMessage("OpenSea did not return live sale images. Check OPENSEA_API_KEY or open the collection directly."); setNftLastUpdated(new Date()); }
      }
    }
    window.setTimeout(loadNfts, 250);
    const interval = window.setInterval(loadNfts, 120_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadExtras() {
      try {
        const buybackRes = await fetch("/api/hyperliquid/buybacks", { method: "GET" });
        if (buybackRes.ok && mounted) { setBuybacks(await buybackRes.json()); setBuybackStatus("live"); }
      } catch { if (mounted) setBuybackStatus("fallback"); }
      try {
        const twapRes = await fetch("/api/hyperliquid/twaps", { method: "GET" });
        if (twapRes.ok && mounted) { const payload = await twapRes.json(); setTwaps(Array.isArray(payload?.twaps) ? payload.twaps : Array.isArray(payload) ? payload : []); setTwapStatus("live"); }
      } catch { if (mounted) setTwapStatus("fallback"); }
      try {
        const vaultRes = await fetch("/api/hyperliquid/vaults", { method: "GET" });
        if (vaultRes.ok && mounted) { const rows = parseVaults(await vaultRes.json()); if (rows.length) setVaults(rows); setVaultStatus("live"); }
      } catch { if (mounted) setVaultStatus("fallback"); }
      try {
        const flowRes = await fetch("/api/tradfi/flows", { method: "GET" });
        if (flowRes.ok && mounted) { const payload = await flowRes.json(); if (Array.isArray(payload?.flows)) setFlows(payload.flows); setFlowStatus("live"); }
      } catch { if (mounted) setFlowStatus("fallback"); }
    }
    loadExtras();
    const interval = window.setInterval(loadExtras, 90_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const hype = useMemo(() => markets.find((row) => row.symbol === "HYPE") || fallbackMarkets[0], [markets]);
  const totalOi = useMemo(() => markets.reduce((sum, row) => sum + row.rawOi, 0), [markets]);
  const filteredMarkets = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())), [markets, query]);
  const marketRisk = useMemo(() => Math.round(markets.reduce((sum, row) => sum + row.risk, 0) / Math.max(markets.length, 1)), [markets]);
  const buybackUsd = buybacks.estimatedBuybackUsd24h || hype.rawVolume * 0.002;
  const buybackHype = buybacks.estimatedBuybackHype24h || (hype.rawPrice ? buybackUsd / hype.rawPrice : 0);

  async function scanWallet() {
    const address = wallet.trim();
    if (!isValidEvmAddress(address)) { setWhaleStatus("error"); setWhaleMessage("Invalid address. Paste a full 0x wallet address."); return; }
    try {
      setWhaleStatus("loading");
      const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "clearinghouseState", user: address }) });
      if (!res.ok) throw new Error("wallet api");
      const rows = buildWhaleRowsFromState(await res.json(), markets);
      setWhaleRows(rows);
      setWhaleStatus("live");
      setWhaleMessage(rows.length ? `Tracking ${shortAddress(address)} open positions.` : `No open perp positions found for ${shortAddress(address)}.`);
    } catch {
      setWhaleStatus("error");
      setWhaleMessage("Wallet scan failed. Try again later.");
    }
  }

  const overview = (
    <>
      <ViewHeader icon={Gauge} eyebrow="Live HYPE console" title="HYPE price, buybacks, NFTs and market pressure" description="A cleaner dashboard focused on what actually matters: HYPE price action, FDV, open interest, volume, estimated Assistance Fund pressure and latest Hypurr NFT sales." right={<div className="flex gap-2"><StatusPill status={marketsStatus} /><StatusPill status={nftStatus} /></div>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BigMetric icon={hype.rawChange >= 0 ? TrendingUp : TrendingDown} label="HYPE price" value={hype.price} change={hype.rawChange} sub={`OI ${hype.oi}`} tone={hype.rawChange >= 0 ? "green" : "red"} />
        <BigMetric icon={CoinsIcon} label="FDV" value={hype.fdv || formatUsd(hype.rawPrice * HYPE_TOTAL_SUPPLY)} sub="1B total supply" tone="cyan" />
        <BigMetric icon={Activity} label="24h volume" value={hype.volumeLabel} sub={`Total tracked ${formatUsd(totalOi)}`} tone="green" />
        <BigMetric icon={Flame} label="Buyback pressure" value={formatUsd(buybackUsd)} sub={`${formatNative(buybackHype)} / 24h`} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <DataCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-black text-white">HYPE 24h chart</h2><p className="text-sm text-white/50">Live candles when available. Red/green badge shows the 24h move.</p></div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", hype.rawChange >= 0 ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-red-300/20 bg-red-400/10 text-red-200")}>{hype.rawChange >= 0 ? "↗" : "↘"} {formatPercent(hype.rawChange, 2)}</span>
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-black/20 p-4"><Sparkline points={history.map((p) => p.price)} height={160} stroke={hype.rawChange >= 0 ? "#6ee7b7" : "#fca5a5"} /></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <DataCard className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Perp Open Interest</p><p className="mt-2 text-2xl font-black text-white">{hype.oi}</p><p className="text-xs text-white/45">{((hype.rawOi / Math.max(totalOi, 1)) * 100).toFixed(1)}% of tracked OI</p></DataCard>
            <DataCard className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Funding</p><p className={cn("mt-2 text-2xl font-black", hype.rawFunding >= 0 ? "text-emerald-200" : "text-red-200")}>{hype.funding}</p><p className="text-xs text-white/45">Longs pay if positive</p></DataCard>
            <DataCard className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Risk heat</p><p className="mt-2 text-2xl font-black text-white">{marketRisk}/100</p><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${marketRisk}%` }} /></div></DataCard>
          </div>
        </DataCard>
        <DataCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-black text-white">Latest Hypurr NFT sales</h2><p className="text-sm text-white/50">Images + prices. Auto-refresh every 120s.</p></div>
            <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-100 hover:bg-white/10">OpenSea <ExternalLink className="h-3 w-3" /></a>
          </div>
          <NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} compact max={4} />
        </DataCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <DataCard className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Buyback monitor</h2><p className="text-sm text-white/50">Estimated daily AF capacity</p></div><Flame className="h-5 w-5 text-amber-200" /></div><p className="mt-6 text-4xl font-black text-amber-100">{formatUsd(buybackUsd)}</p><p className="mt-2 text-sm text-white/55">{formatNative(buybackHype)} estimated / 24h</p></DataCard>
        <DataCard className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">HLP focus</h2><p className="text-sm text-white/50">Most useful vault block, not a random list.</p></div><Layers className="h-5 w-5 text-cyan-200" /></div><p className="mt-6 text-4xl font-black text-white">{vaults[0]?.aum || "--"}</p><p className="mt-2 text-sm text-white/55">{vaults[0]?.name || "HLP"} · {vaults[0]?.apr || "APR pending"}</p></DataCard>
        <DataCard className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">HYPE sliced flow</h2><p className="text-sm text-white/50">Recent trade clustering, HYPE only.</p></div><Clock className="h-5 w-5 text-cyan-200" /></div><div className="mt-5 space-y-3">{twaps.length ? twaps.slice(0, 3).map((row, i) => <div key={i} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3"><span className={row.side === "Buy" ? "text-emerald-200" : "text-red-200"}>{row.side}</span><span className="font-bold text-white">{row.notional}</span></div>) : <p className="text-sm text-white/50">Waiting for HYPE TWAP-like clusters.</p>}</div></DataCard>
      </div>
    </>
  );

  const marketsView = (
    <>
      <ViewHeader icon={BarChart3} eyebrow="Markets" title="HYPE plus the important perp context" description="HYPE first, with FDV, open interest, funding, 24h volume and risk heat. Other perps are context, not the main story." right={<StatusPill status={marketsStatus} />} />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <DataCard className="p-5"><div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><Search className="h-4 w-4 text-white/40" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search market..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" /></div><div className="overflow-hidden rounded-2xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.22em] text-white/40"><tr><th className="px-4 py-3">Market</th><th>Price</th><th>24h</th><th>FDV</th><th>OI</th><th>Funding</th><th>Risk</th></tr></thead><tbody>{filteredMarkets.slice(0, 18).map((row) => <tr key={row.symbol} className="border-t border-white/10"><td className="px-4 py-3 font-black text-white">{row.symbol}</td><td className="font-bold text-white">{row.price}</td><td className={row.rawChange >= 0 ? "font-bold text-emerald-200" : "font-bold text-red-200"}>{row.rawChange >= 0 ? "↗" : "↘"} {row.change}</td><td className="text-white/65">{row.symbol === "HYPE" ? row.fdv : "--"}</td><td className="text-white/75">{row.oi}</td><td className={row.rawFunding >= 0 ? "text-emerald-200" : "text-red-200"}>{row.funding}</td><td><span className={cn("rounded-full border px-2 py-1 text-xs", riskTone(row.risk))}>{row.risk}</span></td></tr>)}</tbody></table></div></DataCard>
        <DataCard className="p-5"><h2 className="text-lg font-black text-white">Volume bars</h2><p className="mb-4 text-sm text-white/50">HYPE 24h candle volume when available.</p><BarMiniChart values={history.map((p) => p.volume)} /><h2 className="mt-6 text-lg font-black text-white">Risk heat</h2><div className="mt-4 space-y-3">{markets.slice(0, 8).map((row) => <div key={row.symbol}><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-white">{row.symbol}</span><span className="text-white/45">{row.risk}/100</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${row.risk}%` }} /></div></div>)}</div></DataCard>
      </div>
    </>
  );

  const nftView = (
    <>
      <ViewHeader icon={ImageIcon} eyebrow="Hypurr NFT tape" title="Hypurr NFT sales, floor and images" description="Clean NFT feed: no fake placeholders. If OpenSea does not return media, the card says it clearly instead of showing bogus data." right={<><StatusPill status={nftStatus} /><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-100 hover:bg-white/10">OpenSea <ExternalLink className="h-3 w-3" /></a></>} />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{Object.entries(nftStats).map(([key, value]) => <DataCard key={key} className="p-4"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">{key}</p><p className="mt-3 text-2xl font-black text-white">{value}</p></DataCard>)}</div>
      <DataCard className="mt-5 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Latest sales</h2><p className="text-sm text-white/50">Updated {formatClock(nftLastUpdated)} · refresh every 120s</p></div><RefreshCw className={cn("h-4 w-4 text-cyan-200", nftStatus === "loading" && "animate-spin")} /></div><NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} max={12} /></DataCard>
    </>
  );

  const buybacksView = <><ViewHeader icon={Flame} eyebrow="Buybacks" title="Assistance Fund pressure" description="Estimated HYPE buyback pressure from public market data. Exact historical buybacks need a dedicated indexed source." right={<StatusPill status={buybackStatus} />} /><DataCard className="p-6"><div className="grid gap-4 md:grid-cols-3"><BigMetric icon={Flame} label="Estimated 24h buybacks" value={formatUsd(buybackUsd)} sub={formatNative(buybackHype)} tone="amber" /><BigMetric icon={Activity} label="HYPE volume" value={hype.volumeLabel} sub="proxy input" tone="green" /><BigMetric icon={Wallet} label="AF route" value="System" sub={shortAddress(buybacks.assistanceFundAddress)} tone="cyan" /></div><p className="mt-6 text-sm text-white/55">{buybacks.note}</p></DataCard></>;
  const twapsView = <><ViewHeader icon={Clock} eyebrow="HYPE TWAP" title="HYPE sliced flow" description="Only HYPE. This detects recent trade clusters that look like sliced execution, instead of showing irrelevant BTC/ETH noise." right={<StatusPill status={twapStatus} />} /><DataCard className="p-5"><div className="space-y-3">{twaps.length ? twaps.map((row, index) => <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-6"><div className={row.side === "Buy" ? "font-black text-emerald-200" : "font-black text-red-200"}>{row.side}</div><div className="text-white">{row.notional}</div><div className="text-white/60">{row.slices} slices</div><div className="text-white/60">Avg {row.avgPrice}</div><div className="text-white/60">{row.lastTrade}</div><div className="text-white/60">{row.confidence}</div></div>) : <NftEmptyState message="No HYPE TWAP-like cluster detected right now." compact />}</div></DataCard></>;
  const vaultsView = <><ViewHeader icon={Layers} eyebrow="HLP" title="HLP and useful vault yield" description="Focus on vaults that people may actually care about: size, APR proxy and basic risk heat." right={<StatusPill status={vaultStatus} />} /><DataCard className="p-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vaults.map((vault) => <DataCard key={vault.name} className="p-5"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-white">{vault.name}</h3><p className="text-sm text-white/45">{vault.status}</p></div><span className={cn("rounded-full border px-2 py-1 text-xs", riskTone(vault.score))}>{vault.score}</span></div><p className="mt-5 text-3xl font-black text-white">{vault.aum}</p><p className="mt-1 text-sm text-emerald-200">{vault.apr}</p></DataCard>)}</div></DataCard></>;
  const flowsView = <><ViewHeader icon={Globe2} eyebrow="TradFi" title="HYPE ETP / ETF watch" description="No fake daily inflow number. This page should show AUM / holdings / volume when a reliable source is wired." right={<StatusPill status={flowStatus} />} /><DataCard className="p-5"><div className="space-y-3">{flows.map((flow) => <div key={flow.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-white">{flow.name}</h3><p className="text-sm text-white/45">{flow.ticker} · {flow.venue}</p></div><a href={flow.url || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-100">Source <ExternalLink className="h-3 w-3" /></a></div><div className="mt-4 grid gap-3 md:grid-cols-4"><p className="text-sm text-white/60">AUM <b className="block text-white">{flow.aum || "--"}</b></p><p className="text-sm text-white/60">Holdings <b className="block text-white">{flow.holdings || "--"}</b></p><p className="text-sm text-white/60">Flow <b className="block text-white">{flow.dailyFlow || "Source needed"}</b></p><p className="text-sm text-white/60">Fee <b className="block text-white">{flow.fee || "--"}</b></p></div></div>)}</div></DataCard></>;
  const whalesView = <><ViewHeader icon={Wallet} eyebrow="Wallet scan" title="Scan a Hyperliquid wallet" description="The public API can scan an address you provide. It does not provide a reliable global top-whale leaderboard for free, so the fake Top 20 idea is removed." right={<StatusPill status={whaleStatus} />} /><DataCard className="p-5"><div className="flex flex-col gap-3 md:flex-row"><input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x wallet address..." className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/35" /><button onClick={scanWallet} className="rounded-2xl bg-cyan-200 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-100">Scan wallet</button></div><p className="mt-3 text-sm text-white/55">{whaleMessage}</p><div className="mt-5 space-y-3">{whaleRows.map((row, index) => <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black text-white">{row.side} {row.coin}</h3><span className={cn("rounded-full border px-2 py-1 text-xs", row.danger === "High" ? "border-red-300/20 bg-red-400/10 text-red-200" : row.danger === "Medium" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200")}>{row.danger}</span></div><div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-5"><span>{row.size}</span><span>{row.notional}</span><span>Entry {row.entry}</span><span className={row.rawPnl >= 0 ? "text-emerald-200" : "text-red-200"}>{row.pnl}</span><span>Liq {row.liquidation}</span></div></div>)}</div></DataCard></>;

  const view = activeView === "overview" ? overview : activeView === "markets" ? marketsView : activeView === "buybacks" ? buybacksView : activeView === "twaps" ? twapsView : activeView === "nfts" ? nftView : activeView === "vaults" ? vaultsView : activeView === "flows" ? flowsView : whalesView;

  return (
    <main className="min-h-screen bg-[#031b18] text-white">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-white/10 bg-[#031612]/95 p-4 backdrop-blur lg:block">
        <div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10"><Zap className="h-5 w-5 text-cyan-100" /></div><div><p className="text-sm font-black uppercase tracking-[0.25em]">Hypurr Scope</p><p className="text-xs text-white/45">HYPE market console</p></div></div>
        <nav className="space-y-2">{navItems.map((item) => { const Icon = item.icon; const active = activeView === item.id; return <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition", active ? "border-cyan-200/25 bg-cyan-300/10 text-white" : "border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white")}><Icon className="h-4 w-4" /><span><span className="block text-sm font-black">{item.label}</span><span className="block text-[11px] text-white/45">{item.description}</span></span></button>; })}</nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/45"><div className="mb-2 flex items-center justify-between"><span>Refresh</span><RefreshCw className="h-3.5 w-3.5" /></div><p>Markets 20s · NFTs 120s</p><p>Last update: {formatClock(lastUpdated)}</p></div>
      </aside>
      <section className="px-4 py-6 lg:ml-60 lg:px-8 xl:px-12"><div className="mx-auto max-w-[1500px]">{view}</div></section>
    </main>
  );
}

function CoinsIcon({ className }: { className?: string }) {
  return <Zap className={className} />;
}

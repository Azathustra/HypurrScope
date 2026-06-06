"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
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
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

type ViewId = "overview" | "markets" | "buybacks" | "twaps" | "nfts" | "hlp" | "flows" | "wallet";
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
type NftStats = { floor: string; volume24h: string; totalVolume: string; listed: string; owners: string; sales24h: string };
type NftSale = { id: string; name: string; price: string; usd?: string; time: string; image?: string; url?: string };
type TwapRow = { side: "Buy" | "Sell"; notional: string; rawNotional: number; size: string; slices: number; avgPrice: string; lastTrade: string; confidence: string };
type TradeRow = { id: string; side: "Buy" | "Sell"; price: string; size: string; notionalLabel: string; timeLabel: string; rawNotional?: number };
type BuybackData = {
  ok?: boolean;
  live?: boolean;
  source?: string;
  updatedAt?: string;
  assistanceFundAddress?: string;
  estimatedBuybackUsd24h?: number;
  estimatedBuybackHype24h?: number;
  estimatedBuybackUsd24hLabel?: string;
  estimatedBuybackHype24hLabel?: string;
  totalFeeUsd24hLabel?: string;
  note?: string;
};
type VaultRow = { name: string; aum: string; rawAum: number; apr: string; score: number; status: string; leader?: string; age?: string };
type FlowRow = { name: string; ticker: string; venue: string; status: string; dailyFlow?: string; aum?: string; holdings?: string; fee?: string; url?: string; updatedAt?: string };
type WhaleRow = { coin: string; side: string; size: string; notional: string; entry: string; pnl: string; rawPnl: number; liquidation: string; leverage: string; danger: "Low" | "Medium" | "High" | "Watch" };

type NavItem = { id: ViewId; label: string; description: string; icon: IconType };

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const FALLBACK_MARKETS: MarketRow[] = [
  { symbol: "HYPE", price: "$59.63", rawPrice: 59.63, change: "-11.15%", rawChange: -11.15, oi: "$1.26B", rawOi: 1_260_000_000, volumeLabel: "$640.00M", rawVolume: 640_000_000, funding: "+0.0140%", rawFunding: 0.00014, fdv: "$59.63B", rawFdv: 59_630_000_000, risk: 72 },
  { symbol: "BTC", price: "$104.82K", rawPrice: 104_820, change: "+1.20%", rawChange: 1.2, oi: "$3.44B", rawOi: 3_440_000_000, volumeLabel: "$1.94B", rawVolume: 1_940_000_000, funding: "+0.0060%", rawFunding: 0.00006, fdv: "--", risk: 48 },
  { symbol: "ETH", price: "$5.93K", rawPrice: 5_930, change: "+2.60%", rawChange: 2.6, oi: "$2.11B", rawOi: 2_110_000_000, volumeLabel: "$1.12B", rawVolume: 1_120_000_000, funding: "+0.0120%", rawFunding: 0.00012, fdv: "--", risk: 61 },
  { symbol: "SOL", price: "$238.12", rawPrice: 238.12, change: "-0.90%", rawChange: -0.9, oi: "$884.00M", rawOi: 884_000_000, volumeLabel: "$420.00M", rawVolume: 420_000_000, funding: "-0.0040%", rawFunding: -0.00004, fdv: "--", risk: 39 },
];

const FALLBACK_HISTORY: HistoryPoint[] = Array.from({ length: 48 }).map((_, index) => {
  const wave = Math.sin(index / 4) * 1.8 + Math.cos(index / 7) * 1.4 - Math.sin(index / 11) * 0.9;
  return { time: Date.now() - (47 - index) * 30 * 60_000, price: 58 + wave + index * 0.015, volume: 1_000_000 + Math.abs(Math.sin(index / 3)) * 2_000_000 };
});

const EMPTY_NFT_STATS: NftStats = { floor: "--", volume24h: "--", totalVolume: "--", listed: "--", owners: "--", sales24h: "--" };
const EMPTY_BUYBACK: BuybackData = { live: false, estimatedBuybackUsd24h: 0, estimatedBuybackHype24h: 0, note: "Loading fee-pressure estimate." };
const FALLBACK_VAULTS: VaultRow[] = [{ name: "HLP", aum: "Loading", rawAum: 0, apr: "Loading", score: 48, status: "Live" }];
const FALLBACK_FLOWS: FlowRow[] = [
  { name: "21Shares Hyperliquid ETP", ticker: "HYPE", venue: "EU ETP watch", status: "Product watch", dailyFlow: "Connect feed", aum: "Product page", holdings: "Product page", fee: "Product page", url: "https://www.21shares.com/" },
  { name: "CoinShares Hyperliquid Staking ETP", ticker: "LIQD", venue: "Xetra watch", status: "Product watch", dailyFlow: "Connect feed", aum: "Product page", holdings: "Product page", fee: "Product page", url: "https://coinshares.com/" },
  { name: "Bitwise Hyperliquid ETF", ticker: "BHYP", venue: "US filing watch", status: "Filing / launch watch", dailyFlow: "N/A", aum: "--", holdings: "--", fee: "--", url: "https://www.sec.gov/" },
];

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", description: "Key pulse", icon: Gauge },
  { id: "markets", label: "Markets", description: "HYPE + perps", icon: BarChart3 },
  { id: "buybacks", label: "Buybacks", description: "AF pressure", icon: Flame },
  { id: "twaps", label: "HYPE Tape", description: "TWAP flow", icon: Clock3 },
  { id: "nfts", label: "Hypurr NFTs", description: "Sales + floor", icon: ImageIcon },
  { id: "hlp", label: "HLP", description: "Yield monitor", icon: Layers },
  { id: "flows", label: "TradFi", description: "ETP watch", icon: Globe2 },
  { id: "wallet", label: "Wallet scan", description: "Risk lookup", icon: Wallet },
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
  return Math.round(clamp(12 + move * 2.4 + fundingPressure + oiPressure + volumePressure, 5, 99));
}

function buildMarketRowsFromHyperliquid(payload: unknown): MarketRow[] {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as any;
  const assetContexts = tuple[1] as any;
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
    .slice(0, 40);
}

function parseHistory(payload: unknown): HistoryPoint[] {
  const rows = Array.isArray((payload as any)?.candles) ? (payload as any).candles : Array.isArray(payload) ? payload : [];
  return rows
    .map((candle: any) => ({
      time: toNumber(candle.t || candle.time || candle.timestamp),
      price: toNumber(candle.c || candle.close),
      volume: toNumber(candle.v || candle.volume),
    }))
    .filter((row: HistoryPoint) => row.time > 0 && row.price > 0)
    .slice(-96);
}

function parseNftStats(payload: unknown): NftStats {
  const data = payload as any;
  const total = data?.total || {};
  const intervals = Array.isArray(data?.intervals) ? data.intervals : [];
  const day = intervals.find((item: any) => ["one_day", "1d", "day"].includes(item.interval)) || {};
  const floor = toNumber(total.floor_price ?? total.floorPrice ?? data?.floor_price ?? data?.floorPrice);
  const volume24 = toNumber(day.volume ?? day.volume_diff ?? data?.one_day_volume);
  const totalVolume = toNumber(total.volume ?? data?.volume);
  const listed = toNumber(total.listed ?? data?.listed ?? data?.listing_count);
  const owners = toNumber(total.num_owners ?? data?.num_owners);
  const sales24h = toNumber(day.sales ?? day.sales_diff ?? data?.one_day_sales);
  return {
    floor: floor ? formatNative(floor, "HYPE") : EMPTY_NFT_STATS.floor,
    volume24h: volume24 ? formatNative(volume24, "HYPE") : EMPTY_NFT_STATS.volume24h,
    totalVolume: totalVolume ? formatNative(totalVolume, "HYPE") : EMPTY_NFT_STATS.totalVolume,
    listed: listed ? `${listed.toFixed(listed > 20 ? 0 : 1)}%` : EMPTY_NFT_STATS.listed,
    owners: owners ? owners.toLocaleString("en-US") : EMPTY_NFT_STATS.owners,
    sales24h: sales24h ? String(Math.round(sales24h)) : EMPTY_NFT_STATS.sales24h,
  };
}

function normalizeOpenSeaPrice(event: any) {
  if (typeof event.price === "string") return event.price;
  if (typeof event.priceLabel === "string") return event.priceLabel;
  const payment = event.payment || event.payment_token || event.price?.currency || {};
  const rawQuantity = event.payment?.quantity ?? event.closing_price ?? event.price?.quantity ?? event.quantity;
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? 18);
  const symbol = payment.symbol || event.price?.currency?.symbol || event.token?.symbol || "WHYPE";
  const rawNumber = Number(rawQuantity);
  if (!Number.isFinite(rawNumber) || rawNumber <= 0) return `-- ${symbol}`;
  const normalized = rawNumber > 1_000_000_000 ? rawNumber / 10 ** decimals : rawNumber;
  return formatNative(normalized, symbol);
}

function normalizeNftSale(raw: any, index: number): NftSale {
  const nft = raw.nft || raw.asset || raw.item || raw;
  const id = String(raw.id || nft.identifier || nft.token_id || raw.tokenId || raw.token_id || raw.nft_id || index + 1);
  const image = raw.image || raw.image_url || raw.display_image_url || nft.image_url || nft.image || nft.display_image_url || nft.metadata?.image || "";
  const name = raw.name || nft.name || `Hypurr #${id}`;
  const time = raw.time || raw.timeLabel || "recent";
  return {
    id,
    name,
    price: normalizeOpenSeaPrice(raw),
    usd: raw.usd || raw.usdPrice || raw.usd_price || "",
    time,
    image,
    url: raw.url || raw.permalink || nft.permalink || nft.opensea_url || OPENSEA_COLLECTION_URL,
  };
}

function parseNftSales(payload: unknown): NftSale[] {
  const data = payload as any;
  const candidates = data?.sales || data?.items || data?.results || data?.asset_events || data?.events || [];
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

function parseVaults(payload: unknown): VaultRow[] {
  const data = payload as any;
  const rows = Array.isArray(data) ? data : Array.isArray(data?.vaults) ? data.vaults : [];
  return rows
    .map((vault: any) => {
      const summary = vault.summary || vault;
      const name = summary.name || vault.name || "Unnamed vault";
      const aum = toNumber(summary.tvl || vault.tvl || vault.accountValue || vault.equity);
      const apr = toNumber(vault.apr || summary.apr || vault.apy || summary.apy);
      return {
        name,
        aum: formatUsd(aum),
        rawAum: aum,
        apr: apr ? formatPercent(apr, 2) : "--",
        score: Math.round(clamp(35 + Math.abs(apr) * 0.25, 5, 99)),
        status: summary.isClosed ? "Closed" : "Open",
        leader: summary.leader || vault.leader || "",
        age: "--",
      } satisfies VaultRow;
    })
    .filter((row: VaultRow) => row.rawAum > 0)
    .sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum)
    .slice(0, 10);
}

function buildWhaleRowsFromState(payload: unknown, markets: MarketRow[]): WhaleRow[] {
  const data = payload as any;
  const marketBySymbol = new Map(markets.map((row) => [row.symbol, row]));
  const positions = Array.isArray(data?.assetPositions) ? data.assetPositions : [];
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

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[1.65rem] border border-white/15 bg-[#082b25]/70 shadow-glow backdrop-blur-xl", className)}>{children}</section>;
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.055] px-3 py-1 text-[11px] font-black text-white/85", className)}>{children}</span>;
}

function StatusPill({ status }: { status: ApiStatus }) {
  const tone = status === "live" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : status === "loading" ? "border-cyan-200/20 bg-cyan-300/10 text-cyan-100" : status === "error" ? "border-red-300/25 bg-red-400/10 text-red-200" : "border-amber-200/20 bg-amber-300/10 text-amber-100";
  return <Pill className={tone}><Radio className="h-3 w-3" />{status === "live" ? "Live API" : status === "loading" ? "Loading" : status === "error" ? "Error" : "Fallback"}</Pill>;
}

function MoveBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <Pill className={up ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100" : "border-red-300/25 bg-red-400/15 text-red-100"}><Icon className="h-3 w-3" />{formatPercent(value, 2)} 24h</Pill>;
}

function BigMetric({ icon: Icon, label, value, sub, change, tone = "cyan" }: { icon: IconType; label: string; value: string; sub?: string; change?: number; tone?: "cyan" | "green" | "amber" | "red" }) {
  const toneClass = { cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-100", green: "from-emerald-300/20 to-teal-300/5 text-emerald-100", amber: "from-amber-300/20 to-orange-300/5 text-amber-100", red: "from-red-300/20 to-pink-300/5 text-red-100" }[tone];
  return (
    <Panel className="relative min-h-[150px] overflow-hidden p-6">
      <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className={cn("absolute right-5 top-5 rounded-2xl bg-gradient-to-br p-4", toneClass)}><Icon className="h-5 w-5" /></div>
      <p className="mb-5 text-[11px] font-black uppercase tracking-[0.34em] text-white/45">{label}</p>
      <p className="text-4xl font-black tracking-tight text-white">{value}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/55">
        {typeof change === "number" && Number.isFinite(change) ? <MoveBadge value={change} /> : null}
        {sub ? <span>{sub}</span> : null}
      </div>
    </Panel>
  );
}

function Sparkline({ points, height = 220, stroke = "#fda4af", fill = true }: { points: number[]; height?: number; stroke?: string; fill?: boolean }) {
  const width = 720;
  const clean = points.filter((n) => Number.isFinite(n));
  const values = clean.length > 1 ? clean : [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 28) - 14;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
      {fill ? <path d={area} fill="url(#areaGradient)" opacity="0.38" /> : null}
      <defs>
        <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.55" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarMiniChart({ values }: { values: number[] }) {
  const clean = values.filter((n) => Number.isFinite(n));
  const max = Math.max(...clean, 1);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {clean.slice(-44).map((value, index) => (
        <div key={index} className="min-w-[5px] flex-1 rounded-t bg-cyan-200/55" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function ViewHeader({ icon: Icon, eyebrow, title, description, right }: { icon: IconType; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Pill className="mb-4 border-cyan-200/25 bg-cyan-200/10 text-cyan-100"><Icon className="h-3.5 w-3.5" />{eyebrow}</Pill>
        <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-cyan-50/80">{description}</p>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

function NftEmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[340px] place-items-center rounded-3xl border border-dashed border-white/15 bg-black/15 p-8 text-center">
      <div>
        <ImageIcon className="mx-auto mb-4 h-12 w-12 text-white/35" />
        <p className="text-lg font-black text-white">No live NFT sales loaded</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/55">{message}</p>
        <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-sm font-black text-cyan-100">OpenSea <ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
  );
}

function NftSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={cn("rounded-3xl border border-white/10 bg-white/[0.04]", compact ? "h-64" : "h-80")} />;
}

function NftSaleCard({ sale, compact = false }: { sale: NftSale; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(sale.image && !broken);
  return (
    <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-white/15 bg-[#062923]/90 transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:bg-[#08382f]">
      <div className={cn("relative overflow-hidden bg-[#073c33]", compact ? "h-72" : "h-80")}>
        {hasImage ? (
          <img
            src={sale.image}
            alt={sale.name}
            onError={() => setBroken(true)}
            loading={compact ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-left-top transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-center text-white/45">
            <div>
              <ImageIcon className="mx-auto mb-2 h-10 w-10" />
              <p className="text-[11px] font-black uppercase tracking-[0.34em]">No image</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">{sale.name}</p>
          <p className="mt-1 text-sm text-white/50">{sale.time}</p>
        </div>
        <Pill className="shrink-0 border-cyan-200/25 bg-cyan-200/10 text-cyan-50">{sale.price}</Pill>
      </div>
    </a>
  );
}

function NftGrid({ sales, loading, message, compact = false, max = 12 }: { sales: NftSale[]; loading: boolean; message: string; compact?: boolean; max?: number }) {
  if (!loading && sales.length === 0) return <NftEmptyState message={message} />;
  if (loading && sales.length === 0) {
    return <div className={cn("grid gap-5", compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>{Array.from({ length: compact ? 4 : 9 }).map((_, index) => <NftSkeleton key={index} compact={compact} />)}</div>;
  }
  return <div className={cn("grid gap-5", compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>{sales.slice(0, max).map((sale) => <NftSaleCard key={`${sale.id}-${sale.name}`} sale={sale} compact={compact} />)}</div>;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [markets, setMarkets] = useState<MarketRow[]>(FALLBACK_MARKETS);
  const [marketsStatus, setMarketsStatus] = useState<ApiStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>(FALLBACK_HISTORY);
  const [nftStats, setNftStats] = useState<NftStats>(EMPTY_NFT_STATS);
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [nftStatus, setNftStatus] = useState<ApiStatus>("loading");
  const [nftMessage, setNftMessage] = useState("Loading Hypurr sales from OpenSea.");
  const [nftLastUpdated, setNftLastUpdated] = useState<Date | null>(null);
  const [twaps, setTwaps] = useState<TwapRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [twapSummary, setTwapSummary] = useState<any>(null);
  const [twapStatus, setTwapStatus] = useState<ApiStatus>("loading");
  const [buybacks, setBuybacks] = useState<BuybackData>(EMPTY_BUYBACK);
  const [buybackStatus, setBuybackStatus] = useState<ApiStatus>("loading");
  const [vaults, setVaults] = useState<VaultRow[]>(FALLBACK_VAULTS);
  const [vaultStatus, setVaultStatus] = useState<ApiStatus>("loading");
  const [flows, setFlows] = useState<FlowRow[]>(FALLBACK_FLOWS);
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
        const rows = buildMarketRowsFromHyperliquid(await res.json());
        if (mounted && rows.length) {
          setMarkets(rows);
          setMarketsStatus("live");
          setLastUpdated(new Date());
        }
      } catch {
        if (mounted) {
          setMarkets(FALLBACK_MARKETS);
          setMarketsStatus("fallback");
          setLastUpdated(new Date());
        }
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
        if (mounted) setHistory(FALLBACK_HISTORY);
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
        const payload = await eventsRes.value.json();
        const sales = parseNftSales(payload);
        if (!sales.length) throw new Error(payload?.error || "no sales");
        if (mounted) {
          setNftSales(sales);
          setNftStatus("live");
          setNftMessage("Real Hypurr sale feed loaded.");
          setNftLastUpdated(new Date());
        }
      } catch {
        if (mounted) {
          setNftSales([]);
          setNftStatus("error");
          setNftMessage("OpenSea did not return live sales. Add OPENSEA_API_KEY in Vercel, then reload.");
          setNftLastUpdated(new Date());
        }
      }
    }
    window.setTimeout(loadNfts, 350);
    const interval = window.setInterval(loadNfts, 120_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadExtras() {
      try {
        const buybackRes = await fetch("/api/hyperliquid/buybacks", { method: "GET" });
        if (buybackRes.ok && mounted) {
          setBuybacks(await buybackRes.json());
          setBuybackStatus("live");
        }
      } catch { if (mounted) setBuybackStatus("fallback"); }
      try {
        const twapRes = await fetch("/api/hyperliquid/twaps", { method: "GET" });
        if (twapRes.ok && mounted) {
          const payload = await twapRes.json();
          setTwaps(Array.isArray(payload?.twaps) ? payload.twaps : []);
          setTrades(Array.isArray(payload?.trades) ? payload.trades : []);
          setTwapSummary(payload?.summary || null);
          setTwapStatus(payload?.ok ? "live" : "fallback");
        }
      } catch { if (mounted) setTwapStatus("fallback"); }
      try {
        const vaultRes = await fetch("/api/hyperliquid/vaults", { method: "GET" });
        if (vaultRes.ok && mounted) {
          const rows = parseVaults(await vaultRes.json());
          if (rows.length) setVaults(rows);
          setVaultStatus(rows.length ? "live" : "fallback");
        }
      } catch { if (mounted) setVaultStatus("fallback"); }
      try {
        const flowRes = await fetch("/api/tradfi/flows", { method: "GET" });
        if (flowRes.ok && mounted) {
          const payload = await flowRes.json();
          if (Array.isArray(payload?.flows)) setFlows(payload.flows);
          setFlowStatus(payload?.source === "custom-json" ? "live" : "fallback");
        }
      } catch { if (mounted) setFlowStatus("fallback"); }
    }
    loadExtras();
    const interval = window.setInterval(loadExtras, 30_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const hype = useMemo(() => markets.find((row) => row.symbol === "HYPE") || FALLBACK_MARKETS[0], [markets]);
  const totalOi = useMemo(() => markets.reduce((sum, row) => sum + row.rawOi, 0), [markets]);
  const filteredMarkets = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())), [markets, query]);
  const marketRisk = useMemo(() => Math.round(markets.reduce((sum, row) => sum + row.risk, 0) / Math.max(markets.length, 1)), [markets]);
  const buybackUsd = buybacks.estimatedBuybackUsd24h || hype.rawVolume * 0.0002;
  const buybackHype = buybacks.estimatedBuybackHype24h || (hype.rawPrice ? buybackUsd / hype.rawPrice : 0);
  const mainStroke = hype.rawChange >= 0 ? "#86efac" : "#fda4af";

  async function scanWallet() {
    const address = wallet.trim();
    if (!isValidEvmAddress(address)) {
      setWhaleStatus("error");
      setWhaleMessage("Invalid address. Paste a 0x EVM address.");
      setWhaleRows([]);
      return;
    }
    try {
      setWhaleStatus("loading");
      const res = await fetch("/api/hyperliquid/whales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: address }) });
      if (!res.ok) throw new Error("scan failed");
      const payload = await res.json();
      const rows = buildWhaleRowsFromState(payload, markets);
      setWhaleRows(rows);
      setWhaleStatus("live");
      setWhaleMessage(rows.length ? `${rows.length} open positions found for ${shortAddress(address)}.` : `No open perp positions found for ${shortAddress(address)}.`);
    } catch {
      setWhaleStatus("error");
      setWhaleMessage("Could not scan this wallet right now.");
      setWhaleRows([]);
    }
  }

  const Overview = (
    <>
      <ViewHeader
        icon={Activity}
        eyebrow="Live HYPE console"
        title="HYPE price, buybacks, NFTs and market pressure"
        description="A cleaner dashboard focused on the signals that matter: HYPE price action, FDV, open interest, fee-pressure, TWAP-like flow and latest Hypurr sales."
        right={<><StatusPill status={marketsStatus} /><StatusPill status={nftStatus} /></>}
      />
      <div className="grid gap-5 xl:grid-cols-4">
        <BigMetric icon={hype.rawChange >= 0 ? TrendingUp : TrendingDown} label="HYPE price" value={hype.price} sub={`OI ${hype.oi}`} change={hype.rawChange} tone={hype.rawChange >= 0 ? "green" : "red"} />
        <BigMetric icon={Zap} label="FDV" value={hype.fdv || formatUsd(hype.rawPrice * HYPE_TOTAL_SUPPLY)} sub="1B total supply" tone="cyan" />
        <BigMetric icon={Activity} label="24h volume" value={hype.volumeLabel} sub={`Total tracked ${formatUsd(totalOi)}`} tone="green" />
        <BigMetric icon={Flame} label="Buyback pressure" value={formatUsd(buybackUsd)} sub={`${formatNative(buybackHype)} / 24h`} tone="amber" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
        <Panel className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-white">HYPE 24h chart</h2><p className="mt-1 text-sm text-white/55">Live candles when available. Badge shows the 24h move.</p></div>
            <MoveBadge value={hype.rawChange} />
          </div>
          <div className="h-[310px] rounded-3xl border border-white/10 bg-black/18 p-5"><Sparkline points={history.map((point) => point.price)} height={260} stroke={mainStroke} /></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5"><p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Perp Open Interest</p><p className="mt-3 text-3xl font-black">{hype.oi}</p><p className="text-sm text-white/50">{totalOi > 0 ? `${((hype.rawOi / totalOi) * 100).toFixed(1)}% of tracked OI` : "HYPE OI share"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5"><p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Funding</p><p className={cn("mt-3 text-3xl font-black", hype.rawFunding >= 0 ? "text-emerald-200" : "text-red-200")}>{hype.funding}</p><p className="text-sm text-white/50">Longs pay if positive</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5"><p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Risk heat</p><p className="mt-3 text-3xl font-black">{hype.risk}/100</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-200" style={{ width: `${hype.risk}%` }} /></div></div>
          </div>
        </Panel>
        <Panel className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">Latest Hypurr NFT sales</h2><p className="mt-1 text-sm text-white/55">Cropped to the NFT art. Auto-refresh every 120s.</p></div><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer"><Pill>OpenSea <ExternalLink className="h-3 w-3" /></Pill></a></div>
          <NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} compact max={4} />
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black">Buyback monitor</h3><p className="text-sm text-white/55">Estimated daily Assistance Fund pressure.</p></div><Flame className="h-6 w-6 text-amber-200" /></div><p className="mt-8 text-5xl font-black text-amber-50">{formatUsd(buybackUsd)}</p><p className="mt-2 text-white/55">{formatNative(buybackHype)} equivalent</p></Panel>
        <Panel className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black">HLP focus</h3><p className="text-sm text-white/55">Main vault block, not random vault spam.</p></div><Layers className="h-6 w-6 text-cyan-100" /></div><p className="mt-8 text-5xl font-black">{vaults[0]?.aum || "--"}</p><p className="mt-2 text-white/55">APR {vaults[0]?.apr || "--"}</p></Panel>
        <Panel className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black">HYPE tape</h3><p className="text-sm text-white/55">Recent HYPE trade clustering.</p></div><Clock3 className="h-6 w-6 text-cyan-100" /></div><p className="mt-8 text-5xl font-black">{twapSummary?.netLabel || "--"}</p><p className={cn("mt-2 font-bold", twapSummary?.netSide === "Sell" ? "text-red-200" : "text-emerald-200")}>{twapSummary?.netSide || "No"} net flow, last 10m</p></Panel>
      </div>
    </>
  );

  const Markets = (
    <>
      <ViewHeader icon={BarChart3} eyebrow="HYPE + perp markets" title="Markets with FDV, OI and risk heat" description="HYPE first, then the largest Hyperliquid perps by open interest. This page is for quickly seeing where leverage and volume are concentrated." right={<StatusPill status={marketsStatus} />} />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="p-6"><h2 className="text-2xl font-black">HYPE core metrics</h2><div className="mt-5 grid gap-4"><BigMini label="Price" value={hype.price} sub={hype.change} danger={hype.rawChange < 0} /><BigMini label="FDV" value={hype.fdv || formatUsd(hype.rawPrice * HYPE_TOTAL_SUPPLY)} sub="1B total supply" /><BigMini label="Open Interest" value={hype.oi} sub={`${totalOi ? ((hype.rawOi / totalOi) * 100).toFixed(1) : "--"}% of tracked OI`} /><BigMini label="24h Volume" value={hype.volumeLabel} sub="Perp notional volume" /></div></Panel>
        <Panel className="p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">Volume bars</h2><Pill>{markets.length} markets</Pill></div><div className="mt-8"><BarMiniChart values={markets.map((row) => row.rawVolume)} /></div><p className="mt-4 text-sm text-white/55">Bars are sorted by current market order, with HYPE pinned first.</p></Panel>
      </div>
      <Panel className="mt-5 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-2xl font-black">Perp market table</h2><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker" className="w-full rounded-full border border-white/10 bg-black/20 py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-200/40 md:w-64" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-[11px] uppercase tracking-[0.25em] text-white/40"><tr><th className="py-3">Coin</th><th>Price</th><th>24h</th><th>Open Interest</th><th>24h Volume</th><th>Funding</th><th>FDV</th><th>Risk</th></tr></thead><tbody>{filteredMarkets.map((row) => <tr key={row.symbol} className="border-t border-white/10"><td className="py-4 font-black text-white">{row.symbol}</td><td>{row.price}</td><td className={row.rawChange >= 0 ? "text-emerald-200" : "text-red-200"}>{row.change}</td><td>{row.oi}</td><td>{row.volumeLabel}</td><td className={row.rawFunding >= 0 ? "text-emerald-200" : "text-red-200"}>{row.funding}</td><td>{row.fdv || "--"}</td><td><Pill className={riskTone(row.risk)}>{row.risk}</Pill></td></tr>)}</tbody></table></div>
      </Panel>
    </>
  );

  const Buybacks = (
    <>
      <ViewHeader icon={Flame} eyebrow="Assistance Fund pressure" title="Buyback pressure, without fake precision" description="This page estimates the daily buyback capacity from HYPE market volume and labels it as an estimate. Exact historical AF purchases need an indexed onchain source." right={<StatusPill status={buybackStatus} />} />
      <div className="grid gap-5 lg:grid-cols-3"><BigMetric icon={Flame} label="Estimated 24h HYPE pressure" value={formatUsd(buybackUsd)} sub={formatNative(buybackHype)} tone="amber" /><BigMetric icon={Activity} label="HYPE 24h volume" value={hype.volumeLabel} sub="Input for estimate" tone="green" /><BigMetric icon={ShieldCheck} label="AF address" value={shortAddress(buybacks.assistanceFundAddress || "0xfefefefefefefefefefefefefefefefefefefefe")} sub="System address" tone="cyan" /></div>
      <Panel className="mt-5 p-6"><h2 className="text-2xl font-black">Notes</h2><p className="mt-3 max-w-4xl leading-7 text-white/65">{buybacks.note || "Estimated from public market context. This is useful directionally, but not a replacement for an indexed Assistance Fund transaction feed."}</p></Panel>
    </>
  );

  const Twaps = (
    <>
      <ViewHeader icon={Clock3} eyebrow="HYPE tape" title="HYPE-only TWAP-like flow" description="This is not a fake multi-asset page: it focuses on HYPE recent trades, detects clustered slices and shows the latest trade tape." right={<StatusPill status={twapStatus} />} />
      <div className="grid gap-5 lg:grid-cols-3"><BigMetric icon={ArrowUpRight} label="Buy flow 10m" value={twapSummary?.buyLabel || "--"} sub={formatNative(twapSummary?.buySize || 0)} tone="green" /><BigMetric icon={ArrowDownRight} label="Sell flow 10m" value={twapSummary?.sellLabel || "--"} sub={formatNative(twapSummary?.sellSize || 0)} tone="red" /><BigMetric icon={Activity} label="Net flow" value={twapSummary?.netLabel || "--"} sub={`${twapSummary?.netSide || "--"} pressure`} tone={twapSummary?.netSide === "Sell" ? "red" : "green"} /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><Panel className="p-6"><h2 className="text-2xl font-black">Detected slices</h2><div className="mt-5 space-y-3">{twaps.length ? twaps.map((row, index) => <div key={`${row.side}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><div className="flex items-center justify-between"><Pill className={row.side === "Buy" ? "text-emerald-100" : "text-red-100"}>{row.side}</Pill><span className="text-xl font-black">{row.notional}</span></div><div className="mt-3 grid grid-cols-4 gap-2 text-xs text-white/55"><span>{row.slices} slices</span><span>{row.size}</span><span>{row.avgPrice}</span><span>{row.lastTrade}</span></div></div>) : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-white/55">No clear clustered HYPE flow detected in the latest window.</p>}</div></Panel><Panel className="p-6"><h2 className="text-2xl font-black">Recent HYPE trades</h2><div className="mt-5 max-h-[520px] overflow-y-auto pr-2 no-scrollbar">{trades.length ? trades.map((trade) => <div key={trade.id} className="grid grid-cols-[72px_1fr_1fr_1fr] gap-3 border-b border-white/10 py-3 text-sm"><span className={trade.side === "Buy" ? "font-black text-emerald-200" : "font-black text-red-200"}>{trade.side}</span><span>{trade.notionalLabel}</span><span>{trade.size}</span><span className="text-right text-white/50">{trade.timeLabel}</span></div>) : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-white/55">Waiting for Hyperliquid recentTrades.</p>}</div></Panel></div>
    </>
  );

  const Nfts = (
    <>
      <ViewHeader icon={ImageIcon} eyebrow="Hypurr NFT tape" title="Hypurr floor, stats and latest sales" description="NFT cards are cropped to the artwork area to avoid the duplicated OpenSea preview text/price overlay." right={<><StatusPill status={nftStatus} /><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer"><Pill>OpenSea <ExternalLink className="h-3 w-3" /></Pill></a></>} />
      <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6"><SmallStat label="Floor" value={nftStats.floor} /><SmallStat label="24h volume" value={nftStats.volume24h} /><SmallStat label="Total volume" value={nftStats.totalVolume} /><SmallStat label="Listed" value={nftStats.listed} /><SmallStat label="Owners" value={nftStats.owners} /><SmallStat label="24h sales" value={nftStats.sales24h} /></div>
      <Panel className="mt-5 p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-2xl font-black">Latest sales</h2><p className="text-sm text-white/55">Updated {formatClock(nftLastUpdated)}. Refresh every 120 seconds.</p></div></div><NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} max={12} /></Panel>
    </>
  );

  const Hlp = (
    <>
      <ViewHeader icon={Layers} eyebrow="HLP + vault monitor" title="HLP first, other vaults second" description="Keeps the vault page useful: HLP focus, then a compact list of high-AUM vaults instead of noise." right={<StatusPill status={vaultStatus} />} />
      <div className="grid gap-5 lg:grid-cols-3"><BigMetric icon={Layers} label="HLP / top vault AUM" value={vaults[0]?.aum || "--"} sub={vaults[0]?.name || "HLP"} tone="cyan" /><BigMetric icon={Activity} label="Yield" value={vaults[0]?.apr || "--"} sub="Reported by stats feed" tone="green" /><BigMetric icon={Gauge} label="Vault score" value={`${vaults[0]?.score || 0}/100`} sub={vaults[0]?.status || "--"} tone="amber" /></div>
      <Panel className="mt-5 p-6"><h2 className="text-2xl font-black">Vault table</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-[11px] uppercase tracking-[0.25em] text-white/40"><tr><th className="py-3">Vault</th><th>AUM</th><th>APR</th><th>Status</th><th>Score</th><th>Leader</th></tr></thead><tbody>{vaults.map((row) => <tr key={`${row.name}-${row.leader}`} className="border-t border-white/10"><td className="py-4 font-black">{row.name}</td><td>{row.aum}</td><td>{row.apr}</td><td>{row.status}</td><td><Pill className={riskTone(row.score)}>{row.score}</Pill></td><td>{row.leader ? shortAddress(row.leader) : "--"}</td></tr>)}</tbody></table></div></Panel>
    </>
  );

  const Flows = (
    <>
      <ViewHeader icon={Globe2} eyebrow="TradFi HYPE watch" title="ETP / ETF product watchlist" description="Daily inflow is only shown when a verified feed is configured. The page avoids fake flow numbers and still tracks relevant products." right={<StatusPill status={flowStatus} />} />
      <Panel className="p-6"><div className="grid gap-4 lg:grid-cols-3">{flows.map((flow) => <div key={`${flow.name}-${flow.ticker}`} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-cyan-100">{flow.ticker}</p><h3 className="mt-2 text-xl font-black">{flow.name}</h3><p className="mt-1 text-sm text-white/50">{flow.venue}</p></div>{flow.url ? <a href={flow.url} target="_blank" rel="noreferrer"><ExternalLink className="h-5 w-5 text-white/50" /></a> : null}</div><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><SmallLine label="Status" value={flow.status} /><SmallLine label="Daily flow" value={flow.dailyFlow || "--"} /><SmallLine label="AUM" value={flow.aum || "--"} /><SmallLine label="Holdings" value={flow.holdings || "--"} /></div></div>)}</div><p className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm leading-6 text-amber-50/80">To make this page truly live like institutional flow dashboards, connect a JSON feed through <code>HYPE_TRADFI_FLOW_JSON_URL</code>. Until then, it stays a watchlist rather than inventing inflows.</p></Panel>
    </>
  );

  const WalletView = (
    <>
      <ViewHeader icon={Wallet} eyebrow="Wallet risk scanner" title="Scan any Hyperliquid wallet" description="Read-only address lookup. No wallet connection, no signatures, no private keys." right={<StatusPill status={whaleStatus} />} />
      <Panel className="p-6"><div className="flex flex-col gap-3 md:flex-row"><input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." className="min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-black/20 px-5 text-white outline-none focus:border-cyan-200/40" /><button onClick={scanWallet} className="min-h-[52px] rounded-2xl border border-cyan-200/25 bg-cyan-200/10 px-6 font-black text-cyan-50 transition hover:bg-cyan-200/20"><Search className="mr-2 inline h-4 w-4" />Scan</button></div><p className="mt-4 text-sm text-white/55">{whaleMessage}</p></Panel>
      <Panel className="mt-5 p-6"><h2 className="text-2xl font-black">Open positions</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-[11px] uppercase tracking-[0.25em] text-white/40"><tr><th className="py-3">Coin</th><th>Side</th><th>Size</th><th>Notional</th><th>Entry</th><th>PNL</th><th>Liq.</th><th>Lev.</th><th>Risk</th></tr></thead><tbody>{whaleRows.length ? whaleRows.map((row, index) => <tr key={`${row.coin}-${index}`} className="border-t border-white/10"><td className="py-4 font-black">{row.coin}</td><td className={row.side === "Long" ? "text-emerald-200" : "text-red-200"}>{row.side}</td><td>{row.size}</td><td>{row.notional}</td><td>{row.entry}</td><td className={row.rawPnl >= 0 ? "text-emerald-200" : "text-red-200"}>{row.pnl}</td><td>{row.liquidation}</td><td>{row.leverage}</td><td><Pill className={row.danger === "High" ? "text-red-100" : row.danger === "Medium" ? "text-amber-100" : "text-emerald-100"}>{row.danger}</Pill></td></tr>) : <tr><td colSpan={9} className="py-8 text-center text-white/45">No wallet scanned yet.</td></tr>}</tbody></table></div></Panel>
    </>
  );

  const content: Record<ViewId, React.ReactNode> = { overview: Overview, markets: Markets, buybacks: Buybacks, twaps: Twaps, nfts: Nfts, hlp: Hlp, flows: Flows, wallet: WalletView };

  return (
    <main className="min-h-screen text-white">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-white/10 bg-[#031612]/95 p-5 backdrop-blur-xl xl:block">
        <div className="mb-9 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10"><Zap className="h-6 w-6 text-cyan-100" /></div>
          <div><p className="text-lg font-black uppercase tracking-[0.25em]">Hypurr Scope</p><p className="text-xs font-bold text-white/45">HYPE market console</p></div>
        </div>
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", active ? "border-cyan-200/35 bg-cyan-200/10 text-white" : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/85")}>
                <Icon className={cn("h-5 w-5", active ? "text-cyan-100" : "text-white/35 group-hover:text-cyan-100")} />
                <span><span className="block font-black">{item.label}</span><span className="text-xs font-semibold text-white/45">{item.description}</span></span>
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-xs text-white/45">
          <div className="flex items-center justify-between"><span className="font-black text-white/70">Refresh</span><RefreshCw className="h-4 w-4" /></div>
          <p className="mt-3">Markets 20s · NFTs 120s · Tape 30s</p><p className="mt-2">Last update: {formatClock(lastUpdated)}</p>
        </div>
      </aside>
      <div className="xl:hidden"><div className="sticky top-0 z-20 border-b border-white/10 bg-[#031612]/95 p-4 backdrop-blur-xl"><div className="mb-3 flex items-center justify-between"><p className="font-black uppercase tracking-[0.25em]">Hypurr Scope</p><StatusPill status={marketsStatus} /></div><div className="flex gap-2 overflow-x-auto no-scrollbar">{NAV_ITEMS.map((item) => <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-black", activeView === item.id ? "border-cyan-200/35 bg-cyan-200/10" : "border-white/10 bg-white/[0.04] text-white/60")}>{item.label}</button>)}</div></div></div>
      <section className="px-4 py-8 md:px-8 xl:ml-72 xl:px-14 xl:py-10">
        {content[activeView]}
      </section>
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <Panel className="p-5"><p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/40">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></Panel>;
}

function BigMini({ label, value, sub, danger = false }: { label: string; value: string; sub: string; danger?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"><p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/40">{label}</p><p className={cn("mt-3 text-3xl font-black", danger ? "text-red-100" : "text-white")}>{value}</p><p className="mt-1 text-sm text-white/50">{sub}</p></div>;
}

function SmallLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-black/18 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p><p className="mt-1 font-bold text-white/85">{value}</p></div>;
}

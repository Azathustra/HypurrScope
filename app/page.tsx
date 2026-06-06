"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
  RefreshCw,
  Search,
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
type BuybackData = { live?: boolean; estimatedBuybackUsd24hLabel?: string; estimatedBuybackHype24hLabel?: string; totalFeeUsd24hLabel?: string; note?: string; };
type VaultRow = { name: string; aum: string; rawAum: number; apr: string; score: number; status: string; leader?: string; age?: string };
type FlowRow = { name: string; ticker: string; venue: string; price?: string; change?: string; volume?: string; dollarVolume?: string; aum?: string; fee?: string; status: string; url?: string; updatedAt?: string };
type WhaleRow = { coin: string; side: string; size: string; notional: string; entry: string; pnl: string; rawPnl: number; liquidation: string; leverage: string; danger: "Low" | "Medium" | "High" | "Watch" };

type NavItem = { id: ViewId; label: string; description: string; icon: IconType };

const HYPE_TOTAL_SUPPLY = 1_000_000_000;
const HYPE_CIRCULATING_SUPPLY_ESTIMATE = 253_320_000;
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
const EMPTY_BUYBACK: BuybackData = { live: false, estimatedBuybackUsd24hLabel: "Loading", estimatedBuybackHype24hLabel: "Loading", note: "Loading fee-pressure estimate." };
const FALLBACK_VAULTS: VaultRow[] = [{ name: "HLP", aum: "Loading", rawAum: 0, apr: "Loading", score: 48, status: "Live" }];
const FALLBACK_FLOWS: FlowRow[] = [
  { name: "Bitwise Hyperliquid ETF", ticker: "BHYP", venue: "NYSE Arca / US", status: "Waiting for quote", volume: "Loading", dollarVolume: "Loading" },
  { name: "21Shares Hyperliquid ETF", ticker: "THYP", venue: "Nasdaq / US", status: "Waiting for quote", volume: "Loading", dollarVolume: "Loading" },
  { name: "21Shares Hyperliquid ETP", ticker: "HYPE.SW", venue: "SIX / Switzerland", status: "Waiting for quote", volume: "Loading", dollarVolume: "Loading" },
  { name: "CoinShares Hyperliquid Staking ETP", ticker: "LIQD.DE", venue: "Xetra / Germany", status: "Waiting for quote", volume: "Loading", dollarVolume: "Loading" },
];

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", description: "Investor dashboard", icon: Gauge },
  { id: "markets", label: "Markets", description: "HYPE + perps", icon: BarChart3 },
  { id: "buybacks", label: "Buybacks", description: "AF pressure", icon: Flame },
  { id: "twaps", label: "HYPE TWAP", description: "Live tape", icon: Clock3 },
  { id: "nfts", label: "Hypurr NFTs", description: "Sales + floor", icon: ImageIcon },
  { id: "hlp", label: "HLP", description: "Yield monitor", icon: Layers },
  { id: "flows", label: "ETF volumes", description: "Daily volume", icon: Globe2 },
  { id: "wallet", label: "Wallet scan", description: "Risk lookup", icon: Wallet },
];

function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" "); }
function toNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
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
function formatPercent(value: number, digits = 2) { if (!Number.isFinite(value)) return "--"; const sign = value > 0 ? "+" : ""; return `${sign}${value.toFixed(digits)}%`; }
function formatClock(date: Date | null) { return date ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--"; }
function shortAddress(address: string) { return !address || address.length < 12 ? address || "" : `${address.slice(0, 6)}...${address.slice(-4)}`; }
function isValidEvmAddress(address: string) { return /^0x[a-fA-F0-9]{40}$/.test(address.trim()); }
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
      return { symbol: asset.name, price: formatUsd(mark), rawPrice: mark, change: formatPercent(rawChange, 2), rawChange, oi: formatUsd(rawOi), rawOi, volumeLabel: formatUsd(rawVolume), rawVolume, funding: formatPercent(funding * 100, 4), rawFunding: funding, fdv: rawFdv ? formatUsd(rawFdv) : "--", rawFdv, risk: calculateRiskScore(rawChange, funding, rawOi, rawVolume) } satisfies MarketRow;
    })
    .filter((row: MarketRow) => row.symbol && row.rawPrice > 0)
    .sort((a: MarketRow, b: MarketRow) => a.symbol === "HYPE" ? -1 : b.symbol === "HYPE" ? 1 : b.rawOi - a.rawOi)
    .slice(0, 40);
}
function parseHistory(payload: unknown): HistoryPoint[] {
  const rows = Array.isArray((payload as any)?.candles) ? (payload as any).candles : Array.isArray(payload) ? payload : [];
  return rows.map((c: any) => ({ time: toNumber(c.t || c.time || c.timestamp), price: toNumber(c.c || c.close), volume: toNumber(c.v || c.volume) })).filter((row: HistoryPoint) => row.time > 0 && row.price > 0).slice(-96);
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
  return { floor: floor ? formatNative(floor, "HYPE") : EMPTY_NFT_STATS.floor, volume24h: volume24 ? formatNative(volume24, "HYPE") : EMPTY_NFT_STATS.volume24h, totalVolume: totalVolume ? formatNative(totalVolume, "HYPE") : EMPTY_NFT_STATS.totalVolume, listed: listed ? `${listed.toFixed(listed > 20 ? 0 : 1)}%` : EMPTY_NFT_STATS.listed, owners: owners ? owners.toLocaleString("en-US") : EMPTY_NFT_STATS.owners, sales24h: sales24h ? String(Math.round(sales24h)) : EMPTY_NFT_STATS.sales24h };
}
function normalizeNftSale(raw: any, index: number): NftSale {
  const nft = raw.nft || raw.asset || raw.item || raw;
  const id = String(raw.id || nft.identifier || nft.token_id || raw.tokenId || raw.token_id || raw.nft_id || index + 1);
  const name = raw.name || nft.name || `Hypurr #${id}`;
  const time = raw.time || raw.timeLabel || "recent";
  const image = raw.image || raw.image_url || raw.display_image_url || nft.image_url || nft.image || nft.display_image_url || nft.metadata?.image || "";
  const price = typeof raw.price === "string" ? raw.price : raw.priceLabel || "-- HYPE";
  return { id, name, price, usd: raw.usd || raw.usdPrice || raw.usd_price || "", time, image, url: raw.url || raw.permalink || nft.permalink || nft.opensea_url || OPENSEA_COLLECTION_URL };
}
function parseNftSales(payload: unknown): NftSale[] {
  const data = payload as any;
  const candidates = data?.sales || data?.items || data?.results || data?.asset_events || data?.events || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.map(normalizeNftSale).filter((sale: NftSale) => sale.name || sale.id).slice(0, 12);
}
function parseVaults(payload: unknown): VaultRow[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.vaults) ? (payload as any).vaults : [];
  return rows.map((vault: any) => {
    const summary = vault.summary || vault;
    const name = summary.name || vault.name || "Unnamed vault";
    const aum = toNumber(summary.tvl || vault.tvl || vault.accountValue || vault.equity);
    const apr = toNumber(vault.apr || summary.apr || vault.apy || summary.apy);
    return { name, aum: formatUsd(aum), rawAum: aum, apr: apr ? formatPercent(apr, 2) : "--", score: Math.round(clamp(35 + Math.abs(apr) * 0.25, 5, 99)), status: summary.isClosed ? "Closed" : "Open", leader: summary.leader || vault.leader || "", age: "--" } satisfies VaultRow;
  }).filter((row: VaultRow) => row.rawAum > 0).sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum).slice(0, 10);
}
function buildWhaleRowsFromState(payload: unknown, markets: MarketRow[]): WhaleRow[] {
  const data = payload as any;
  const marketBySymbol = new Map(markets.map((row) => [row.symbol, row]));
  const positions = Array.isArray(data?.assetPositions) ? data.assetPositions : [];
  return positions.map((item: any) => item.position || item).filter((p: any) => Math.abs(toNumber(p.szi)) > 0).map((position: any) => {
    const coin = position.coin || "--";
    const signedSize = toNumber(position.szi);
    const side = signedSize > 0 ? "Long" : "Short";
    const pnlValue = toNumber(position.unrealizedPnl);
    const current = marketBySymbol.get(coin)?.rawPrice || 0;
    const liq = toNumber(position.liquidationPx);
    const lev = toNumber(position.leverage?.value || position.leverage);
    const liqDistance = liq > 0 && current > 0 ? Math.abs((current - liq) / current) * 100 : 999;
    const danger: WhaleRow["danger"] = liqDistance < 7 || lev >= 8 ? "High" : liqDistance < 15 || lev >= 4 ? "Medium" : "Low";
    return { coin, side, size: `${Math.abs(signedSize).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${coin}`, notional: formatUsd(toNumber(position.positionValue)), entry: formatUsd(toNumber(position.entryPx)), pnl: `${pnlValue >= 0 ? "+" : "-"}${formatUsd(Math.abs(pnlValue))}`, rawPnl: pnlValue, liquidation: liq > 0 ? formatUsd(liq) : "--", leverage: lev > 0 ? `${lev}x` : "--", danger };
  }).sort((a: WhaleRow, b: WhaleRow) => Math.abs(b.rawPnl) - Math.abs(a.rawPnl));
}
function riskTone(value: number) { return value >= 80 ? "text-red-200 bg-red-400/15 border-red-300/20" : value >= 65 ? "text-amber-200 bg-amber-300/15 border-amber-200/20" : value >= 45 ? "text-cyan-100 bg-cyan-300/10 border-cyan-200/15" : "text-cyan-200 bg-cyan-300/10 border-cyan-200/20"; }

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[1.4rem] border border-white/10 bg-white/[0.07] shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-md", className)}>{children}</section>;
}
function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <span className={cn("inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold", className)}>{children}</span>; }
function StatusPill({ status }: { status: ApiStatus }) {
  const tone = status === "live" ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-200" : status === "loading" ? "border-cyan-200/20 bg-cyan-300/10 text-cyan-100" : status === "error" ? "border-red-300/25 bg-red-400/10 text-red-200" : "border-amber-200/20 bg-amber-300/10 text-amber-100";
  return <Pill className={tone}><Activity className="h-3.5 w-3.5" />{status === "live" ? "Live API" : status === "loading" ? "Loading" : status === "error" ? "Error" : "Fallback"}</Pill>;
}
function MoveBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold", up ? "bg-cyan-400/15 text-cyan-100" : "bg-red-400/15 text-red-100")}><Icon className="h-3.5 w-3.5" />{formatPercent(value, 2)} 24h</span>;
}
function BigMetric({ icon: Icon, label, value, sub, change, tone = "cyan" }: { icon: IconType; label: string; value: string; sub?: string; change?: number; tone?: "cyan" | "green" | "amber" | "red" }) {
  const toneClass = { cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-100", green: "from-cyan-300/20 to-teal-300/5 text-cyan-100", amber: "from-amber-300/20 to-orange-300/5 text-amber-100", red: "from-red-300/20 to-pink-300/5 text-red-100" }[tone];
  return <Panel className="relative overflow-hidden p-5"><div className={cn("absolute right-5 top-5 rounded-xl bg-gradient-to-br p-3", toneClass)}><Icon className="h-5 w-5" /></div><p className="text-[0.68rem] font-bold uppercase tracking-[0.34em] text-white/45">{label}</p><p className="mt-5 text-3xl font-bold tracking-tight text-cyan-100">{value}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/55">{typeof change === "number" && Number.isFinite(change) ? <MoveBadge value={change} /> : null}{sub ? <span>{sub}</span> : null}</div></Panel>;
}
function Sparkline({ points, height = 220, stroke = "#fda4af", fill = true }: { points: number[]; height?: number; stroke?: string; fill?: boolean }) {
  const width = 720;
  const values = points.filter(Number.isFinite).length > 1 ? points.filter(Number.isFinite) : [0, 1];
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const coords = values.map((value, index) => { const x = (index / Math.max(values.length - 1, 1)) * width; const y = height - ((value - min) / range) * (height - 28) - 14; return [x, y] as const; });
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((x / width) * Math.max(values.length - 1, 1));
    const clampedIdx = Math.min(Math.max(idx, 0), values.length - 1);
    const value = values[clampedIdx];
    const [, y] = coords[clampedIdx];
    setHoverX((clampedIdx / Math.max(values.length - 1, 1)) * width);
    setHoverY(y);
    setHoverValue(value);
  }

  function handleLeave() {
    setHoverX(null);
    setHoverY(null);
    setHoverValue(null);
  }

  return <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" onMouseMove={handleMove} onMouseLeave={handleLeave}>
    <defs><linearGradient id="hypeArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.36"/><stop offset="100%" stopColor={stroke} stopOpacity="0"/></linearGradient></defs>
    {fill ? <path d={area} fill="url(#hypeArea)" /> : null}
    <path d={path} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
    {hoverX !== null && hoverY !== null && hoverValue !== null ? (<g>
      <line x1={hoverX} y1={0} x2={hoverX} y2={height} stroke={stroke} strokeOpacity={0.18} strokeWidth={1}/>
      <circle cx={hoverX} cy={hoverY} r={4.5} fill="#0b0b12" stroke={stroke} strokeWidth={2}/>
      <circle cx={hoverX} cy={hoverY} r={9} fill={stroke} opacity={0.10}/>
      <g transform={`translate(${Math.min(Math.max(hoverX - 42, 10), width - 94)}, ${Math.max(hoverY - 52, 10)})`}>
        <rect rx={10} ry={10} width={84} height={30} fill="#0b0b12" fillOpacity={0.96} stroke="#ffffff" strokeOpacity={0.08}/>
        <text x={42} y={19} textAnchor="middle" fill="#f8fafc" fontSize={12} fontWeight={700} letterSpacing="0.01em">${hoverValue.toFixed(2)}</text>
      </g>
    </g>) : null}
  </svg>;
}
function BarMiniChart({ values }: { values: number[] }) {
  const clean = values.filter(Number.isFinite);
  const max = Math.max(...clean, 1);
  return <div className="flex h-36 items-end gap-1.5 rounded-xl border border-white/10 bg-black/15 p-4">{clean.slice(-44).map((value, index) => <div key={index} className="flex-1 rounded-t-md bg-cyan-200/60" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />)}</div>;
}
function ViewHeader({ icon: Icon, eyebrow, title, description, right }: { icon: IconType; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Pill className="mb-3 border-cyan-400/30 bg-cyan-500/15 text-cyan-100"><Icon className="h-3.5 w-3.5" />{eyebrow}</Pill><h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{description}</p></div>{right ? <div className="flex flex-wrap gap-2">{right}</div> : null}</div>;
}
function NftEmptyState({ message }: { message: string }) { return <Panel className="p-8 text-center"><p className="text-lg font-bold">No live NFT sales loaded</p><p className="mt-2 text-sm text-white/55">{message}</p><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-cyan-100">OpenSea <ExternalLink className="h-3.5 w-3.5" /></a></Panel>; }
function NftSkeleton() { return <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"><div className="aspect-square rounded-t-3xl bg-white/8"/><div className="h-20 p-4"><div className="h-4 w-24 rounded bg-white/10"/><div className="mt-3 h-3 w-14 rounded bg-white/10"/></div></div>; }
function NftSaleCard({ sale }: { sale: NftSale }) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(sale.image && !broken);
  return <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-white/12 bg-[#062820] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-cyan-200/35">
    <div className="relative aspect-square overflow-hidden bg-[#0b332b]">
      {hasImage ? <img src={sale.image} alt={sale.name} onError={() => setBroken(true)} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover object-left transition duration-500 group-hover:scale-[1.03]"/> : <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/40"><ImageIcon className="h-10 w-10"/><span className="text-xs font-bold uppercase tracking-[0.3em]">No image</span></div>}
    </div>
    <div className="flex min-h-20 items-center justify-between gap-3 p-4">
      <div className="min-w-0"><p className="truncate text-lg font-bold">{sale.name}</p><p className="text-sm text-white/52">{sale.time}</p></div>
      <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/12 px-3 py-1 text-xs font-bold text-cyan-100">{sale.price}</span>
    </div>
  </a>;
}
function NftGrid({ sales, loading, message, compact = false, max = 12 }: { sales: NftSale[]; loading: boolean; message: string; compact?: boolean; max?: number }) {
  if (!loading && sales.length === 0) return <NftEmptyState message={message} />;
  if (loading && sales.length === 0) return <div className={cn("grid gap-5", compact ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>{Array.from({ length: compact ? 4 : 6 }).map((_, i) => <NftSkeleton key={i} />)}</div>;
  return <div className={cn("grid gap-5", compact ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>{sales.slice(0, max).map((sale) => <NftSaleCard key={`${sale.id}-${sale.price}-${sale.time}`} sale={sale} />)}</div>;
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
  const [flowStatus, setFlowStatus] = useState<ApiStatus>("loading");
  const [wallet, setWallet] = useState("");
  const [whaleRows, setWhaleRows] = useState<WhaleRow[]>([]);
  const [whaleStatus, setWhaleStatus] = useState<ApiStatus>("fallback");
  const [whaleMessage, setWhaleMessage] = useState("Paste a wallet to scan open perp positions.");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadMarkets() {
      try {
        setMarketsStatus((current) => current === "live" ? "live" : "loading");
        const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) });
        if (!res.ok) throw new Error("market api");
        const rows = buildMarketRowsFromHyperliquid(await res.json());
        if (mounted && rows.length) { setMarkets(rows); setMarketsStatus("live"); setLastUpdated(new Date()); }
      } catch { if (mounted) { setMarkets(FALLBACK_MARKETS); setMarketsStatus("fallback"); setLastUpdated(new Date()); } }
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
      } catch { if (mounted) setHistory(FALLBACK_HISTORY); }
    }
    loadHistory();
    const interval = window.setInterval(loadHistory, 60_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadNfts() {
      try {
        setNftStatus((current) => current === "live" ? "live" : "loading");
        const [statsRes, eventsRes] = await Promise.allSettled([fetch("/api/opensea/stats"), fetch("/api/opensea/events")]);
        if (statsRes.status === "fulfilled" && statsRes.value.ok) setNftStats(parseNftStats(await statsRes.value.json()));
        if (eventsRes.status !== "fulfilled" || !eventsRes.value.ok) throw new Error("events api");
        const payload = await eventsRes.value.json();
        const sales = parseNftSales(payload);
        if (!sales.length) throw new Error(payload?.message || "no sales");
        if (mounted) { setNftSales(sales); setNftStatus("live"); setNftMessage("Real Hypurr sale feed loaded."); setNftLastUpdated(new Date()); }
      } catch {
        if (mounted) { setNftSales([]); setNftStatus("error"); setNftMessage("OpenSea did not return live sales. Try again later or add an API key."); setNftLastUpdated(new Date()); }
      }
    }
    loadNfts();
    const interval = window.setInterval(loadNfts, 120_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadTwaps() {
      try {
        setTwapStatus((current) => current === "live" ? "live" : "loading");
        const res = await fetch("/api/hyperliquid/twaps");
        if (!res.ok) throw new Error("twap api");
        const payload = await res.json();
        if (mounted) { setTwaps(Array.isArray(payload?.twaps) ? payload.twaps : []); setTrades(Array.isArray(payload?.trades) ? payload.trades : []); setTwapSummary(payload?.summary || null); setTwapStatus(payload?.ok === false ? "fallback" : "live"); }
      } catch { if (mounted) setTwapStatus("error"); }
    }
    loadTwaps();
    const interval = window.setInterval(loadTwaps, 30_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadRest() {
      try { const res = await fetch("/api/hyperliquid/buybacks"); if (res.ok && mounted) { setBuybacks(await res.json()); setBuybackStatus("live"); } } catch { if (mounted) setBuybackStatus("fallback"); }
      try { const res = await fetch("/api/hyperliquid/vaults"); if (res.ok) { const rows = parseVaults(await res.json()); if (mounted && rows.length) { setVaults(rows); setVaultStatus("live"); } } } catch { if (mounted) setVaultStatus("fallback"); }
      try { const res = await fetch("/api/tradfi/flows"); if (res.ok) { const payload = await res.json(); const rows = Array.isArray(payload?.flows) ? payload.flows : FALLBACK_FLOWS; if (mounted) { setFlows(rows); setFlowStatus(payload?.source === "yahoo-finance" ? "live" : "fallback"); } } } catch { if (mounted) setFlowStatus("fallback"); }
    }
    loadRest();
    const interval = window.setInterval(loadRest, 90_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const hype = markets.find((row) => row.symbol === "HYPE") || markets[0] || FALLBACK_MARKETS[0];
  const totalOi = markets.reduce((sum, row) => sum + row.rawOi, 0);
  const totalVolume = markets.reduce((sum, row) => sum + row.rawVolume, 0);
  const sortedMarkets = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())).slice(0, 24), [markets, query]);
  const marketCapEstimate = hype.rawPrice > 0 ? hype.rawPrice * HYPE_CIRCULATING_SUPPLY_ESTIMATE : 0;
  const marketCapLabel = marketCapEstimate ? formatUsd(marketCapEstimate) : "$--";
  const fdvToMarketCap = marketCapEstimate > 0 && hype.rawFdv ? `${(hype.rawFdv / marketCapEstimate).toFixed(1)}x FDV / mcap` : "Est. circulating cap";
  const volumeToMarketCap = marketCapEstimate > 0 && hype.rawVolume > 0 ? `${((hype.rawVolume / marketCapEstimate) * 100).toFixed(1)}% vol/mcap` : "-- vol/mcap";
  const annualizedBuybackUsd = buybacks.estimatedBuybackUsd24h > 0 ? buybacks.estimatedBuybackUsd24h * 365 : 0;
  const valueCaptureRatio = annualizedBuybackUsd > 0 && marketCapEstimate > 0 ? marketCapEstimate / annualizedBuybackUsd : 0;
  const valueCaptureLabel = valueCaptureRatio > 0 ? `${valueCaptureRatio.toFixed(1)}x` : "--";
  const valueCaptureTone: "green" | "amber" | "red" = valueCaptureRatio > 0 && valueCaptureRatio < 12 ? "green" : valueCaptureRatio > 0 && valueCaptureRatio < 20 ? "amber" : "red";
  const valueCaptureStatus = valueCaptureRatio > 0 && valueCaptureRatio < 12 ? "Undervalued" : valueCaptureRatio > 0 && valueCaptureRatio < 20 ? "Fair value" : valueCaptureRatio > 0 ? "Rich" : "Buyback data pending";
  const volumeToOi = hype.rawOi > 0 && hype.rawVolume > 0 ? `${(hype.rawVolume / hype.rawOi).toFixed(2)}x vol/OI` : "-- vol/OI";
  const hypeOiShare = totalOi > 0 ? `${((hype.rawOi / totalOi) * 100).toFixed(1)}% of tracked OI` : "-- of tracked OI";
  const hlpVault = vaults.find((row) => row.name.toUpperCase() === "HLP") || vaults[0] || FALLBACK_VAULTS[0];
  const topVolumeMarkets = [...markets].sort((a, b) => b.rawVolume - a.rawVolume).slice(0, 6);
  const topOiMarkets = [...markets].sort((a, b) => b.rawOi - a.rawOi).slice(0, 6);
  const etfHeadlineRow = flows.find((row) => row.ticker.toLowerCase() === "total" || row.name.toLowerCase().includes("total")) || flows[0] || FALLBACK_FLOWS[0];
  const etfHeadline = etfHeadlineRow.dollarVolume || etfHeadlineRow.volume || "--";

  async function scanWallet() {
    const address = wallet.trim();
    if (!isValidEvmAddress(address)) { setWhaleStatus("error"); setWhaleMessage("Invalid EVM address."); return; }
    try {
      setWhaleStatus("loading");
      const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "clearinghouseState", user: address }) });
      if (!res.ok) throw new Error("wallet api");
      const rows = buildWhaleRowsFromState(await res.json(), markets);
      setWhaleRows(rows); setWhaleStatus("live"); setWhaleMessage(rows.length ? `${rows.length} open perp positions for ${shortAddress(address)}.` : `No open perp positions for ${shortAddress(address)}.`);
    } catch { setWhaleStatus("error"); setWhaleMessage("Could not scan this wallet right now."); }
  }

  const sidebar = <aside className="fixed left-0 top-0 z-30 hidden h-screen w-56 border-r border-white/10 bg-black/95 p-4 backdrop-blur-xl lg:block"><div className="mb-8 flex items-center gap-3"><div className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 p-2"><Zap className="h-5 w-5 text-cyan-100" /></div><div><p className="text-lg font-bold uppercase tracking-[0.28em]">Hypurr Scope</p><p className="text-xs text-white/55">HYPE market console</p></div></div><nav className="space-y-2">{NAV_ITEMS.map((item) => { const Icon = item.icon; const active = activeView === item.id; return <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition", active ? "border-cyan-200/25 bg-cyan-200/10 text-white" : "border-transparent text-white/55 hover:bg-white/[0.03] hover:text-white") }><Icon className="h-5 w-5"/><span><span className="block text-sm font-bold">{item.label}</span><span className="block text-xs text-white/45">{item.description}</span></span></button>; })}</nav><div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-xs text-white/55"><div className="mb-2 flex items-center justify-between"><span>Refresh</span><RefreshCw className="h-3.5 w-3.5" /></div><p>Markets 20s · NFTs 120s · Tape 30s</p><p className="mt-1">Last update: {formatClock(lastUpdated)}</p></div></aside>;

  const overview = <div><ViewHeader icon={Gauge} eyebrow="HYPE investor dashboard" title="Hyperliquid market dashboard" description="A one-screen view of the metrics investors care about: price, market cap estimate, FDV, volume, open interest, funding, buyback pressure, HLP and TradFi demand." right={<><StatusPill status={marketsStatus}/><StatusPill status={buybackStatus}/><StatusPill status={flowStatus}/></>} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><BigMetric icon={hype.rawChange >= 0 ? ArrowUpRight : ArrowDownRight} label="HYPE price" value={hype.price} change={hype.rawChange} sub={volumeToMarketCap} tone={hype.rawChange >= 0 ? "green" : "red"}/><BigMetric icon={BarChart3} label="Market cap" value={marketCapLabel} sub={`Est. ${formatNative(HYPE_CIRCULATING_SUPPLY_ESTIMATE)} circ.`}/><BigMetric icon={Activity} label="24h volume" value={hype.volumeLabel} sub={volumeToOi} tone="green"/><BigMetric icon={Gauge} label="Perp open interest" value={hype.oi} sub={hypeOiShare}/><BigMetric icon={Flame} label="Value capture" value={valueCaptureLabel} sub={valueCaptureStatus} tone={valueCaptureTone}/></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><Panel className="p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">HYPE 24h price action</h2><p className="text-sm text-white/55">Live candles when available. The badge gives the 24h move.</p></div><MoveBadge value={hype.rawChange}/></div><div className="h-[320px] rounded-3xl border border-white/10 bg-black/18 p-4"><Sparkline points={history.map((point) => point.price)} height={300} stroke={hype.rawChange >= 0 ? "#22d3ee" : "#fb7185"}/></div><div className="mt-4 grid gap-3 md:grid-cols-4"><Panel className="p-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Risk heat</p><p className="mt-3 text-2xl font-bold text-cyan-100">{hype.risk}/100</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-200" style={{ width: `${hype.risk}%` }}/></div></Panel><Panel className="p-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Total perp OI</p><p className="mt-3 text-2xl font-bold text-cyan-100">{formatUsd(totalOi)}</p><p className="text-xs text-white/55">all tracked markets</p></Panel><Panel className="p-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Total volume</p><p className="mt-3 text-2xl font-bold text-cyan-100">{formatUsd(totalVolume)}</p><p className="text-xs text-white/55">24h notional</p></Panel><Panel className="p-4"><p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Supply</p><p className="mt-3 text-2xl font-bold text-cyan-100">1.00B</p><p className="text-xs text-white/55">max FDV base</p></Panel></div></Panel><Panel className="p-4"><div className="mb-4"><h2 className="text-xl font-bold">Investor pulse</h2><p className="text-sm text-white/55">Compact demand and leverage signals, no NFT noise.</p></div><div className="space-y-3"><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Assistance Fund pressure</p><p className="mt-2 text-2xl font-bold">{buybacks.estimatedBuybackUsd24hLabel || "--"}</p></div><Flame className="h-6 w-6 text-amber-200"/></div><p className="mt-2 text-sm text-white/55">{buybacks.estimatedBuybackHype24hLabel || "Estimated HYPE / 24h"}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">HYPE TWAP net</p><p className="mt-2 text-2xl font-bold">{twapSummary?.netSide || "--"} {twapSummary?.netLabel || "$--"}</p></div><Clock3 className="h-6 w-6 text-cyan-100"/></div><p className="mt-2 text-sm text-white/55">Buy {twapSummary?.buyLabel || "$--"} · Sell {twapSummary?.sellLabel || "$--"}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">ETF / ETP tape</p><p className="mt-2 text-2xl font-bold">{etfHeadline}</p></div><Globe2 className="h-6 w-6 text-cyan-100"/></div><p className="mt-2 text-sm text-white/55">{etfHeadlineRow.ticker} · {etfHeadlineRow.status}</p></div></div></Panel></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><Panel className="p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Top markets by 24h volume</h2><p className="text-sm text-white/55">Where the Hyperliquid flow is concentrated now.</p></div><Pill>{topVolumeMarkets.length} markets</Pill></div><div className="space-y-2">{topVolumeMarkets.map((row, index) => <div key={`vol-${row.symbol}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-200/10 text-xs font-bold text-cyan-100">{index + 1}</span><div><p className="font-bold">{row.symbol}</p><p className={cn("text-xs", row.rawChange >= 0 ? "text-cyan-200" : "text-red-200")}>{row.change}</p></div></div><div className="text-right"><p className="font-bold">{row.volumeLabel}</p><p className="text-xs text-white/45">24h volume</p></div></div>)}</div></Panel><Panel className="p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">Top markets by open interest</h2><p className="text-sm text-white/55">Leverage concentration and liquidation risk proxy.</p></div><Pill>{formatUsd(totalOi)} OI</Pill></div><div className="space-y-2">{topOiMarkets.map((row, index) => <div key={`oi-${row.symbol}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-xs font-bold text-white/70">{index + 1}</span><div><p className="font-bold">{row.symbol}</p><p className="text-xs text-white/45">Risk {row.risk}/100</p></div></div><div className="text-right"><p className="font-bold">{row.oi}</p><p className="text-xs text-white/45">{totalOi ? ((row.rawOi / totalOi) * 100).toFixed(1) : "--"}% share</p></div></div>)}</div></Panel></div></div>;

  const marketsView = <div><ViewHeader icon={BarChart3} eyebrow="Markets" title="HYPE + Hyperliquid perps" description="FDV, OI, funding, 24h volume, risk and relative market pressure." right={<StatusPill status={marketsStatus}/>} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><BigMetric icon={Zap} label="HYPE FDV" value={hype.fdv || "$--"} sub="1B total supply"/><BigMetric icon={BarChart3} label="HYPE Volume" value={hype.volumeLabel} sub="24h notional"/><BigMetric icon={Activity} label="HYPE OI" value={hype.oi} sub={`${totalOi ? ((hype.rawOi / totalOi) * 100).toFixed(1) : "--"}% share`}/><BigMetric icon={Gauge} label="Risk heat" value={`${hype.risk}/100`} sub="move + OI + funding" tone="amber"/></div><Panel className="mt-5 p-5"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-xl font-bold">Market table</h2><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><Search className="h-4 w-4 text-white/40"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search coin" className="bg-transparent text-sm outline-none placeholder:text-white/35"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.22em] text-white/40"><tr><th className="py-3">Coin</th><th>Price</th><th>24h</th><th>OI</th><th>Volume</th><th>Funding</th><th>FDV</th><th>Risk</th></tr></thead><tbody>{sortedMarkets.map((row) => <tr key={row.symbol} className="border-t border-white/10"><td className="py-3 font-bold">{row.symbol}</td><td>{row.price}</td><td className={row.rawChange >= 0 ? "text-cyan-200" : "text-red-200"}>{row.change}</td><td>{row.oi}</td><td>{row.volumeLabel}</td><td>{row.funding}</td><td>{row.fdv || "--"}</td><td><span className={cn("rounded-full border px-2 py-1 text-xs font-bold", riskTone(row.risk))}>{row.risk}</span></td></tr>)}</tbody></table></div></Panel><Panel className="mt-5 p-5"><h2 className="mb-4 text-xl font-bold">Volume distribution</h2><BarMiniChart values={markets.slice(0, 24).map((row) => row.rawVolume)} /></Panel></div>;

  const buybacksView = <div><ViewHeader icon={Flame} eyebrow="Buybacks" title="Assistance Fund pressure" description="A transparent estimate of daily HYPE buyback pressure from Hyperliquid market volume. Exact purchases require an indexed onchain feed." right={<StatusPill status={buybackStatus}/>} /><div className="grid gap-4 md:grid-cols-3"><BigMetric icon={Flame} label="Estimated AF buy" value={buybacks.estimatedBuybackUsd24hLabel || "--"} sub="USD / 24h" tone="amber"/><BigMetric icon={Zap} label="HYPE equivalent" value={buybacks.estimatedBuybackHype24hLabel || "--"} sub="estimated"/><BigMetric icon={Activity} label="Total fees estimate" value={buybacks.totalFeeUsd24hLabel || "--"} sub="all tracked markets"/></div><Panel className="mt-5 p-6"><h2 className="text-xl font-bold">Important</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">{buybacks.note || "This is an estimate. Do not treat it as exact onchain buyback accounting."}</p></Panel></div>;

  const twapView = <div><ViewHeader icon={Clock3} eyebrow="HYPE TWAP" title="HYPE TWAP-style live tape" description="HYPE-only live tape: recent trades, buy/sell flow, and clustered slices that look like TWAP execution. This is not a copy of HypurrIntel; it is a transparent tape built from public recent trades." right={<StatusPill status={twapStatus}/>} /><div className="grid gap-4 md:grid-cols-3"><BigMetric icon={ArrowUpRight} label="Buy flow 10m" value={twapSummary?.buyLabel || "$--"} sub="recent trades" tone="green"/><BigMetric icon={ArrowDownRight} label="Sell flow 10m" value={twapSummary?.sellLabel || "$--"} sub="recent trades" tone="red"/><BigMetric icon={Activity} label="Net flow" value={`${twapSummary?.netSide || "--"} ${twapSummary?.netLabel || "$--"}`} sub="10m window"/></div><div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Panel className="p-4"><h2 className="mb-4 text-xl font-bold">TWAP-like clusters</h2><div className="space-y-3">{twaps.length ? twaps.map((row, index) => <div key={`${row.side}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><span className={cn("rounded-full px-3 py-1 text-xs font-bold", row.side === "Buy" ? "bg-cyan-400/15 text-cyan-100" : "bg-red-400/15 text-red-100")}>{row.side}</span><span className="font-bold">{row.notional}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/55"><span>{row.slices} slices</span><span>{row.size}</span><span>{row.avgPrice}</span></div><p className="mt-2 text-xs text-white/40">{row.confidence} confidence · last {row.lastTrade}</p></div>) : <p className="text-sm text-white/55">No strong TWAP-like cluster right now. Showing recent trades instead.</p>}</div></Panel><Panel className="p-4"><h2 className="mb-4 text-xl font-bold">Recent HYPE trades</h2><div className="max-h-[520px] overflow-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-[#06231f] text-xs uppercase tracking-[0.18em] text-white/40"><tr><th className="p-3">Side</th><th>Price</th><th>Size</th><th>Notional</th><th>Time</th></tr></thead><tbody>{trades.slice(0, 30).map((row) => <tr key={row.id} className="border-t border-white/10"><td className={cn("p-3 font-bold", row.side === "Buy" ? "text-cyan-200" : "text-red-200")}>{row.side}</td><td>{row.price}</td><td>{row.size}</td><td>{row.notionalLabel}</td><td className="text-white/45">{row.timeLabel}</td></tr>)}</tbody></table></div></Panel></div></div>;

  const nftView = <div><ViewHeader icon={ImageIcon} eyebrow="Hypurr NFT Tape" title="Hypurr floor, stats and latest sales" description="Square artwork view. Price shown below the image is the OpenSea-reported sale event price." right={<><StatusPill status={nftStatus}/><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer"><Pill>OpenSea <ExternalLink className="h-3.5 w-3.5"/></Pill></a></>} /><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><BigMetric icon={ImageIcon} label="Floor" value={nftStats.floor}/><BigMetric icon={Activity} label="24h volume" value={nftStats.volume24h}/><BigMetric icon={BarChart3} label="Total volume" value={nftStats.totalVolume}/><BigMetric icon={Layers} label="Listed" value={nftStats.listed}/><BigMetric icon={Wallet} label="Owners" value={nftStats.owners}/><BigMetric icon={Zap} label="24h sales" value={nftStats.sales24h}/></div><Panel className="mt-5 p-5"><div className="mb-4"><h2 className="text-xl font-bold">Latest sales</h2><p className="text-sm text-white/55">Updated {formatClock(nftLastUpdated)}. Refresh every 120 seconds.</p></div><NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} max={12}/></Panel></div>;

  const hlpView = <div><ViewHeader icon={Layers} eyebrow="HLP" title="HLP and major vault monitor" description="Focus on HLP first, then large vaults. Avoids noisy vault spam." right={<StatusPill status={vaultStatus}/>} /><div className="grid gap-4 md:grid-cols-3"><BigMetric icon={Layers} label="Top vault" value={vaults[0]?.name || "HLP"} sub={vaults[0]?.aum || "Loading"}/><BigMetric icon={Activity} label="AUM" value={vaults[0]?.aum || "Loading"}/><BigMetric icon={Gauge} label="APR / Score" value={vaults[0]?.apr || "--"} sub={`${vaults[0]?.score || "--"}/100`}/></div><Panel className="mt-5 p-5"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.22em] text-white/40"><tr><th className="py-3">Vault</th><th>AUM</th><th>APR</th><th>Status</th><th>Leader</th><th>Score</th></tr></thead><tbody>{vaults.map((row) => <tr key={row.name} className="border-t border-white/10"><td className="py-3 font-bold">{row.name}</td><td>{row.aum}</td><td>{row.apr}</td><td>{row.status}</td><td>{row.leader ? shortAddress(row.leader) : "--"}</td><td>{row.score}/100</td></tr>)}</tbody></table></div></Panel></div>;

  const flowsView = <div><ViewHeader icon={Globe2} eyebrow="TradFi ETF volumes" title="HYPE ETF / ETP daily volume" description="Daily trading volume and estimated value traded for listed HYPE products. This is volume, not net inflow; exact primary-market creations/redemptions require issuer/AP data." right={<StatusPill status={flowStatus}/>} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{flows.slice(0, 4).map((row) => <Panel key={row.ticker} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-white/45">{row.ticker}</p><h3 className="mt-3 text-xl font-bold leading-tight">{row.name}</h3><p className="mt-1 text-sm text-white/55">{row.venue}</p></div>{row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/12 p-2 text-white/55 hover:text-white"><ExternalLink className="h-4 w-4"/></a> : null}</div><div className="mt-6 grid grid-cols-2 gap-3"><div><p className="text-xs text-white/45">Daily volume</p><p className="mt-1 text-lg font-bold">{row.volume || "--"}</p></div><div><p className="text-xs text-white/45">Value traded</p><p className="mt-1 text-lg font-bold">{row.dollarVolume || "--"}</p></div><div><p className="text-xs text-white/45">Price</p><p className="mt-1 font-bold">{row.price || "--"}</p></div><div><p className="text-xs text-white/45">24h</p><p className={cn("mt-1 font-bold", String(row.change || "").startsWith("-") ? "text-red-200" : "text-cyan-200")}>{row.change || "--"}</p></div></div><p className="mt-5 text-xs text-white/42">{row.status}</p></Panel>)}</div><Panel className="mt-5 p-5"><h2 className="text-xl font-bold">Read this correctly</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-white/62">This section shows exchange trading volume. It is useful for demand/liquidity monitoring, but it is not the same thing as net fund inflow. A true daily inflow table needs issuer holdings/AUM history or a dedicated flow feed.</p></Panel></div>;

  const walletView = <div><ViewHeader icon={Wallet} eyebrow="Wallet scan" title="Hyperliquid wallet risk lookup" description="Paste any EVM address to inspect open perp positions. No wallet connect, no signatures, read-only." right={<StatusPill status={whaleStatus}/>} /><Panel className="p-4"><div className="flex flex-col gap-3 md:flex-row"><input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-white/30"/><button onClick={scanWallet} className="rounded-xl border border-cyan-200/25 bg-cyan-300/12 px-5 py-3 font-bold text-cyan-100 hover:bg-cyan-300/18">Scan address</button></div><p className="mt-3 text-sm text-white/55">{whaleMessage}</p></Panel><Panel className="mt-5 p-5"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.22em] text-white/40"><tr><th className="py-3">Coin</th><th>Side</th><th>Size</th><th>Notional</th><th>Entry</th><th>PnL</th><th>Liq</th><th>Lev</th><th>Danger</th></tr></thead><tbody>{whaleRows.map((row) => <tr key={`${row.coin}-${row.size}`} className="border-t border-white/10"><td className="py-3 font-bold">{row.coin}</td><td>{row.side}</td><td>{row.size}</td><td>{row.notional}</td><td>{row.entry}</td><td className={row.rawPnl >= 0 ? "text-cyan-200" : "text-red-200"}>{row.pnl}</td><td>{row.liquidation}</td><td>{row.leverage}</td><td>{row.danger}</td></tr>)}</tbody></table></div></Panel></div>;

  const view = activeView === "overview" ? overview : activeView === "markets" ? marketsView : activeView === "buybacks" ? buybacksView : activeView === "twaps" ? twapView : activeView === "nfts" ? nftView : activeView === "hlp" ? hlpView : activeView === "flows" ? flowsView : walletView;

  return <main className="min-h-screen bg-black text-white"><div className="pointer-events-none fixed inset-0"/>{sidebar}<div className="relative px-4 py-6 lg:ml-64 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1500px]">{view}</div></div></main>;
}

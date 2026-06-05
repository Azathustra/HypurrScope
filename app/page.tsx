"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Layers,
  Lock,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
  Waves,
  Zap,
} from "lucide-react";

type ApiStatus = "loading" | "live" | "fallback";
type ViewId = "overview" | "markets" | "twaps" | "nfts" | "etfs" | "vaults" | "whales" | "methodology";

type MarketRow = {
  symbol: string;
  price: string;
  rawPrice: number;
  change: string;
  rawChange: number;
  oi: string;
  rawOi: number;
  volume?: number;
  volumeLabel: string;
  funding: string;
  rawFunding: number;
  risk: number;
};

type VaultRow = {
  name: string;
  vaultAddress?: string;
  leader?: string;
  aum: string;
  rawAum: number;
  apr: string;
  dd: string;
  age: string;
  score: number;
  status: string;
};

type WhaleRow = {
  coin: string;
  side: string;
  size: string;
  notional: string;
  entry: string;
  pnl: string;
  rawPnl: number;
  liquidation: string;
  leverage: string;
  danger: "Low" | "Medium" | "High" | "Watch";
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
  usd: string;
  time: string;
  image?: string;
  url?: string;
  buyer?: string;
  seller?: string;
};

type TwapRow = {
  market: string;
  side: "Buy" | "Sell";
  notional: string;
  filled: string;
  status: string;
  time: string;
};

const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

const fallbackMarketRows: MarketRow[] = [
  { symbol: "HYPE", price: "$68.42", rawPrice: 68.42, change: "+4.8%", rawChange: 4.8, oi: "$1.82B", rawOi: 1_820_000_000, volumeLabel: "$620.00M", volume: 620_000_000, funding: "+0.0180%", rawFunding: 0.00018, risk: 72 },
  { symbol: "BTC", price: "$104,820", rawPrice: 104_820, change: "+1.2%", rawChange: 1.2, oi: "$3.44B", rawOi: 3_440_000_000, volumeLabel: "$1.94B", volume: 1_940_000_000, funding: "+0.0060%", rawFunding: 0.00006, risk: 48 },
  { symbol: "ETH", price: "$5,930", rawPrice: 5_930, change: "+2.6%", rawChange: 2.6, oi: "$2.11B", rawOi: 2_110_000_000, volumeLabel: "$1.12B", volume: 1_120_000_000, funding: "+0.0120%", rawFunding: 0.00012, risk: 61 },
  { symbol: "SOL", price: "$238.12", rawPrice: 238.12, change: "-0.9%", rawChange: -0.9, oi: "$884.00M", rawOi: 884_000_000, volumeLabel: "$420.00M", volume: 420_000_000, funding: "-0.0040%", rawFunding: -0.00004, risk: 39 },
  { symbol: "FARTCOIN", price: "$1.91", rawPrice: 1.91, change: "+18.7%", rawChange: 18.7, oi: "$228.00M", rawOi: 228_000_000, volumeLabel: "$180.00M", volume: 180_000_000, funding: "+0.0720%", rawFunding: 0.00072, risk: 91 },
];

const fallbackWhaleRows: WhaleRow[] = [
  { coin: "HYPE", side: "Long", size: "70,691 HYPE", notional: "$4.80M", entry: "$67.90", pnl: "+$182,000", rawPnl: 182_000, liquidation: "$51.20", leverage: "3.2x", danger: "Medium" },
  { coin: "ETH", side: "Short", size: "354 ETH", notional: "$2.10M", entry: "$5,880", pnl: "+$44,000", rawPnl: 44_000, liquidation: "--", leverage: "2.0x", danger: "Low" },
  { coin: "BTC", side: "Long", size: "70.6 BTC", notional: "$7.40M", entry: "$104,210", pnl: "-$96,000", rawPnl: -96_000, liquidation: "$88,400", leverage: "4.8x", danger: "High" },
];

const fallbackVaultRows: VaultRow[] = [
  { name: "Blue Whale", aum: "$42.60M", rawAum: 42_600_000, apr: "+18.40%", dd: "Live", age: "214d", score: 78, status: "Open" },
  { name: "Delta Neutral Alpha", aum: "$18.90M", rawAum: 18_900_000, apr: "+7.20%", dd: "Live", age: "126d", score: 35, status: "Open" },
  { name: "Hyper Momentum", aum: "$11.20M", rawAum: 11_200_000, apr: "+39.80%", dd: "Live", age: "58d", score: 88, status: "Open" },
];

const fallbackNftStats: NftStats = {
  floor: "338 HYPE",
  volume24h: "2.10K HYPE",
  totalVolume: "6.20M HYPE",
  listed: "4.8%",
  owners: "--",
  sales24h: "--",
};

const fallbackNftSales: NftSale[] = [
  { id: "137", name: "Hypurr #137", price: "342 HYPE", usd: "$23.40K", time: "12m ago", url: OPENSEA_COLLECTION_URL },
  { id: "029", name: "Hypurr #029", price: "336 HYPE", usd: "$23.00K", time: "34m ago", url: OPENSEA_COLLECTION_URL },
  { id: "411", name: "Hypurr #411", price: "351 HYPE", usd: "$24.00K", time: "1h ago", url: OPENSEA_COLLECTION_URL },
];

const fallbackTwapRows: TwapRow[] = [
  { market: "HYPE", side: "Buy", notional: "$2.40M", filled: "42%", status: "Proxy / planned", time: "Live route next" },
  { market: "BTC", side: "Sell", notional: "$8.10M", filled: "67%", status: "Proxy / planned", time: "Live route next" },
  { market: "ETH", side: "Buy", notional: "$3.80M", filled: "18%", status: "Proxy / planned", time: "Live route next" },
];

const etpRows = [
  { name: "21Shares Hyperliquid ETP", ticker: "HYPE", isin: "CH1471826029", venue: "SIX / EU venues", fee: "2.50%", status: "Live ETP", aum: "$--", flow: "Manual watch", url: "https://www.21shares.com/" },
  { name: "CoinShares Hyperliquid Staking ETP", ticker: "LIQD", isin: "GB00BVBJQ593", venue: "Xetra", fee: "0.00% mgmt", status: "Live ETP", aum: "$--", flow: "Manual watch", url: "https://coinshares.com/" },
  { name: "Bitwise Hyperliquid ETF", ticker: "BHYP", isin: "SEC filing", venue: "NYSE Arca proposed", fee: "Pending", status: "Filing watch", aum: "Pending", flow: "Watchlist", url: "https://www.sec.gov/" },
];

const methodologyItems = [
  { title: "Left sidebar navigation", description: "No anchor scrolling. Each click swaps the central workspace, closer to an app/dashboard UX." },
  { title: "NFT sales with images", description: "OpenSea events are parsed client-side and the sold NFT image is shown when the API payload provides it." },
  { title: "Read-only safety", description: "No wallet connect, no private keys, no order routing, no copy-trading execution." },
  { title: "Next data modules", description: "TWAP tape, ETF/ETP flow automation and richer Hyperliquid stats should be added as separate API routes." },
];

const navItems: Array<{ id: ViewId; label: string; description: string; icon: any }> = [
  { id: "overview", label: "Overview", description: "Main dashboard", icon: Gauge },
  { id: "markets", label: "Markets", description: "Perps, OI, funding", icon: BarChart3 },
  { id: "twaps", label: "TWAPs", description: "Tape module", icon: Clock },
  { id: "nfts", label: "Hypurr NFTs", description: "Floor & sales", icon: ImageIcon },
  { id: "etfs", label: "TradFi Flow", description: "ETP / ETF watch", icon: Globe2 },
  { id: "vaults", label: "Vaults", description: "Vault risk", icon: Layers },
  { id: "whales", label: "Whales", description: "Wallet scanner", icon: Wallet },
  { id: "methodology", label: "Methodology", description: "Safety & logic", icon: Lock },
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
  if (value >= 1_000) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function formatNative(value: number, suffix = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return `-- ${suffix}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${suffix}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${suffix}`;
  if (value >= 100) return `${value.toFixed(0)} ${suffix}`;
  if (value >= 1) return `${value.toFixed(2)} ${suffix}`;
  return `${value.toPrecision(3)} ${suffix}`;
}

function formatRelativeTime(timestamp: string | number | undefined) {
  if (!timestamp) return "--";
  const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return "--";
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function calculateRiskScore(changePct: number, funding: number, openInterestNotional: number, volumeNotional: number) {
  const absoluteMove = Math.abs(Number.isFinite(changePct) ? changePct : 0);
  const fundingPressure = Math.abs(funding || 0) * 30_000;
  const oiPressure = openInterestNotional > 0 ? Math.log10(openInterestNotional / 10_000_000 + 1) * 12 : 0;
  const volumePressure = volumeNotional > 0 ? Math.log10(volumeNotional / 10_000_000 + 1) * 6 : 0;
  return Math.round(clamp(18 + absoluteMove * 2.1 + fundingPressure + oiPressure + volumePressure, 5, 99));
}

function buildMarketRowsFromHyperliquid(payload: any): MarketRow[] {
  const meta = payload?.[0];
  const assetContexts = payload?.[1];
  if (!meta?.universe || !Array.isArray(assetContexts)) throw new Error("Unexpected Hyperliquid response");

  const rows = meta.universe
    .map((asset: any, index: number) => {
      const context = assetContexts[index] || {};
      const markPrice = toNumber(context.markPx || context.midPx || context.oraclePx);
      const previousDayPrice = toNumber(context.prevDayPx);
      const funding = toNumber(context.funding);
      const openInterestUnits = toNumber(context.openInterest);
      const openInterestNotional = openInterestUnits * markPrice;
      const dayVolumeNotional = toNumber(context.dayNtlVlm);
      const changePct = previousDayPrice > 0 && markPrice > 0 ? ((markPrice - previousDayPrice) / previousDayPrice) * 100 : 0;

      return {
        symbol: asset.name,
        price: formatUsd(markPrice),
        rawPrice: markPrice,
        change: formatPercent(changePct, 2),
        rawChange: changePct,
        oi: formatUsd(openInterestNotional),
        rawOi: openInterestNotional,
        volume: dayVolumeNotional,
        volumeLabel: formatUsd(dayVolumeNotional),
        funding: formatPercent(funding * 100, 4),
        rawFunding: funding,
        risk: calculateRiskScore(changePct, funding, openInterestNotional, dayVolumeNotional),
      } as MarketRow;
    })
    .filter((row: MarketRow) => row.symbol && row.rawPrice > 0);

  const prioritySymbols = ["HYPE", "BTC", "ETH", "SOL", "FARTCOIN", "PUMP", "DOGE", "XRP"];
  const priorityRows = prioritySymbols.map((symbol) => rows.find((row: MarketRow) => row.symbol === symbol)).filter(Boolean) as MarketRow[];
  const highOiRows = [...rows].sort((a: MarketRow, b: MarketRow) => b.rawOi - a.rawOi).slice(0, 28);
  const highRiskRows = [...rows].sort((a: MarketRow, b: MarketRow) => b.risk - a.risk).slice(0, 16);
  const combined = [...priorityRows, ...highOiRows, ...highRiskRows];
  return Array.from(new Map(combined.map((row) => [row.symbol, row])).values()).slice(0, 32);
}

function formatAgeFromMillis(timestampMillis: unknown) {
  const timestamp = Number(timestampMillis);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "--";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  return `${days}d`;
}

function calculateVaultRiskScore({ tvl, apr, ageDays, isClosed }: { tvl: number; apr: number; ageDays: number; isClosed: boolean }) {
  const tvlPenalty = tvl <= 0 ? 30 : clamp(34 - Math.log10(tvl + 1) * 4, 0, 28);
  const aprPenalty = Math.min(Math.abs(apr || 0) * 0.35, 28);
  const youngPenalty = ageDays < 30 ? 22 : ageDays < 90 ? 14 : ageDays < 180 ? 7 : 0;
  const closedPenalty = isClosed ? 12 : 0;
  return Math.round(clamp(18 + tvlPenalty + aprPenalty + youngPenalty + closedPenalty, 5, 99));
}

function buildVaultRowsFromStatsData(payload: any): VaultRow[] {
  if (!Array.isArray(payload)) throw new Error("Unexpected Hyperliquid vault response");
  const rows = payload
    .map((vault: any) => {
      const summary = vault.summary || vault;
      const name = summary.name || vault.name || "Unnamed vault";
      const tvl = toNumber(summary.tvl || vault.tvl || vault.accountValue || vault.equity);
      const apr = toNumber(vault.apr || summary.apr);
      const createTime = summary.createTimeMillis || summary.create_time_millis || vault.createTimeMillis;
      const ageDays = Number.isFinite(Number(createTime)) ? Math.max(0, Math.floor((Date.now() - Number(createTime)) / 86_400_000)) : 999;
      const isClosed = Boolean(summary.isClosed || summary.is_closed || vault.isClosed);
      return {
        name,
        vaultAddress: summary.vaultAddress || summary.vault_address || vault.vaultAddress || "",
        leader: summary.leader || vault.leader || "",
        aum: formatUsd(tvl),
        rawAum: tvl,
        apr: formatPercent(apr, 2),
        dd: isClosed ? "Closed" : "Live",
        age: formatAgeFromMillis(createTime),
        score: calculateVaultRiskScore({ tvl, apr, ageDays, isClosed }),
        status: isClosed ? "Closed" : "Open",
      } as VaultRow;
    })
    .filter((row: VaultRow) => row.rawAum > 50_000 && row.status === "Open")
    .sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum)
    .slice(0, 12);

  if (rows.length === 0) throw new Error("No vault rows parsed");
  return rows;
}

function shortenAddress(address: string) {
  if (!address || address.length < 12) return address || "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isValidEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function getDangerFromPosition({ leverage, liquidationPrice, currentPrice, side }: { leverage: unknown; liquidationPrice: unknown; currentPrice: unknown; side: string }) {
  const lev = toNumber(leverage);
  const liq = toNumber(liquidationPrice);
  const current = toNumber(currentPrice);
  let liqDistance = 999;
  if (liq > 0 && current > 0) liqDistance = Math.abs((current - liq) / current) * 100;
  if (liqDistance < 7 || lev >= 8) return "High" as const;
  if (liqDistance < 14 || lev >= 4) return "Medium" as const;
  if (side === "Flat") return "Low" as const;
  return "Low" as const;
}

function buildWhaleRowsFromClearinghouseState(payload: any, markets: MarketRow[]): WhaleRow[] {
  const positions = Array.isArray(payload?.assetPositions) ? payload.assetPositions : [];
  const marketBySymbol = new Map(markets.map((row) => [row.symbol, row]));
  return positions
    .map((assetPosition: any) => assetPosition.position || assetPosition)
    .filter((position: any) => Math.abs(toNumber(position.szi)) > 0)
    .map((position: any) => {
      const coin = position.coin || "--";
      const signedSize = toNumber(position.szi);
      const side = signedSize > 0 ? "Long" : "Short";
      const size = `${Math.abs(signedSize).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${coin}`;
      const notional = formatUsd(toNumber(position.positionValue));
      const entry = formatUsd(toNumber(position.entryPx));
      const pnlValue = toNumber(position.unrealizedPnl);
      const pnl = `${pnlValue >= 0 ? "+" : "-"}${formatUsd(Math.abs(pnlValue))}`;
      const liquidation = toNumber(position.liquidationPx) > 0 ? formatUsd(toNumber(position.liquidationPx)) : "--";
      const leverageValue = position.leverage?.value || position.leverage || "--";
      const currentPrice = marketBySymbol.get(coin)?.rawPrice || 0;
      const danger = getDangerFromPosition({ leverage: leverageValue, liquidationPrice: position.liquidationPx, currentPrice, side });
      return { coin, side, size, notional, entry, pnl, rawPnl: pnlValue, liquidation, leverage: leverageValue === "--" ? "--" : `${leverageValue}x`, danger } as WhaleRow;
    })
    .sort((a: WhaleRow, b: WhaleRow) => {
      const dangerRank = { High: 3, Medium: 2, Low: 1, Watch: 1 } as Record<string, number>;
      return (dangerRank[b.danger] || 0) - (dangerRank[a.danger] || 0);
    });
}

function findIntervalStats(intervals: any[], acceptedNames: string[]) {
  if (!Array.isArray(intervals)) return {};
  return intervals.find((item) => acceptedNames.includes(item.interval)) || {};
}

function buildNftStatsFromOpenSea(payload: any): NftStats {
  const total = payload?.total || {};
  const intervals = payload?.intervals || [];
  const oneDay = findIntervalStats(intervals, ["one_day", "1d", "day"]);
  const floor = toNumber(total.floor_price ?? total.floorPrice ?? payload?.floor_price ?? payload?.floorPrice);
  const totalVolume = toNumber(total.volume ?? payload?.volume);
  const oneDayVolume = toNumber(oneDay.volume ?? oneDay.volume_diff ?? payload?.one_day_volume);
  const owners = toNumber(total.num_owners ?? total.numOwners ?? payload?.num_owners);
  const sales24h = toNumber(oneDay.sales ?? oneDay.sales_diff ?? payload?.one_day_sales);
  return {
    floor: floor > 0 ? formatNative(floor) : fallbackNftStats.floor,
    volume24h: oneDayVolume > 0 ? formatNative(oneDayVolume) : fallbackNftStats.volume24h,
    totalVolume: totalVolume > 0 ? formatNative(totalVolume) : fallbackNftStats.totalVolume,
    listed: fallbackNftStats.listed,
    owners: owners > 0 ? owners.toLocaleString("en-US") : fallbackNftStats.owners,
    sales24h: sales24h > 0 ? String(Math.round(sales24h)) : fallbackNftStats.sales24h,
  };
}

function normalizeOpenSeaEventPrice(event: any) {
  const payment = event.payment || event.payment_token || event.price?.currency || {};
  const rawQuantity = event.payment?.quantity ?? event.closing_price ?? event.price?.quantity ?? event.quantity;
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? 18);
  const symbol = payment.symbol || event.price?.currency?.symbol || "HYPE";
  const rawNumber = Number(rawQuantity);
  if (!Number.isFinite(rawNumber) || rawNumber <= 0) return `-- ${symbol}`;
  const normalized = rawNumber > 1_000_000_000 ? rawNumber / 10 ** decimals : rawNumber;
  return formatNative(normalized, symbol);
}

function extractNftImage(nft: any, event: any) {
  return (
    nft.display_image_url ||
    nft.image_url ||
    nft.imageUrl ||
    nft.metadata_url ||
    event.asset?.image_url ||
    event.asset?.image_original_url ||
    ""
  );
}

function buildNftSalesFromOpenSeaEvents(payload: any): NftSale[] {
  const events = payload?.asset_events || payload?.events || [];
  if (!Array.isArray(events)) throw new Error("Unexpected OpenSea events response");
  const rows = events
    .filter((event: any) => (event.event_type || event.eventType || event.type || "sale") === "sale")
    .map((event: any) => {
      const nft = event.nft || event.asset || {};
      const identifier = nft.identifier || nft.token_id || event.token_id || event.nft_id || "?";
      const name = nft.name || `Hypurr #${identifier}`;
      const time = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp;
      const permalink = nft.permalink || event.asset?.permalink || (identifier !== "?" ? `https://opensea.io/assets/hyperevm/${identifier}` : OPENSEA_COLLECTION_URL);
      return {
        id: String(identifier),
        name,
        price: normalizeOpenSeaEventPrice(event),
        usd: "OpenSea",
        time: formatRelativeTime(time),
        image: extractNftImage(nft, event),
        url: permalink,
        buyer: event.buyer || event.to_account?.address || event.taker?.address || "",
        seller: event.seller || event.from_account?.address || event.maker?.address || "",
      } as NftSale;
    })
    .slice(0, 12);

  if (rows.length === 0) throw new Error("No sale events parsed");
  return rows;
}

function Button({ children, className = "", variant = "solid", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline"; size?: "default" | "sm" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
        variant === "solid"
          ? "bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-200 text-slate-950 shadow-lg shadow-cyan-950/30 hover:brightness-110"
          : "border border-white/12 bg-white/[0.055] text-white hover:border-cyan-200/25 hover:bg-white/[0.09]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-white/12 bg-gradient-to-br from-white/[0.085] via-white/[0.05] to-white/[0.025] shadow-2xl shadow-black/20 backdrop-blur", className)}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

function RiskPill({ value }: { value: number }) {
  const label = value >= 80 ? "Extreme" : value >= 65 ? "High" : value >= 45 ? "Medium" : "Low";
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full", value >= 80 ? "bg-red-400" : value >= 65 ? "bg-amber-300" : value >= 45 ? "bg-cyan-300" : "bg-emerald-300")}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[11px] text-white/55">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: ApiStatus }) {
  const isLive = status === "live";
  const isLoading = status === "loading";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]", isLive ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : isLoading ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-300" : isLoading ? "bg-cyan-300" : "bg-amber-300")} />
      {isLive ? "Live API" : isLoading ? "Loading" : "Fallback"}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "cyan" }: { icon: any; label: string; value: string; sub: string; tone?: "cyan" | "green" | "amber" | "red" }) {
  const toneClass = {
    cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-200",
    green: "from-emerald-300/20 to-teal-300/5 text-emerald-200",
    amber: "from-amber-300/20 to-orange-300/5 text-amber-200",
    red: "from-red-300/20 to-pink-300/5 text-red-200",
  }[tone];

  return (
    <Card className="overflow-hidden relative before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.10),transparent_35%)]">
      <CardContent className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-sm text-white/50">{sub}</p>
          </div>
          <div className={cn("rounded-2xl bg-gradient-to-br p-3", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ViewHeader({ icon: Icon, eyebrow, title, description, right }: { icon: any; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-gradient-to-r from-cyan-300/15 to-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
          <Icon className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 lg:text-base">{description}</p>
      </div>
      {right}
    </div>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return <motion.div key="workspace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>{children}</motion.div>;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<MarketRow[]>(fallbackMarketRows);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>(fallbackVaultRows);
  const [vaultApiStatus, setVaultApiStatus] = useState<ApiStatus>("loading");
  const [vaultLastUpdated, setVaultLastUpdated] = useState<Date | null>(null);
  const [trackedWallet, setTrackedWallet] = useState("");
  const [whaleRows, setWhaleRows] = useState<WhaleRow[]>(fallbackWhaleRows);
  const [whaleApiStatus, setWhaleApiStatus] = useState<ApiStatus>("fallback");
  const [whaleLastChecked, setWhaleLastChecked] = useState<Date | null>(null);
  const [whaleError, setWhaleError] = useState("Paste a Hyperliquid wallet address to scan open positions.");
  const [nftStats, setNftStats] = useState<NftStats>(fallbackNftStats);
  const [nftSaleRows, setNftSaleRows] = useState<NftSale[]>(fallbackNftSales);
  const [nftApiStatus, setNftApiStatus] = useState<ApiStatus>("loading");
  const [nftLastUpdated, setNftLastUpdated] = useState<Date | null>(null);
  const [nftError, setNftError] = useState("OpenSea API usually requires a server-side key. Fallback data is shown if blocked.");

  useEffect(() => {
    let isMounted = true;

    async function loadMarketPulse() {
      try {
        setApiStatus((current) => (current === "live" ? "live" : "loading"));
        const response = await fetch("/api/hyperliquid/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "metaAndAssetCtxs" }),
        });
        if (!response.ok) throw new Error(`Hyperliquid API error ${response.status}`);
        const payload = await response.json();
        const liveRows = buildMarketRowsFromHyperliquid(payload);
        if (isMounted && liveRows.length > 0) {
          setMarkets(liveRows);
          setApiStatus("live");
          setLastUpdated(new Date());
        }
      } catch (error) {
        if (isMounted) {
          setMarkets(fallbackMarketRows);
          setApiStatus("fallback");
          setLastUpdated(new Date());
        }
      }
    }

    loadMarketPulse();
    const interval = window.setInterval(loadMarketPulse, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadVaultRisk() {
      try {
        setVaultApiStatus((current) => (current === "live" ? "live" : "loading"));
        const response = await fetch("/api/hyperliquid/vaults", { method: "GET" });
        if (!response.ok) throw new Error(`Hyperliquid vault stats error ${response.status}`);
        const payload = await response.json();
        const liveVaultRows = buildVaultRowsFromStatsData(payload);
        if (isMounted) {
          setVaults(liveVaultRows);
          setVaultApiStatus("live");
          setVaultLastUpdated(new Date());
        }
      } catch (error) {
        if (isMounted) {
          setVaults(fallbackVaultRows);
          setVaultApiStatus("fallback");
          setVaultLastUpdated(new Date());
        }
      }
    }

    loadVaultRisk();
    const interval = window.setInterval(loadVaultRisk, 300_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHypurrNftPulse() {
      try {
        setNftApiStatus((current) => (current === "live" ? "live" : "loading"));
        const [statsResponse, eventsResponse] = await Promise.all([
          fetch("/api/opensea/stats", { method: "GET" }),
          fetch("/api/opensea/events", { method: "GET" }),
        ]);
        if (!statsResponse.ok) throw new Error(`OpenSea stats error ${statsResponse.status}`);
        const statsPayload = await statsResponse.json();
        const liveStats = buildNftStatsFromOpenSea(statsPayload);
        let liveSales = fallbackNftSales;
        if (eventsResponse.ok) {
          const eventsPayload = await eventsResponse.json();
          liveSales = buildNftSalesFromOpenSeaEvents(eventsPayload);
        }
        if (isMounted) {
          setNftStats(liveStats);
          setNftSaleRows(liveSales);
          setNftApiStatus("live");
          setNftLastUpdated(new Date());
          setNftError("Hypurr NFT stats and recent sales loaded from OpenSea.");
        }
      } catch (error) {
        if (isMounted) {
          setNftStats(fallbackNftStats);
          setNftSaleRows(fallbackNftSales);
          setNftApiStatus("fallback");
          setNftLastUpdated(new Date());
          setNftError("OpenSea API blocked, missing key, or event payload changed. Showing fallback data and direct OpenSea link.");
        }
      }
    }

    loadHypurrNftPulse();
    const interval = window.setInterval(loadHypurrNftPulse, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredMarkets = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())), [markets, query]);

  const dashboardStats = useMemo(() => {
    const totalOi = markets.reduce((sum, row) => sum + (row.rawOi || 0), 0);
    const totalVolume = markets.reduce((sum, row) => sum + (row.volume || 0), 0);
    const crowdedMarkets = markets.filter((row) => row.risk >= 65).length;
    const globalRisk = markets.length ? Math.round(markets.reduce((sum, row) => sum + row.risk, 0) / markets.length) : 0;
    const hypeRow = markets.find((row) => row.symbol === "HYPE") || fallbackMarketRows[0];
    const liquidationProxy = markets.filter((row) => row.risk >= 65).reduce((sum, row) => sum + (row.rawOi || 0) * 0.035, 0);
    return { totalOi, totalVolume, crowdedMarkets, globalRisk, hypeRow, liquidationProxy };
  }, [markets]);

  async function scanWhaleWallet() {
    const address = trackedWallet.trim();
    if (!isValidEvmAddress(address)) {
      setWhaleApiStatus("fallback");
      setWhaleError("Invalid address. Paste a full 0x wallet address.");
      return;
    }

    try {
      setWhaleApiStatus("loading");
      setWhaleError("");
      const response = await fetch("/api/hyperliquid/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clearinghouseState", user: address }),
      });
      if (!response.ok) throw new Error(`Hyperliquid wallet scan error ${response.status}`);
      const payload = await response.json();
      const positions = buildWhaleRowsFromClearinghouseState(payload, markets);
      setWhaleRows(positions.length > 0 ? positions : []);
      setWhaleApiStatus("live");
      setWhaleLastChecked(new Date());
      setWhaleError(positions.length > 0 ? `Tracking ${shortenAddress(address)} open perp positions.` : `No open perp positions found for ${shortenAddress(address)}.`);
    } catch (error) {
      setWhaleRows(fallbackWhaleRows);
      setWhaleApiStatus("fallback");
      setWhaleLastChecked(new Date());
      setWhaleError("Wallet scan failed. Showing fallback examples.");
    }
  }

  function renderOverview() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={Sparkles}
          eyebrow="Hyperliquid intelligence"
          title="Hyperliquid intelligence, cleaner and sharper."
          description="A fixed-sidebar workspace for markets, TWAPs, Hypurr NFTs, TradFi flows, vaults and whale data. No front-page wallet block, no anchor-scroll landing page — just modules that feel like a real app."
          right={<StatusPill status={apiStatus} />}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Gauge} label="Global Risk" value={String(dashboardStats.globalRisk)} sub="Funding, OI, 24h move, volume" tone={dashboardStats.globalRisk >= 65 ? "amber" : "cyan"} />
          <StatCard icon={Activity} label="Tracked OI" value={formatUsd(dashboardStats.totalOi)} sub="Live Hyperliquid perps universe" />
          <StatCard icon={Waves} label="24h Volume" value={formatUsd(dashboardStats.totalVolume)} sub="Across tracked markets" tone="green" />
          <StatCard icon={ImageIcon} label="NFT Floor" value={nftStats.floor} sub="Hypurr collection" tone="amber" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Market Pulse</h2>
                  <p className="text-sm text-white/50">Live markets by priority, OI and risk.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveView("markets")}>Open markets</Button>
              </div>
              <MarketTable rows={filteredMarkets.slice(0, 8)} compact />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Recent Hypurr sales</h2>
                  <p className="text-sm text-white/45">Images appear when OpenSea returns them.</p>
                </div>
                <StatusPill status={nftApiStatus} />
              </div>
              <div className="space-y-3">
                {nftSaleRows.slice(0, 4).map((sale) => <NftSaleRow key={`${sale.id}-${sale.time}`} sale={sale} />)}
              </div>
            </CardContent>
          </Card>
        </div>
      </WorkspaceShell>
    );
  }

  function renderMarkets() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={BarChart3}
          eyebrow="Live perps"
          title="Hyperliquid market stats"
          description="Live perps table via metaAndAssetCtxs: price, 24h change, open interest, volume, funding and internal risk score."
          right={<div className="flex items-center gap-2"><StatusPill status={apiStatus} /><span className="text-xs text-white/40">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></div>}
        />
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <Search className="h-4 w-4 text-white/35" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search market..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
            </div>
            <MarketTable rows={filteredMarkets} />
          </CardContent>
        </Card>
      </WorkspaceShell>
    );
  }

  function renderTwaps() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={Clock}
          eyebrow="TWAP tape"
          title="TWAP monitor"
          description="This is the page structure for the TWAP module. Next step is wiring the correct Hyperliquid TWAP endpoint / source. For now it is isolated from the rest of the site so it can become a real-time tape without changing the layout again."
          right={<span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">Data route pending</span>}
        />
        <Card>
          <CardContent>
            <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100/85">
              Important: je n’ai pas branché une fausse donnée TWAP. La page est prête visuellement, mais il faut ajouter une API route dédiée une fois la source fiable confirmée.
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <div className="grid grid-cols-5 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/35">
                <div>Market</div><div>Side</div><div>Notional</div><div>Filled</div><div>Status</div>
              </div>
              {fallbackTwapRows.map((row) => (
                <div key={`${row.market}-${row.side}`} className="grid grid-cols-5 border-t border-white/10 px-4 py-4 text-sm text-white/75">
                  <div className="font-semibold text-white">{row.market}</div>
                  <div className={row.side === "Buy" ? "text-emerald-300" : "text-red-300"}>{row.side}</div>
                  <div>{row.notional}</div>
                  <div>{row.filled}</div>
                  <div className="text-white/45">{row.status}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </WorkspaceShell>
    );
  }

  function renderNfts() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={ImageIcon}
          eyebrow="Hypurr NFT pulse"
          title="Hypurr NFT sales, floor and images"
          description="Recent sales now render as cards and display the sold NFT image whenever OpenSea returns image_url/display_image_url in the event payload. Refresh interval: 60 seconds."
          right={<div className="flex items-center gap-2"><StatusPill status={nftApiStatus} /><a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5">OpenSea <ExternalLink className="h-3.5 w-3.5" /></a></div>}
        />

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Coins} label="Floor" value={nftStats.floor} sub="OpenSea collection" />
          <StatCard icon={Activity} label="24h Volume" value={nftStats.volume24h} sub="Collection volume" tone="green" />
          <StatCard icon={TrendingUp} label="Total Volume" value={nftStats.totalVolume} sub="All-time" />
          <StatCard icon={Layers} label="Listed" value={nftStats.listed} sub="Listing ratio" tone="amber" />
          <StatCard icon={Wallet} label="Owners" value={nftStats.owners} sub="Holder count" />
          <StatCard icon={Zap} label="24h Sales" value={nftStats.sales24h} sub="Sale count" tone="green" />
        </div>

        <Card className="mt-5">
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Latest sales</h2>
                <p className="text-sm text-white/45">{nftError}</p>
              </div>
              <span className="text-xs text-white/40">{nftLastUpdated ? `Updated ${nftLastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {nftSaleRows.map((sale) => <NftSaleCard key={`${sale.id}-${sale.time}`} sale={sale} />)}
            </div>
          </CardContent>
        </Card>
      </WorkspaceShell>
    );
  }

  function renderEtfs() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={Globe2}
          eyebrow="TradFi flow"
          title="HYPE ETP / ETF watchlist"
          description="This keeps the TradFi angle separate from NFTs and perps. Flow/AUM automation should become its own source-backed route instead of hard-coded cards."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {etpRows.map((row) => (
            <Card key={row.name}>
              <CardContent>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{row.name}</h3>
                    <p className="mt-1 text-sm text-white/45">{row.ticker} · {row.isin}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] text-cyan-200">{row.status}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <Metric label="Venue" value={row.venue} />
                  <Metric label="Fee" value={row.fee} />
                  <Metric label="AUM" value={row.aum} />
                  <Metric label="Flow" value={row.flow} />
                </div>
                <a href={row.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">Source <ExternalLink className="h-4 w-4" /></a>
              </CardContent>
            </Card>
          ))}
        </div>
      </WorkspaceShell>
    );
  }

  function renderVaults() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={Layers}
          eyebrow="Vault screener"
          title="Hyperliquid vault risk"
          description="Open vaults ranked by AUM with a basic risk heuristic based on TVL, APR pressure and age."
          right={<div className="flex items-center gap-2"><StatusPill status={vaultApiStatus} /><span className="text-xs text-white/40">{vaultLastUpdated ? `Updated ${vaultLastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></div>}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {vaults.map((vault) => (
            <Card key={`${vault.name}-${vault.vaultAddress || vault.rawAum}`}>
              <CardContent>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{vault.name}</h3>
                    <p className="mt-1 text-sm text-white/45">AUM {vault.aum} · Age {vault.age} · {vault.status}</p>
                  </div>
                  <RiskPill value={vault.score} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="APR / Return proxy" value={vault.apr} />
                  <Metric label="Status" value={vault.dd} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </WorkspaceShell>
    );
  }

  function renderWhales() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={Wallet}
          eyebrow="Manual wallet scan"
          title="Whale Watch"
          description="Paste a wallet and scan open perp positions through Hyperliquid clearinghouseState. Read-only only."
          right={<StatusPill status={whaleApiStatus} />}
        />
        <Card>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <Wallet className="h-4 w-4 text-white/35" />
                <input value={trackedWallet} onChange={(event) => setTrackedWallet(event.target.value)} placeholder="0x wallet address..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
              </div>
              <Button onClick={scanWhaleWallet}>Scan wallet</Button>
            </div>
            <p className="mb-4 text-sm text-white/45">{whaleError}</p>
            <div className="grid gap-3 xl:grid-cols-2">
              {whaleRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">No open positions to display. Try another wallet address.</div>
              ) : whaleRows.map((move) => (
                <div key={`${move.coin}-${move.side}-${move.size}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{move.side} {move.coin}</h3>
                      <p className="text-sm text-white/45">{move.size} · {move.notional} · {move.leverage}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-xs", move.danger === "High" ? "bg-red-300/15 text-red-200" : move.danger === "Medium" ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/15 text-emerald-200")}>{move.danger}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Metric label="Entry" value={move.entry} />
                    <Metric label="PnL" value={move.pnl} valueClass={move.rawPnl >= 0 ? "text-emerald-300" : "text-red-300"} />
                    <Metric label="Liq" value={move.liquidation} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </WorkspaceShell>
    );
  }

  function renderMethodology() {
    return (
      <WorkspaceShell>
        <ViewHeader
          icon={ShieldAlert}
          eyebrow="Methodology"
          title="What changed in this phase"
          description="This is a layout/product patch first. Data modules can now be added one by one without turning the page into a long scroll again."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {methodologyItems.map((item) => (
            <Card key={item.title}>
              <CardContent>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><CheckCircle2 className="h-5 w-5" /></div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </WorkspaceShell>
    );
  }

  const activeMeta = navItems.find((item) => item.id === activeView) || navItems[0];

  return (
    <main className="min-h-screen bg-[#071815] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.22),transparent_32%),radial-gradient(circle_at_70%_10%,rgba(251,191,36,0.09),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_34%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-cyan-100/10 bg-[#041210]/70 p-4 backdrop-blur-2xl lg:block">
          <div className="flex h-full flex-col">
            <div className="rounded-3xl border border-cyan-100/10 bg-gradient-to-br from-white/[0.09] to-cyan-300/[0.035] p-4 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 via-teal-200 to-emerald-200 text-slate-950 shadow-lg shadow-cyan-950/30"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold">HypurrScope</div>
                  <div className="text-xs text-white/45">Ecosystem intelligence</div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/[0.18] px-3 py-2 text-xs text-white/60">
                <span>API status</span>
                <StatusPill status={apiStatus} />
              </div>
            </div>

            <nav className="mt-4 space-y-1 overflow-y-auto pr-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeView;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition", active ? "bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-200 text-slate-950 shadow-lg shadow-cyan-950/30" : "text-white/68 hover:bg-white/[0.075] hover:text-white")} 
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className={cn("block truncate text-xs", active ? "text-slate-700" : "text-white/40")}>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-300/[0.09] to-cyan-300/[0.035] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Radio className="h-4 w-4 text-emerald-300" /> Read-only</div>
              <p className="text-xs leading-5 text-white/45">No wallet connect, no order routing, no private keys.</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 lg:p-7">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-white/12 bg-white/[0.07] p-3 backdrop-blur lg:hidden">
            <div>
              <div className="font-semibold">HypurrScope</div>
              <div className="text-xs text-white/45">{activeMeta.label}</div>
            </div>
            <select value={activeView} onChange={(event) => setActiveView(event.target.value as ViewId)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
              {navItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          {activeView === "overview" && renderOverview()}
          {activeView === "markets" && renderMarkets()}
          {activeView === "twaps" && renderTwaps()}
          {activeView === "nfts" && renderNfts()}
          {activeView === "etfs" && renderEtfs()}
          {activeView === "vaults" && renderVaults()}
          {activeView === "whales" && renderWhales()}
          {activeView === "methodology" && renderMethodology()}

          <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/42 lg:flex-row lg:items-center lg:justify-between">
            <span>HypurrScope · Read-only Hyperliquid ecosystem dashboard</span>
            <span>{lastUpdated ? `Markets updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for market data"}</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/[0.16] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className={cn("mt-2 font-semibold", valueClass)}>{value}</p>
    </div>
  );
}

function MarketTable({ rows, compact = false }: { rows: MarketRow[]; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
      <div className={cn("grid bg-white/[0.065] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/40", compact ? "grid-cols-5" : "grid-cols-6")}>
        <div>Market</div><div>Price</div><div>24h</div><div>OI</div>{!compact && <div>Volume</div>}<div>Risk</div>
      </div>
      {rows.map((row) => (
        <div key={row.symbol} className={cn("grid items-center border-t border-white/10 px-4 py-3 text-sm transition hover:bg-white/[0.035]", compact ? "grid-cols-5" : "grid-cols-6")}>
          <div className="font-semibold text-white">{row.symbol}</div>
          <div className="text-white/75">{row.price}</div>
          <div className={row.rawChange >= 0 ? "text-emerald-300" : "text-red-300"}>{row.change}</div>
          <div className="text-white/75">{row.oi}</div>
          {!compact && <div className="text-white/55">{row.volumeLabel}</div>}
          <RiskPill value={row.risk} />
        </div>
      ))}
    </div>
  );
}

function NftSaleRow({ sale }: { sale: NftSale }) {
  return (
    <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:border-cyan-200/25 hover:bg-white/[0.075]">
      <NftImage sale={sale} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-white">{sale.name}</div>
        <div className="text-sm text-white/45">{sale.price} · {sale.time}</div>
      </div>
      <ExternalLink className="h-4 w-4 text-white/35" />
    </a>
  );
}

function NftSaleCard({ sale }: { sale: NftSale }) {
  return (
    <a href={sale.url || OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] transition hover:border-cyan-200/30 hover:bg-white/[0.075]">
      <div className="aspect-square bg-gradient-to-br from-black/20 to-cyan-300/[0.04]">
        <NftImage sale={sale} size="lg" />
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">{sale.name}</h3>
            <p className="text-sm text-white/45">Sold {sale.time}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-white/35 transition group-hover:text-cyan-200" />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Price" value={sale.price} />
          <Metric label="Source" value={sale.usd} />
        </div>
      </div>
    </a>
  );
}

function NftImage({ sale, size }: { sale: NftSale; size: "sm" | "lg" }) {
  const className = size === "sm" ? "h-12 w-12" : "h-full w-full";
  if (sale.image) {
    return <img src={sale.image} alt={sale.name} className={cn(className, "rounded-2xl object-cover")} loading="lazy" />;
  }
  return (
    <div className={cn(className, "flex items-center justify-center rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/16 via-teal-300/10 to-emerald-300/8 text-cyan-100/55")}>
      <ImageIcon className={size === "sm" ? "h-5 w-5" : "h-10 w-10"} />
    </div>
  );
}

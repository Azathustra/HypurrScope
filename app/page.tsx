"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  Layers,
  Lock,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
  Waves,
  Zap
} from "lucide-react";

type MarketRow = {
  symbol: string;
  price: string;
  rawPrice: number;
  change: string;
  rawChange: number;
  oi: string;
  rawOi: number;
  volume?: number;
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
  price: string;
  usd: string;
  time: string;
};

const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

const fallbackMarketRows: MarketRow[] = [
  { symbol: "HYPE", price: "$68.42", rawPrice: 68.42, change: "+4.8%", rawChange: 4.8, oi: "$1.82B", rawOi: 1820000000, funding: "+0.0180%", rawFunding: 0.00018, risk: 72 },
  { symbol: "BTC", price: "$104,820", rawPrice: 104820, change: "+1.2%", rawChange: 1.2, oi: "$3.44B", rawOi: 3440000000, funding: "+0.0060%", rawFunding: 0.00006, risk: 48 },
  { symbol: "ETH", price: "$5,930", rawPrice: 5930, change: "+2.6%", rawChange: 2.6, oi: "$2.11B", rawOi: 2110000000, funding: "+0.0120%", rawFunding: 0.00012, risk: 61 },
  { symbol: "SOL", price: "$238.12", rawPrice: 238.12, change: "-0.9%", rawChange: -0.9, oi: "$884M", rawOi: 884000000, funding: "-0.0040%", rawFunding: -0.00004, risk: 39 },
  { symbol: "FARTCOIN", price: "$1.91", rawPrice: 1.91, change: "+18.7%", rawChange: 18.7, oi: "$228M", rawOi: 228000000, funding: "+0.0720%", rawFunding: 0.00072, risk: 91 }
];

const fallbackWhaleRows: WhaleRow[] = [
  { coin: "HYPE", side: "Long", size: "70,691 HYPE", notional: "$4.8M", entry: "$67.90", pnl: "+$182K", rawPnl: 182000, liquidation: "$51.20", leverage: "3.2x", danger: "Medium" },
  { coin: "ETH", side: "Short", size: "354 ETH", notional: "$2.1M", entry: "$5,880", pnl: "+$44K", rawPnl: 44000, liquidation: "--", leverage: "2.0x", danger: "Low" },
  { coin: "BTC", side: "Long", size: "70.6 BTC", notional: "$7.4M", entry: "$104,210", pnl: "-$96K", rawPnl: -96000, liquidation: "$88,400", leverage: "4.8x", danger: "High" }
];

const fallbackVaultRows: VaultRow[] = [
  { name: "Blue Whale", aum: "$42.6M", rawAum: 42600000, apr: "+18.4%", dd: "Live", age: "214d", score: 78, status: "Open" },
  { name: "Delta Neutral Alpha", aum: "$18.9M", rawAum: 18900000, apr: "+7.2%", dd: "Live", age: "126d", score: 35, status: "Open" },
  { name: "Hyper Momentum", aum: "$11.2M", rawAum: 11200000, apr: "+39.8%", dd: "Live", age: "58d", score: 88, status: "Open" }
];

const fallbackNftStats: NftStats = {
  floor: "338 HYPE",
  volume24h: "2.1K HYPE",
  totalVolume: "6.2M HYPE",
  listed: "4.8%",
  owners: "--",
  sales24h: "--"
};

const fallbackNftSales: NftSale[] = [
  { id: "Hypurr #137", price: "342 HYPE", usd: "$23.4K", time: "12m ago" },
  { id: "Hypurr #029", price: "336 HYPE", usd: "$23.0K", time: "34m ago" },
  { id: "Hypurr #411", price: "351 HYPE", usd: "$24.0K", time: "1h ago" }
];

const etpRows = [
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE",
    isin: "CH1471826029",
    venue: "SIX / EU venues",
    fee: "2.50%",
    status: "Live ETP",
    aum: "$--",
    flow: "Tracking",
    note: "Physically backed HYPE exposure. AUM/flow automation planned for V2.",
    url: "https://www.21shares.com/"
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD",
    isin: "GB00BVBJQ593",
    venue: "Xetra",
    fee: "0.00% mgmt",
    status: "Live ETP",
    aum: "$--",
    flow: "Tracking",
    note: "Staking-oriented product. Watch for TradFi demand and yield positioning.",
    url: "https://coinshares.com/"
  },
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    isin: "SEC filing",
    venue: "NYSE Arca proposed",
    fee: "Pending",
    status: "Filing watch",
    aum: "Pending",
    flow: "Watchlist",
    note: "Potential US ETF catalyst. Track amendments, effectiveness and launch timing.",
    url: "https://www.sec.gov/"
  }
];

const methodologyItems = [
  { title: "Market Risk Score", description: "Combines 24h price move, funding pressure, open interest and volume. It is a heuristic, not a trading signal." },
  { title: "Vault Risk Score", description: "Ranks vault risk using TVL, APR pressure, age and closed/open status. Drawdown integration is planned." },
  { title: "Whale Scanner", description: "Reads open perp positions from public wallet data. It never connects wallets and never sends orders." },
  { title: "NFT Pulse", description: "OpenSea-ready module for Hypurr stats and sale events. Server-side API key support is planned for production." },
  { title: "TradFi Flow", description: "Tracks listed HYPE products, ETF filings and future AUM/inflow pressure. Live flow automation is planned." }
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
  const fundingPressure = Math.abs(funding || 0) * 30000;
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
        funding: formatPercent(funding * 100, 4),
        rawFunding: funding,
        risk: calculateRiskScore(changePct, funding, openInterestNotional, dayVolumeNotional)
      };
    })
    .filter((row: MarketRow) => row.symbol && row.rawPrice > 0);

  const prioritySymbols = ["HYPE", "BTC", "ETH", "SOL", "FARTCOIN", "PUMP", "DOGE", "XRP"];
  const priorityRows = prioritySymbols.map((symbol) => rows.find((row: MarketRow) => row.symbol === symbol)).filter(Boolean) as MarketRow[];
  const highRiskRows = [...rows].sort((a: MarketRow, b: MarketRow) => b.risk - a.risk).slice(0, 16);
  const combined = [...priorityRows, ...highRiskRows];
  const uniqueBySymbol = Array.from(new Map(combined.map((row) => [row.symbol, row])).values());
  return uniqueBySymbol.slice(0, 12);
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
        status: isClosed ? "Closed" : "Open"
      };
    })
    .filter((row: VaultRow) => row.rawAum > 50_000 && row.status === "Open")
    .sort((a: VaultRow, b: VaultRow) => b.rawAum - a.rawAum)
    .slice(0, 8);

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

      return { coin, side, size, notional, entry, pnl, rawPnl: pnlValue, liquidation, leverage: leverageValue === "--" ? "--" : `${leverageValue}x`, danger };
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
    sales24h: sales24h > 0 ? String(Math.round(sales24h)) : fallbackNftStats.sales24h
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

function buildNftSalesFromOpenSeaEvents(payload: any): NftSale[] {
  const events = payload?.asset_events || payload?.events || [];
  if (!Array.isArray(events)) throw new Error("Unexpected OpenSea events response");

  const rows = events
    .filter((event: any) => (event.event_type || event.eventType || "sale") === "sale")
    .map((event: any, index: number) => {
      const nft = event.nft || event.asset || {};
      const identifier = nft.identifier || nft.token_id || event.token_id || event.nft_id || "?";
      const name = nft.name || `Hypurr #${identifier}`;
      const time = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp;
      return { id: name, price: normalizeOpenSeaEventPrice(event), usd: "OpenSea", time: formatRelativeTime(time) || `${index + 1}` };
    })
    .slice(0, 5);

  if (rows.length === 0) throw new Error("No sale events parsed");
  return rows;
}

function Button({ children, className = "", variant = "solid", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline"; size?: "default" | "sm" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "outline" ? "border border-white/15 bg-white/5 text-white hover:bg-white/10" : "bg-white text-[#071412] hover:bg-cyan-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[1.5rem] border", className)}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function RiskPill({ value }: { value: number }) {
  const label = value >= 80 ? "Extreme" : value >= 65 ? "High" : value >= 45 ? "Medium" : "Low";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", value >= 80 ? "bg-red-400" : value >= 65 ? "bg-amber-300" : value >= 45 ? "bg-cyan-300" : "bg-emerald-300")} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-white/60">{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isLive = status === "live";
  const isLoading = status === "loading";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", isLive ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : isLoading ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100")}> 
      <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-emerald-300" : isLoading ? "bg-cyan-300" : "bg-amber-300")} />
      {isLive ? "Live API" : isLoading ? "Loading API" : "Fallback data"}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "cyan" }: { icon: any; label: string; value: string; sub: string; tone?: "cyan" | "green" | "amber" | "red" }) {
  const toneClass = {
    cyan: "from-cyan-300/20 to-teal-300/5 text-cyan-200",
    green: "from-emerald-300/20 to-teal-300/5 text-emerald-200",
    amber: "from-amber-300/20 to-orange-300/5 text-amber-200",
    red: "from-red-300/20 to-pink-300/5 text-red-200"
  }[tone];

  return (
    <Card className="border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/50">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
            <p className="mt-1 text-xs text-white/45">{sub}</p>
          </div>
          <div className={cn("rounded-2xl bg-gradient-to-br p-3", toneClass)}>
            <Icon size={21} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, description, right }: { icon: any; eyebrow: string; title: string; description: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <div className="mt-1 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200"><Icon size={18} /></div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/80">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState<MarketRow[]>(fallbackMarketRows);
  const [apiStatus, setApiStatus] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>(fallbackVaultRows);
  const [vaultApiStatus, setVaultApiStatus] = useState("loading");
  const [vaultLastUpdated, setVaultLastUpdated] = useState<Date | null>(null);
  const [trackedWallet, setTrackedWallet] = useState("");
  const [whaleRows, setWhaleRows] = useState<WhaleRow[]>(fallbackWhaleRows);
  const [whaleApiStatus, setWhaleApiStatus] = useState("fallback");
  const [whaleLastChecked, setWhaleLastChecked] = useState<Date | null>(null);
  const [whaleError, setWhaleError] = useState("Paste a Hyperliquid wallet address to scan open positions.");
  const [nftStats, setNftStats] = useState<NftStats>(fallbackNftStats);
  const [nftSaleRows, setNftSaleRows] = useState<NftSale[]>(fallbackNftSales);
  const [nftApiStatus, setNftApiStatus] = useState("loading");
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
          body: JSON.stringify({ type: "metaAndAssetCtxs" })
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
          fetch("/api/opensea/events", { method: "GET" })
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
          setNftError("Hypurr NFT stats loaded from OpenSea.");
        }
      } catch (error) {
        if (isMounted) {
          setNftStats(fallbackNftStats);
          setNftSaleRows(fallbackNftSales);
          setNftApiStatus("fallback");
          setNftLastUpdated(new Date());
          setNftError("OpenSea API blocked or missing key. Showing fallback data and direct OpenSea link.");
        }
      }
    }
    loadHypurrNftPulse();
    const interval = window.setInterval(loadHypurrNftPulse, 300_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredMarkets = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())), [markets, query]);

  const dashboardStats = useMemo(() => {
    const totalOi = markets.reduce((sum, row) => sum + (row.rawOi || 0), 0);
    const crowdedMarkets = markets.filter((row) => row.risk >= 65).length;
    const globalRisk = markets.length ? Math.round(markets.reduce((sum, row) => sum + row.risk, 0) / markets.length) : 0;
    const hypeRow = markets.find((row) => row.symbol === "HYPE") || fallbackMarketRows[0];
    const liquidationProxy = markets.filter((row) => row.risk >= 65).reduce((sum, row) => sum + (row.rawOi || 0) * 0.035, 0);
    return { totalOi, crowdedMarkets, globalRisk, hypeRow, liquidationProxy };
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
        body: JSON.stringify({ type: "clearinghouseState", user: address })
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

  return (
    <div className="min-h-screen overflow-hidden bg-[#071412] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 top-28 h-[32rem] w-[32rem] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(54,255,219,0.10),transparent_34%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:auto,48px_48px,48px_48px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-[#071412]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-[#071412] shadow-lg shadow-cyan-500/20"><Gauge size={22} /></div>
            <div><p className="text-base font-semibold tracking-tight">HypurrScope</p><p className="text-xs text-white/45">Ecosystem intelligence dashboard</p></div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/55 md:flex">
            <a href="#market" className="hover:text-cyan-200">Market</a><a href="#whales" className="hover:text-cyan-200">Whales</a><a href="#vaults" className="hover:text-cyan-200">Vaults</a><a href="#nfts" className="hover:text-cyan-200">NFTs</a><a href="#tradfi" className="hover:text-cyan-200">TradFi</a><a href="#methodology" className="hover:text-cyan-200">Methodology</a>
          </nav>
          <Button><Bell className="mr-2" size={16} /> Alerts soon</Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100"><Radio size={14} /> Built on Hyperliquid ecosystem data</div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-6xl">A risk dashboard for traders, vault users and Hypurr holders.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/55 md:text-lg">Track crowded trades, whale moves, vault drawdowns, Hypurr NFT momentum and HYPE TradFi flows from one clean dashboard.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button className="bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 text-[#071412] hover:opacity-90"><Sparkles className="mr-2" size={16} /> Launch dashboard</Button>
              <Button variant="outline" className="px-5"><Wallet className="mr-2" size={16} /> Builder wallet: 0x...soon</Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }}>
            <Card className="border-cyan-300/20 bg-[#0b201d]/80 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-white/45">Global Risk Score</p><p className="mt-1 text-5xl font-semibold tracking-tight text-white">{dashboardStats.globalRisk}</p></div><div className="rounded-3xl bg-amber-300/10 p-4 text-amber-200"><ShieldAlert size={34} /></div></div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300" style={{ width: `${dashboardStats.globalRisk}%` }} /></div>
                <p className="mt-4 text-sm leading-6 text-white/55">Market risk is estimated from 24h move, funding pressure, open interest and volume. Whale, vault, NFT and TradFi modules are staged for public builder visibility.</p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-lg font-semibold text-white">{formatUsd(dashboardStats.totalOi)}</p><p className="text-xs text-white/45">Tracked OI</p></div><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-lg font-semibold text-white">{dashboardStats.crowdedMarkets}</p><p className="text-xs text-white/45">Crowded</p></div><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-lg font-semibold text-white">{apiStatus === "live" ? "60s" : "Mock"}</p><p className="text-xs text-white/45">Refresh</p></div></div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label="HYPE Spot" value={dashboardStats.hypeRow.price} sub={`${dashboardStats.hypeRow.change} in 24h`} tone="green" />
          <StatCard icon={BarChart3} label="Tracked OI" value={formatUsd(dashboardStats.totalOi)} sub="Top markets shown below" tone="cyan" />
          <StatCard icon={AlertTriangle} label="Crowded Markets" value={String(dashboardStats.crowdedMarkets)} sub="Risk score above 65" tone="amber" />
          <StatCard icon={ShieldAlert} label="Liquidation Proxy" value={formatUsd(dashboardStats.liquidationProxy)} sub="3.5% of high-risk OI" tone="red" />
        </section>

        <section id="market" className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
          <SectionHeader icon={Activity} eyebrow="Market Pulse" title="Live crowded trade radar" description="Calls the Hyperliquid info endpoint and estimates risk from mark price, previous day price, funding, volume and open interest." right={<div className="hidden shrink-0 flex-col items-end gap-2 md:flex"><StatusPill status={apiStatus} /><span className="text-xs text-white/35">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></div>} />
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/70"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search market..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" /></div>
          <div className="overflow-hidden rounded-3xl border border-white/10"><div className="grid grid-cols-6 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-wider text-white/40"><span>Market</span><span>Price</span><span>24h</span><span>Open Interest</span><span>Funding</span><span>Risk</span></div>{filteredMarkets.map((row) => (<div key={row.symbol} className="grid grid-cols-6 items-center border-t border-white/10 px-4 py-4 text-sm"><span className="font-medium text-white">{row.symbol}</span><span className="text-white/70">{row.price}</span><span className={row.rawChange >= 0 ? "text-emerald-300" : "text-red-300"}>{row.change}</span><span className="text-white/70">{row.oi}</span><span className={row.rawFunding >= 0 ? "text-amber-200" : "text-cyan-200"}>{row.funding}</span><RiskPill value={row.risk} /></div>))}</div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div id="whales" className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
            <SectionHeader icon={Waves} eyebrow="Whale Watch" title="Wallet position scanner" description="Paste any Hyperliquid wallet and scan its open perp positions. V1 is read-only: no wallet connect, no execution, no copy-trading risk." right={<div className="hidden shrink-0 flex-col items-end gap-2 md:flex"><StatusPill status={whaleApiStatus} /><span className="text-xs text-white/35">{whaleLastChecked ? `Checked ${whaleLastChecked.toLocaleTimeString()}` : "Manual scan"}</span></div>} />
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:flex-row"><div className="flex flex-1 items-center gap-3 px-1 text-white/70"><Wallet size={17} /><input value={trackedWallet} onChange={(event) => setTrackedWallet(event.target.value)} placeholder="0x wallet address..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" /></div><Button onClick={scanWhaleWallet} className="bg-cyan-200 text-[#071412] hover:bg-cyan-100">Scan wallet</Button></div>
            <p className="mb-4 text-xs text-white/40">{whaleError}</p>
            <div className="space-y-3">{whaleRows.length === 0 ? <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">No open positions to display. Try another wallet address.</div> : whaleRows.map((move) => (<div key={`${move.coin}-${move.side}-${move.size}`} className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{move.side} {move.coin}</p><p className="mt-1 text-sm text-white/45">{move.size} · {move.notional} · {move.leverage}</p></div><span className={cn("rounded-full px-3 py-1 text-xs", move.danger === "High" ? "bg-red-300/10 text-red-200" : move.danger === "Medium" ? "bg-amber-300/10 text-amber-200" : "bg-cyan-300/10 text-cyan-200")}>{move.danger}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/45"><span>Entry: {move.entry}</span><span className={move.rawPnl >= 0 ? "text-emerald-300" : "text-red-300"}>PnL: {move.pnl}</span><span>Liq: {move.liquidation}</span></div><div className="mt-3 flex justify-end"><Button size="sm" variant="outline">Copy parameters</Button></div></div>))}</div>
          </div>

          <div id="vaults" className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
            <SectionHeader icon={Lock} eyebrow="Vault Risk" title="Live vault risk screener" description="Ranks open vaults by TVL, APR pressure, age and closure status. First version uses Hyperliquid stats-data, with fallback." right={<div className="hidden shrink-0 flex-col items-end gap-2 md:flex"><StatusPill status={vaultApiStatus} /><span className="text-xs text-white/35">{vaultLastUpdated ? `Updated ${vaultLastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></div>} />
            <div className="space-y-3">{vaults.map((vault) => (<div key={vault.name} className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-white">{vault.name}</p><p className="mt-1 text-sm text-white/45">AUM {vault.aum} · Age {vault.age} · {vault.status}</p></div><RiskPill value={vault.score} /></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">APR / Return proxy</p><p className="mt-1 font-medium text-emerald-300">{vault.apr}</p></div><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-xs text-white/40">Status</p><p className="mt-1 font-medium text-cyan-200">{vault.dd}</p></div></div></div>))}</div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div id="nfts" className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
            <SectionHeader icon={Layers} eyebrow="Hypurr NFT Pulse" title="Hypurr floor and sales monitor" description="Tracks Hypurr collection stats and recent sales. Uses OpenSea API via a server-side route when key/access is available." right={<div className="hidden shrink-0 flex-col items-end gap-2 md:flex"><StatusPill status={nftApiStatus} /><span className="text-xs text-white/35">{nftLastUpdated ? `Updated ${nftLastUpdated.toLocaleTimeString()}` : "Waiting for data"}</span></div>} />
            <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/45">{nftError} <a href={OPENSEA_COLLECTION_URL} target="_blank" rel="noreferrer" className="text-cyan-200 hover:text-cyan-100">Open collection</a></div>
            <div className="grid gap-3 md:grid-cols-3"><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Floor</p><p className="mt-1 text-2xl font-semibold text-white">{nftStats.floor}</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">24h Volume</p><p className="mt-1 text-2xl font-semibold text-white">{nftStats.volume24h}</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Total Volume</p><p className="mt-1 text-2xl font-semibold text-white">{nftStats.totalVolume}</p></div></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3"><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Listed</p><p className="mt-1 text-lg font-semibold text-white">{nftStats.listed}</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Owners</p><p className="mt-1 text-lg font-semibold text-white">{nftStats.owners}</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">24h Sales</p><p className="mt-1 text-lg font-semibold text-white">{nftStats.sales24h}</p></div></div>
            <div className="mt-4 space-y-2">{nftSaleRows.map((sale) => (<div key={`${sale.id}-${sale.time}-${sale.price}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm"><span className="font-medium text-white">{sale.id}</span><span className="text-cyan-200">{sale.price}</span><span className="text-white/45">{sale.usd}</span><span className="text-white/35">{sale.time}</span></div>))}</div>
          </div>

          <div id="tradfi" className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
            <SectionHeader icon={Globe2} eyebrow="TradFi Flow" title="HYPE ETP and ETF pulse" description="Track listed HYPE products, filings, fees, venues and future inflow pressure from traditional markets." />
            <div className="mb-4 grid gap-3 md:grid-cols-3"><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Tracked Products</p><p className="mt-1 text-2xl font-semibold text-white">{etpRows.length}</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Live Products</p><p className="mt-1 text-2xl font-semibold text-white">2</p></div><div className="rounded-3xl bg-black/20 p-4"><p className="text-xs text-white/40">Filing Watch</p><p className="mt-1 text-2xl font-semibold text-white">1</p></div></div>
            <div className="space-y-3">{etpRows.map((row) => (<div key={row.name} className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-white">{row.name}</p><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{row.status}</span></div><p className="mt-1 text-sm text-white/45">Ticker {row.ticker} · {row.isin} · {row.venue}</p></div><a href={row.url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 p-2 text-white/55 hover:text-cyan-200"><ExternalLink size={15} /></a></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-white/35">Fee</p><p className="mt-1 font-medium text-white">{row.fee}</p></div><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-white/35">AUM</p><p className="mt-1 font-medium text-white">{row.aum}</p></div><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-white/35">Flow</p><p className="mt-1 font-medium text-cyan-200">{row.flow}</p></div></div><p className="mt-3 text-xs leading-5 text-white/45">{row.note}</p></div>))}</div>
          </div>
        </section>

        <section id="methodology" className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl md:p-7">
          <SectionHeader icon={FileText} eyebrow="Methodology" title="Transparent scoring and builder identity" description="A builder-facing project should be easy to verify. This section explains current data sources, scoring logic and read-only safety model." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">{methodologyItems.map((item) => (<div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3 inline-flex rounded-2xl bg-emerald-300/10 p-2 text-emerald-200"><CheckCircle2 size={17} /></div><p className="font-medium text-white">{item.title}</p><p className="mt-2 text-xs leading-5 text-white/45">{item.description}</p></div>))}</div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Builder Wallet</p><p className="mt-2 font-mono text-sm text-white">0x...soon</p><p className="mt-2 text-xs leading-5 text-white/45">Replace this with the public wallet you want associated with the project.</p></div><div className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Safety Model</p><p className="mt-2 text-sm text-white">Read-only dashboard</p><p className="mt-2 text-xs leading-5 text-white/45">No wallet connect, no order routing, no agent wallet, no copy-trading execution in V1.</p></div><div className="rounded-3xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Next Builder Signal</p><p className="mt-2 text-sm text-white">Public changelog + X account</p><p className="mt-2 text-xs leading-5 text-white/45">Publishing updates regularly makes the project easier to identify as a real ecosystem contribution.</p></div></div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 to-emerald-300/5 p-5 backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-cyan-100"><Bot size={18} /><p className="text-sm font-medium uppercase tracking-[0.2em]">Daily AI Brief</p></div><h2 className="text-2xl font-semibold tracking-tight text-white">Market, vault, whale and NFT modules are staged.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">The dashboard has live perps market data, a vault screener, manual wallet scanning and an OpenSea-ready Hypurr NFT module. Next step is deployment and public identity.</p></div><Button><Zap className="mr-2" size={16} /> Generate brief</Button></div>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/40 md:flex-row md:items-center md:justify-between"><p>HypurrScope · Builder wallet: 0x...soon · Not financial advice.</p><div className="flex gap-4"><span>Changelog</span><span>Methodology</span><span>API status</span></div></footer>
      </main>
    </div>
  );
}

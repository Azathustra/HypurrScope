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
  LineChart,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";

type Status = "loading" | "live" | "fallback" | "error";
type ViewId = "overview" | "markets" | "buybacks" | "tape" | "nfts" | "hlp" | "tradfi" | "wallet";
type IconType = React.ComponentType<{ className?: string }>;

type MarketRow = {
  symbol: string;
  price: string;
  rawPrice: number;
  changeLabel: string;
  rawChange: number;
  oiLabel: string;
  rawOi: number;
  volumeLabel: string;
  rawVolume: number;
  fundingLabel: string;
  rawFunding: number;
  fdvLabel: string;
  rawFdv?: number;
  risk: number;
};

type HistoryPoint = { time: number; price: number; volume: number };
type NftSale = { id: string; tokenId: string; name: string; price: string; time: string; image?: string; crop?: "normal" | "left-preview" | "none"; url?: string };
type NftStats = { floor: string; volume24h: string; totalVolume: string; owners: string; sales24h: string };
type TapeTrade = { id: string; side: "Buy" | "Sell"; price: string; size: string; notionalLabel: string; timeLabel: string; notional: number };
type TapeCluster = { side: "Buy" | "Sell"; slices: number; notionalLabel: string; size: string; avgPrice: string; window: string; lastTrade: string; confidence: string; notional: number };
type TapeSummary = { buyLabel: string; sellLabel: string; netLabel: string; netSide: "Buy" | "Sell"; tradeCount: number; net: number };
type BuybackData = { estimatedBuybackUsd24hLabel?: string; estimatedBuybackHype24hLabel?: string; totalVolume24hLabel?: string; hypeVolume24hLabel?: string; estimatedRevenueUsdLabel?: string; assistanceFundAddress?: string; note?: string };
type VaultRow = { name: string; vaultAddress: string; leader: string; tvl: number; tvlLabel: string; status: string; ageDays: number | null; isClosed: boolean };
type TradFiProduct = { symbol: string; name: string; venue: string; issuer: string; price: string; changeLabel: string; changePct: number; shareVolume: string; dollarVolumeLabel: string; dailyFlow: string; flowNote: string; url: string; ok: boolean };
type WhaleRow = { coin: string; side: string; size: string; notional: string; entry: string; pnl: string; rawPnl: number; liq: string; lev: string; danger: string };

type NavItem = { id: ViewId; label: string; sub: string; icon: IconType };

const SUPPLY = 1_000_000_000;
const OPENSEA_URL = "https://opensea.io/collection/hypurr-hyperevm";

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", sub: "Live pulse", icon: Gauge },
  { id: "markets", label: "Markets", sub: "FDV · OI · volume", icon: BarChart3 },
  { id: "buybacks", label: "Buybacks", sub: "AF pressure", icon: Flame },
  { id: "tape", label: "HYPE tape", sub: "Trades · TWAP-like", icon: Clock3 },
  { id: "nfts", label: "Hypurr NFTs", sub: "Sales · floor", icon: ImageIcon },
  { id: "hlp", label: "HLP / Vaults", sub: "TVL monitor", icon: Layers },
  { id: "tradfi", label: "TradFi", sub: "ETF volumes", icon: Globe2 },
  { id: "wallet", label: "Wallet scan", sub: "Risk lookup", icon: Wallet },
];

const FALLBACK_MARKETS: MarketRow[] = [
  { symbol: "HYPE", price: "$--", rawPrice: 0, changeLabel: "--", rawChange: 0, oiLabel: "$--", rawOi: 0, volumeLabel: "$--", rawVolume: 0, fundingLabel: "--", rawFunding: 0, fdvLabel: "$--", risk: 0 },
];

const FALLBACK_HISTORY: HistoryPoint[] = Array.from({ length: 60 }, (_, i) => {
  const base = 60 + Math.sin(i / 5) * 2.6 + Math.cos(i / 9) * 1.3 - i * 0.015;
  return { time: Date.now() - (59 - i) * 15 * 60_000, price: base, volume: 1_000_000 + Math.abs(Math.sin(i / 4)) * 2_000_000 };
});

const EMPTY_NFT_STATS: NftStats = { floor: "--", volume24h: "--", totalVolume: "--", owners: "--", sales24h: "--" };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
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
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function shortAddress(address: string) {
  if (!address || address.length < 12) return address || "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function clock(date: Date | null) {
  if (!date) return "--";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function riskScore(changePct: number, funding: number, oi: number, volume: number) {
  const move = Math.abs(changePct || 0) * 2.1;
  const fundingPressure = Math.abs(funding || 0) * 28000;
  const oiPressure = oi > 0 ? Math.log10(oi / 10_000_000 + 1) * 9 : 0;
  const volumePressure = volume > 0 ? Math.log10(volume / 10_000_000 + 1) * 4 : 0;
  return Math.round(clamp(10 + move + fundingPressure + oiPressure + volumePressure, 3, 99));
}

function buildMarkets(payload: unknown): MarketRow[] {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as any;
  const ctxs = tuple[1] as any[];
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  if (!Array.isArray(ctxs) || !universe.length) throw new Error("Bad Hyperliquid market response");
  return universe
    .map((asset: any, index: number) => {
      const ctx = ctxs[index] || {};
      const price = toNumber(ctx.markPx || ctx.midPx || ctx.oraclePx);
      const prev = toNumber(ctx.prevDayPx);
      const funding = toNumber(ctx.funding);
      const oiUnits = toNumber(ctx.openInterest);
      const oi = oiUnits * price;
      const volume = toNumber(ctx.dayNtlVlm);
      const change = prev > 0 && price > 0 ? ((price - prev) / prev) * 100 : 0;
      const fdv = asset.name === "HYPE" && price > 0 ? price * SUPPLY : undefined;
      return {
        symbol: String(asset.name || "--"),
        price: formatUsd(price),
        rawPrice: price,
        changeLabel: formatPercent(change),
        rawChange: change,
        oiLabel: formatUsd(oi),
        rawOi: oi,
        volumeLabel: formatUsd(volume),
        rawVolume: volume,
        fundingLabel: formatPercent(funding * 100, 4),
        rawFunding: funding,
        fdvLabel: fdv ? formatUsd(fdv) : "--",
        rawFdv: fdv,
        risk: riskScore(change, funding, oi, volume),
      };
    })
    .filter((row: MarketRow) => row.rawPrice > 0)
    .sort((a: MarketRow, b: MarketRow) => {
      if (a.symbol === "HYPE") return -1;
      if (b.symbol === "HYPE") return 1;
      return b.rawVolume - a.rawVolume;
    })
    .slice(0, 50);
}

function parseCandles(payload: unknown): HistoryPoint[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.candles) ? (payload as any).candles : [];
  return rows
    .map((candle: any) => ({ time: toNumber(candle.t || candle.time || candle.timestamp), price: toNumber(candle.c || candle.close), volume: toNumber(candle.v || candle.volume) }))
    .filter((row: HistoryPoint) => row.time > 0 && row.price > 0)
    .slice(-96);
}

function parseNftStats(payload: unknown): NftStats {
  const data = payload as any;
  const total = data?.total || {};
  const intervals = Array.isArray(data?.intervals) ? data.intervals : [];
  const oneDay = intervals.find((item: any) => ["one_day", "1d", "day"].includes(String(item.interval))) || {};
  const floor = toNumber(total.floor_price ?? total.floorPrice ?? data?.floor_price);
  const totalVolume = toNumber(total.volume ?? data?.volume);
  const owners = toNumber(total.num_owners ?? total.numOwners ?? data?.num_owners);
  const volume24 = toNumber(oneDay.volume ?? oneDay.volume_diff ?? data?.one_day_volume);
  const sales24 = toNumber(oneDay.sales ?? oneDay.sales_diff ?? data?.one_day_sales);
  return {
    floor: floor ? formatNative(floor, total.floor_price_symbol || "HYPE") : "--",
    volume24h: volume24 ? formatNative(volume24, "HYPE") : "--",
    totalVolume: totalVolume ? formatNative(totalVolume, "HYPE") : "--",
    owners: owners ? owners.toLocaleString("en-US") : "--",
    sales24h: sales24 ? String(Math.round(sales24)) : "--",
  };
}

function parseWallet(payload: unknown, markets: MarketRow[]): WhaleRow[] {
  const data = payload as any;
  const priceMap = new Map(markets.map((row) => [row.symbol, row.rawPrice]));
  const positions = Array.isArray(data?.assetPositions) ? data.assetPositions : [];
  return positions
    .map((item: any) => item.position || item)
    .filter((pos: any) => Math.abs(toNumber(pos.szi)) > 0)
    .map((pos: any) => {
      const coin = String(pos.coin || "--");
      const signed = toNumber(pos.szi);
      const side = signed >= 0 ? "Long" : "Short";
      const pnl = toNumber(pos.unrealizedPnl);
      const current = priceMap.get(coin) || 0;
      const liq = toNumber(pos.liquidationPx);
      const lev = toNumber(pos.leverage?.value || pos.leverage);
      const distance = current > 0 && liq > 0 ? Math.abs((current - liq) / current) * 100 : 999;
      return {
        coin,
        side,
        size: `${Math.abs(signed).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${coin}`,
        notional: formatUsd(toNumber(pos.positionValue)),
        entry: formatUsd(toNumber(pos.entryPx)),
        pnl: `${pnl >= 0 ? "+" : "-"}${formatUsd(Math.abs(pnl))}`,
        rawPnl: pnl,
        liq: liq > 0 ? formatUsd(liq) : "--",
        lev: lev > 0 ? `${lev}x` : "--",
        danger: distance < 7 || lev >= 8 ? "High" : distance < 15 || lev >= 4 ? "Medium" : "Low",
      };
    })
    .sort((a: WhaleRow, b: WhaleRow) => Math.abs(b.rawPnl) - Math.abs(a.rawPnl));
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === "live" ? "Live" : status === "loading" ? "Loading" : status === "fallback" ? "Fallback" : "Error";
  const cls = status === "live" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : status === "loading" ? "border-cyan-200/25 bg-cyan-300/10 text-cyan-100" : status === "fallback" ? "border-amber-200/25 bg-amber-300/10 text-amber-100" : "border-red-300/25 bg-red-400/10 text-red-100";
  return <span className={cn("rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]", cls)}>{label}</span>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[2rem] border border-white/12 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}>{children}</section>;
}

function MetricCard({ label, value, sub, icon: Icon, change }: { label: string; value: string; sub?: string; icon: IconType; change?: number }) {
  const positive = (change || 0) >= 0;
  const Move = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <Panel className="relative min-h-[138px] overflow-hidden p-5">
      <div className="absolute right-4 top-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-cyan-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/40">{label}</p>
      <div className="mt-5 text-3xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/52">
        {typeof change === "number" && Number.isFinite(change) ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-black", positive ? "border-emerald-300/25 bg-emerald-400/12 text-emerald-100" : "border-red-300/25 bg-red-400/12 text-red-100")}>
            <Move className="h-3.5 w-3.5" /> {formatPercent(change)} 24h
          </span>
        ) : null}
        {sub ? <span>{sub}</span> : null}
      </div>
    </Panel>
  );
}

function SparkChart({ points, height = 260, stroke = "#7df9ff" }: { points: number[]; height?: number; stroke?: string }) {
  const width = 900;
  const values = points.filter(Number.isFinite);
  const data = values.length > 1 ? values : [1, 1.1, 1.05, 1.2, 1.18];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const coords = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 32) - 16;
    return [x, y] as const;
  });
  const path = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="hypeArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#hypeArea)" />
      <path d={path} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
    </svg>
  );
}

function BarChart({ rows }: { rows: MarketRow[] }) {
  const max = Math.max(...rows.map((row) => row.rawVolume), 1);
  return (
    <div className="space-y-3">
      {rows.slice(0, 10).map((row) => (
        <div key={row.symbol} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-sm">
          <span className="font-black text-white/80">{row.symbol}</span>
          <div className="h-3 overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200" style={{ width: `${Math.max(4, (row.rawVolume / max) * 100)}%` }} />
          </div>
          <span className="text-right font-bold text-white/65">{row.volumeLabel}</span>
        </div>
      ))}
    </div>
  );
}

function NftArt({ sale }: { sale: NftSale }) {
  const [broken, setBroken] = useState(false);
  if (!sale.image || broken) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#07362f] text-white/45">
        <ImageIcon className="h-8 w-8" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">No image</span>
      </div>
    );
  }
  if (sale.crop === "left-preview") {
    return (
      <div className="h-full w-full overflow-hidden bg-black">
        <img
          src={sale.image}
          alt={sale.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-[200%] max-w-none object-cover object-left-top"
        />
      </div>
    );
  }
  return (
    <img
      src={sale.image}
      alt={sale.name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.035]"
    />
  );
}

function NftCard({ sale, large = false }: { sale: NftSale; large?: boolean }) {
  return (
    <a href={sale.url || OPENSEA_URL} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-cyan-200/15 bg-[#06251f] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-200/35">
      <div className={cn("overflow-hidden bg-black/30", large ? "aspect-square" : "aspect-[4/3]")}> 
        <NftArt sale={sale} />
      </div>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{sale.name}</p>
          <p className="text-xs font-semibold text-white/45">{sale.time}</p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-50">{sale.price}</span>
      </div>
    </a>
  );
}

function NftGrid({ sales, loading, message, max = 12, large = false }: { sales: NftSale[]; loading: boolean; message: string; max?: number; large?: boolean }) {
  if (loading && sales.length === 0) {
    return (
      <div className={cn("grid gap-4", large ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3")}>
        {Array.from({ length: max }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-3xl border border-white/10 bg-white/[0.045]" />)}
      </div>
    );
  }
  if (!sales.length) {
    return (
      <div className="rounded-3xl border border-amber-200/20 bg-amber-300/8 p-6 text-sm text-amber-50/80">
        <p className="font-black text-white">No live Hypurr NFT sales loaded.</p>
        <p className="mt-2">{message}</p>
        <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-black text-white/75">
          OpenSea <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4", large ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3")}>
      {sales.slice(0, max).map((sale) => <NftCard key={sale.id} sale={sale} large={large} />)}
    </div>
  );
}

function Header({ eyebrow, title, description, icon: Icon, status, right }: { eyebrow: string; title: string; description: string; icon: IconType; status?: Status; right?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-100">
          <Icon className="h-4 w-4" /> {eyebrow}
        </div>
        <h1 className="max-w-5xl text-4xl font-black tracking-[-0.06em] text-white md:text-6xl xl:text-7xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-cyan-50/72">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {status ? <StatusBadge status={status} /> : null}
        {right}
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.22em] text-white/38">{children}</th>;
}

function TableCell({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("border-t border-white/8 px-4 py-4 text-sm font-semibold text-white/72", className)}>{children}</td>;
}

export default function App() {
  const [view, setView] = useState<ViewId>("overview");
  const [markets, setMarkets] = useState<MarketRow[]>(FALLBACK_MARKETS);
  const [marketStatus, setMarketStatus] = useState<Status>("loading");
  const [history, setHistory] = useState<HistoryPoint[]>(FALLBACK_HISTORY);
  const [nftStats, setNftStats] = useState<NftStats>(EMPTY_NFT_STATS);
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [nftStatus, setNftStatus] = useState<Status>("loading");
  const [nftMessage, setNftMessage] = useState("Loading OpenSea Hypurr sales.");
  const [tapeStatus, setTapeStatus] = useState<Status>("loading");
  const [tapeSummary, setTapeSummary] = useState<TapeSummary | null>(null);
  const [clusters, setClusters] = useState<TapeCluster[]>([]);
  const [trades, setTrades] = useState<TapeTrade[]>([]);
  const [buyback, setBuyback] = useState<BuybackData>({});
  const [buybackStatus, setBuybackStatus] = useState<Status>("loading");
  const [hlp, setHlp] = useState<VaultRow | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [vaultStatus, setVaultStatus] = useState<Status>("loading");
  const [tradfi, setTradfi] = useState<TradFiProduct[]>([]);
  const [tradfiVolume, setTradfiVolume] = useState("$--");
  const [tradfiStatus, setTradfiStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const [wallet, setWallet] = useState("");
  const [walletRows, setWalletRows] = useState<WhaleRow[]>([]);
  const [walletStatus, setWalletStatus] = useState<Status>("fallback");
  const [walletMessage, setWalletMessage] = useState("Paste a wallet address to scan open positions.");
  const [last, setLast] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadMarkets() {
      try {
        setMarketStatus((s) => (s === "live" ? "live" : "loading"));
        const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) });
        if (!res.ok) throw new Error("market error");
        const rows = buildMarkets(await res.json());
        if (mounted && rows.length) {
          setMarkets(rows);
          setMarketStatus("live");
          setLast(new Date());
        }
      } catch {
        if (mounted) setMarketStatus("fallback");
      }
    }
    loadMarkets();
    const id = window.setInterval(loadMarkets, 20_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadHistory() {
      try {
        const end = Date.now();
        const start = end - 24 * 60 * 60 * 1000;
        const res = await fetch("/api/hyperliquid/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "candleSnapshot", req: { coin: "HYPE", interval: "15m", startTime: start, endTime: end } }) });
        if (!res.ok) throw new Error("history error");
        const points = parseCandles(await res.json());
        if (mounted && points.length > 3) setHistory(points);
      } catch {
        if (mounted) setHistory(FALLBACK_HISTORY);
      }
    }
    loadHistory();
    const id = window.setInterval(loadHistory, 60_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadNfts() {
      try {
        setNftStatus((s) => (s === "live" ? "live" : "loading"));
        const [statsResult, eventsResult] = await Promise.allSettled([fetch("/api/opensea/stats"), fetch("/api/opensea/events")]);
        if (statsResult.status === "fulfilled" && statsResult.value.ok) setNftStats(parseNftStats(await statsResult.value.json()));
        if (eventsResult.status !== "fulfilled" || !eventsResult.value.ok) throw new Error("OpenSea events unavailable");
        const payload = await eventsResult.value.json();
        const sales = Array.isArray(payload.sales) ? payload.sales as NftSale[] : [];
        if (!sales.length) throw new Error(payload.error || "No live sales returned");
        if (mounted) {
          setNftSales(sales);
          setNftStatus("live");
          setNftMessage(payload.hasApiKey ? "Live OpenSea feed loaded." : "OpenSea feed loaded without API key. Add OPENSEA_API_KEY for reliability.");
        }
      } catch (error) {
        if (mounted) {
          setNftStatus("error");
          setNftSales([]);
          setNftMessage(error instanceof Error ? error.message : "NFT feed failed.");
        }
      }
    }
    loadNfts();
    const id = window.setInterval(loadNfts, 90_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadTape() {
      try {
        const res = await fetch("/api/hyperliquid/twaps");
        if (!res.ok) throw new Error("tape error");
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.error || "tape error");
        if (mounted) {
          setTapeSummary(payload.summary || null);
          setClusters(Array.isArray(payload.clusters) ? payload.clusters : []);
          setTrades(Array.isArray(payload.trades) ? payload.trades : []);
          setTapeStatus("live");
        }
      } catch {
        if (mounted) setTapeStatus("error");
      }
    }
    loadTape();
    const id = window.setInterval(loadTape, 8_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadExtras() {
      try {
        const res = await fetch("/api/hyperliquid/buybacks");
        const payload = await res.json();
        if (mounted) { setBuyback(payload || {}); setBuybackStatus(payload.ok ? "live" : "fallback"); }
      } catch { if (mounted) setBuybackStatus("fallback"); }
      try {
        const res = await fetch("/api/hyperliquid/vaults");
        const payload = await res.json();
        if (mounted) { setHlp(payload.hlp || null); setVaults(Array.isArray(payload.vaults) ? payload.vaults : []); setVaultStatus(payload.ok ? "live" : "fallback"); }
      } catch { if (mounted) setVaultStatus("fallback"); }
      try {
        const res = await fetch("/api/tradfi/flows");
        const payload = await res.json();
        if (mounted) { setTradfi(Array.isArray(payload.products) ? payload.products : []); setTradfiVolume(payload.totalDollarVolumeLabel || "$--"); setTradfiStatus(payload.ok ? "live" : "fallback"); }
      } catch { if (mounted) setTradfiStatus("fallback"); }
    }
    loadExtras();
    const id = window.setInterval(loadExtras, 60_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  const hype = useMemo(() => markets.find((m) => m.symbol === "HYPE") || markets[0] || FALLBACK_MARKETS[0], [markets]);
  const totalOi = useMemo(() => markets.reduce((sum, row) => sum + row.rawOi, 0), [markets]);
  const filtered = useMemo(() => markets.filter((row) => row.symbol.toLowerCase().includes(query.toLowerCase())), [markets, query]);
  const chartStroke = hype.rawChange >= 0 ? "#86efac" : "#fca5a5";
  const afUsd = buyback.estimatedBuybackUsd24hLabel || (hype.rawVolume ? formatUsd(hype.rawVolume * 0.00035 * 0.95) : "$--");
  const afHype = buyback.estimatedBuybackHype24hLabel || "-- HYPE";

  async function scanWallet() {
    const address = wallet.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletStatus("error");
      setWalletMessage("Invalid address. Paste a full 0x EVM wallet.");
      setWalletRows([]);
      return;
    }
    try {
      setWalletStatus("loading");
      const res = await fetch("/api/hyperliquid/whales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: address }) });
      const payload = await res.json();
      const rows = parseWallet(payload, markets);
      setWalletRows(rows);
      setWalletStatus("live");
      setWalletMessage(rows.length ? `${rows.length} open positions found for ${shortAddress(address)}.` : `No open perp position found for ${shortAddress(address)}.`);
    } catch {
      setWalletStatus("error");
      setWalletMessage("Wallet scan failed.");
      setWalletRows([]);
    }
  }

  const Overview = (
    <>
      <Header
        icon={Radio}
        status={marketStatus}
        eyebrow="HYPE builder console"
        title="HYPE market, buybacks, NFTs and flow tape"
        description="A sharper Hyperliquid analytics console: HYPE price/FDV, open interest, buyback pressure, live HYPE tape, TradFi volume and Hypurr NFT sales."
        right={<StatusBadge status={nftStatus} />}
      />
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard icon={hype.rawChange >= 0 ? ArrowUpRight : ArrowDownRight} label="HYPE price" value={hype.price} sub={`OI ${hype.oiLabel}`} change={hype.rawChange} />
        <MetricCard icon={Zap} label="FDV" value={hype.fdvLabel} sub="1B total supply" />
        <MetricCard icon={Activity} label="24h perp volume" value={hype.volumeLabel} sub={`Total ${formatUsd(markets.reduce((s, r) => s + r.rawVolume, 0))}`} />
        <MetricCard icon={Flame} label="Buyback pressure" value={afUsd} sub={afHype} />
      </div>
      <div className="mt-5 grid gap-5 2xl:grid-cols-[1.35fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">HYPE 24h market map</h2>
              <p className="text-sm font-medium text-white/52">Live candles when available. Open interest and funding below the curve.</p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-black", hype.rawChange >= 0 ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-red-300/25 bg-red-400/10 text-red-100")}>{hype.changeLabel}</span>
          </div>
          <div className="h-[300px] rounded-3xl border border-white/8 bg-black/20 p-4"><SparkChart points={history.map((p) => p.price)} height={260} stroke={chartStroke} /></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"><p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Perp OI</p><p className="mt-2 text-2xl font-black">{hype.oiLabel}</p><p className="text-xs text-white/45">{totalOi > 0 ? `${((hype.rawOi / totalOi) * 100).toFixed(1)}% of tracked OI` : "HYPE share"}</p></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"><p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Funding</p><p className={cn("mt-2 text-2xl font-black", hype.rawFunding >= 0 ? "text-emerald-100" : "text-red-100")}>{hype.fundingLabel}</p><p className="text-xs text-white/45">Longs pay if positive</p></div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"><p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Risk heat</p><p className="mt-2 text-2xl font-black">{hype.risk}/100</p><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${hype.risk}%` }} /></div></div>
          </div>
        </Panel>
        <Panel>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-black">Latest Hypurr NFT sales</h2><p className="text-sm text-white/52">Fast OpenSea feed. Preview images are cropped to the art.</p></div>
            <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/75">OpenSea <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
          <NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} max={4} large />
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel><div className="flex items-center justify-between"><h3 className="text-lg font-black">HYPE tape</h3><StatusBadge status={tapeStatus} /></div><p className="mt-4 text-4xl font-black">{tapeSummary?.netLabel || "--"}</p><p className="mt-2 text-sm text-white/52">Net flow, last 10 minutes · {tapeSummary?.tradeCount || 0} trades</p></Panel>
        <Panel><div className="flex items-center justify-between"><h3 className="text-lg font-black">TradFi traded value</h3><StatusBadge status={tradfiStatus} /></div><p className="mt-4 text-4xl font-black">{tradfiVolume}</p><p className="mt-2 text-sm text-white/52">ETF/ETP daily trading volume where public ticker data is available.</p></Panel>
        <Panel><div className="flex items-center justify-between"><h3 className="text-lg font-black">HLP TVL</h3><StatusBadge status={vaultStatus} /></div><p className="mt-4 text-4xl font-black">{hlp?.tvlLabel || "$--"}</p><p className="mt-2 text-sm text-white/52">Main Hyperliquid liquidity vault block.</p></Panel>
      </div>
    </>
  );

  const Markets = (
    <>
      <Header icon={BarChart3} status={marketStatus} eyebrow="Perp markets" title="HYPE-first market board" description="FDV, open interest, volume and funding in one table, with HYPE pinned first." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel><h2 className="text-xl font-black">Top market volume</h2><p className="mb-5 mt-1 text-sm text-white/52">HYPE pinned first, then highest 24h notional volume.</p><BarChart rows={markets} /></Panel>
        <Panel><h2 className="text-xl font-black">Core HYPE metrics</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><MetricCard icon={Zap} label="FDV" value={hype.fdvLabel} sub="1B supply" /><MetricCard icon={Activity} label="Open Interest" value={hype.oiLabel} sub="perp market" /></div></Panel>
      </div>
      <Panel className="mt-5 overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-xl font-black">Market table</h2><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker" className="rounded-full border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm outline-none focus:border-cyan-200/40" /></div></div>
        <div className="overflow-auto"><table className="w-full min-w-[900px]"><thead><tr><TableHeader>Coin</TableHeader><TableHeader>Price</TableHeader><TableHeader>24h</TableHeader><TableHeader>OI</TableHeader><TableHeader>Volume</TableHeader><TableHeader>Funding</TableHeader><TableHeader>FDV</TableHeader><TableHeader>Risk</TableHeader></tr></thead><tbody>{filtered.map((row) => <tr key={row.symbol} className="hover:bg-white/[0.03]"><TableCell className="font-black text-white">{row.symbol}</TableCell><TableCell>{row.price}</TableCell><TableCell className={row.rawChange >= 0 ? "text-emerald-100" : "text-red-100"}>{row.changeLabel}</TableCell><TableCell>{row.oiLabel}</TableCell><TableCell>{row.volumeLabel}</TableCell><TableCell className={row.rawFunding >= 0 ? "text-emerald-100" : "text-red-100"}>{row.fundingLabel}</TableCell><TableCell>{row.fdvLabel}</TableCell><TableCell>{row.risk}/100</TableCell></tr>)}</tbody></table></div>
      </Panel>
    </>
  );

  const Buybacks = (
    <>
      <Header icon={Flame} status={buybackStatus} eyebrow="Assistance Fund" title="Buyback pressure monitor" description="Directional pressure from live Hyperliquid volume. It does not pretend to be an exact indexed Assistance Fund fill feed." />
      <div className="grid gap-5 xl:grid-cols-3"><MetricCard icon={Flame} label="Est. AF pressure" value={afUsd} sub={afHype} /><MetricCard icon={Activity} label="Total perp volume" value={buyback.totalVolume24hLabel || "$--"} sub="24h notional" /><MetricCard icon={BarChart3} label="HYPE volume" value={buyback.hypeVolume24hLabel || hype.volumeLabel} sub="24h HYPE perp" /></div>
      <Panel className="mt-5"><h2 className="text-xl font-black">Method note</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-white/62">{buyback.note || "Exact daily buybacks require an indexed Assistance Fund transaction source. This panel is useful as a live pressure estimate, not as audited AF flow."}</p><p className="mt-4 text-xs text-white/40">AF address: {buyback.assistanceFundAddress || "--"}</p></Panel>
    </>
  );

  const Tape = (
    <>
      <Header icon={Clock3} status={tapeStatus} eyebrow="HYPE tape" title="Near real-time HYPE flow" description="Recent HYPE trades and clustered slices that look like TWAP-style execution." />
      <div className="grid gap-5 xl:grid-cols-3"><MetricCard icon={ArrowUpRight} label="Buy flow 10m" value={tapeSummary?.buyLabel || "$--"} sub={`${tapeSummary?.tradeCount || 0} trades`} /><MetricCard icon={ArrowDownRight} label="Sell flow 10m" value={tapeSummary?.sellLabel || "$--"} sub="recent tape" /><MetricCard icon={LineChart} label="Net flow 10m" value={tapeSummary?.netLabel || "$--"} sub={tapeSummary?.netSide || "--"} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><Panel><h2 className="text-xl font-black">Detected clusters</h2><div className="mt-4 space-y-3">{clusters.length ? clusters.map((row, i) => <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex justify-between"><span className={cn("font-black", row.side === "Buy" ? "text-emerald-100" : "text-red-100")}>{row.side}</span><span className="font-black">{row.notionalLabel}</span></div><div className="mt-2 grid grid-cols-4 gap-2 text-xs text-white/50"><span>{row.slices} slices</span><span>{row.size}</span><span>{row.avgPrice}</span><span>{row.lastTrade}</span></div></div>) : <p className="text-sm text-white/55">No clustered HYPE flow detected in the latest window.</p>}</div></Panel><Panel><h2 className="text-xl font-black">Recent HYPE trades</h2><div className="mt-4 max-h-[520px] overflow-auto"><table className="w-full"><thead><tr><TableHeader>Side</TableHeader><TableHeader>Notional</TableHeader><TableHeader>Price</TableHeader><TableHeader>Time</TableHeader></tr></thead><tbody>{trades.slice(0, 24).map((trade) => <tr key={trade.id}><TableCell className={trade.side === "Buy" ? "text-emerald-100" : "text-red-100"}>{trade.side}</TableCell><TableCell>{trade.notionalLabel}</TableCell><TableCell>{trade.price}</TableCell><TableCell>{trade.timeLabel}</TableCell></tr>)}</tbody></table></div></Panel></div>
    </>
  );

  const Nfts = (
    <>
      <Header icon={ImageIcon} status={nftStatus} eyebrow="Hypurr NFT tape" title="Hypurr sales, floor and collector flow" description="Latest sales are loaded from OpenSea. Preview images are cropped to remove marketplace text/price panels." right={<a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-black text-white/75">OpenSea <ExternalLink className="h-4 w-4" /></a>} />
      <div className="mb-5 grid gap-4 md:grid-cols-5"><MetricCard icon={ImageIcon} label="Floor" value={nftStats.floor} sub="OpenSea" /><MetricCard icon={Activity} label="24h volume" value={nftStats.volume24h} sub="sales volume" /><MetricCard icon={BarChart3} label="Total volume" value={nftStats.totalVolume} sub="all-time" /><MetricCard icon={Wallet} label="Owners" value={nftStats.owners} sub="holders" /><MetricCard icon={Zap} label="24h sales" value={nftStats.sales24h} sub="count" /></div>
      <Panel><h2 className="mb-5 text-xl font-black">Latest real sales</h2><NftGrid sales={nftSales} loading={nftStatus === "loading"} message={nftMessage} max={12} /></Panel>
    </>
  );

  const Hlp = (
    <>
      <Header icon={Layers} status={vaultStatus} eyebrow="Vaults" title="HLP-first vault monitor" description="Focus on the useful vault signal first: HLP TVL and top vaults, not random filler data." />
      <div className="grid gap-5 xl:grid-cols-3"><MetricCard icon={Layers} label="HLP TVL" value={hlp?.tvlLabel || "$--"} sub={hlp?.status || "vaultSummaries"} /><MetricCard icon={ShieldCheck} label="Top vaults" value={String(vaults.length)} sub="loaded" /><MetricCard icon={Wallet} label="HLP leader" value={hlp?.leader ? shortAddress(hlp.leader) : "--"} sub={hlp?.vaultAddress ? shortAddress(hlp.vaultAddress) : "vault"} /></div>
      <Panel className="mt-5 overflow-hidden"><h2 className="text-xl font-black">Vault table</h2><div className="mt-4 overflow-auto"><table className="w-full min-w-[780px]"><thead><tr><TableHeader>Vault</TableHeader><TableHeader>TVL</TableHeader><TableHeader>Status</TableHeader><TableHeader>Age</TableHeader><TableHeader>Leader</TableHeader><TableHeader>Address</TableHeader></tr></thead><tbody>{vaults.map((row) => <tr key={row.vaultAddress || row.name}><TableCell className="font-black text-white">{row.name}</TableCell><TableCell>{row.tvlLabel}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.ageDays ? `${row.ageDays}d` : "--"}</TableCell><TableCell>{shortAddress(row.leader)}</TableCell><TableCell>{shortAddress(row.vaultAddress)}</TableCell></tr>)}</tbody></table></div></Panel>
    </>
  );

  const Tradfi = (
    <>
      <Header icon={Globe2} status={tradfiStatus} eyebrow="TradFi watch" title="HYPE ETF / ETP daily trading volume" description="A practical TradFi tab: live ticker volume/value where public quote data is exposed. True creations/redemptions can be wired through a custom JSON source." />
      <div className="mb-5 grid gap-5 xl:grid-cols-3"><MetricCard icon={Globe2} label="Total traded value" value={tradfiVolume} sub="public tickers" /><MetricCard icon={Activity} label="Products tracked" value={String(tradfi.length)} sub="BHYP, THYP, TXXH, HYPE, LIQD" /><MetricCard icon={ShieldCheck} label="Net flow" value="Source-gated" sub="issuer/AP feed required" /></div>
      <Panel className="overflow-hidden"><h2 className="text-xl font-black">Products</h2><div className="mt-4 grid gap-4 xl:grid-cols-2">{tradfi.map((item) => <a key={item.symbol} href={item.url} target="_blank" rel="noreferrer" className="rounded-3xl border border-white/10 bg-black/18 p-5 transition hover:border-cyan-200/30 hover:bg-white/[0.05]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100">{item.symbol}</p><h3 className="mt-2 text-lg font-black">{item.name}</h3><p className="text-sm text-white/45">{item.issuer} · {item.venue}</p></div><ExternalLink className="h-4 w-4 text-white/35" /></div><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-xs text-white/38">Price</p><p className="font-black">{item.price}</p></div><div><p className="text-xs text-white/38">Daily value</p><p className="font-black">{item.dollarVolumeLabel}</p></div><div><p className="text-xs text-white/38">Shares</p><p className="font-black">{item.shareVolume}</p></div></div><p className="mt-4 text-xs text-white/38">{item.flowNote}</p></a>)}</div></Panel>
    </>
  );

  const WalletScan = (
    <>
      <Header icon={Wallet} status={walletStatus} eyebrow="Wallet scan" title="Hyperliquid address risk lookup" description="Read-only scanner for open perp positions, not wallet connect and not trading execution." />
      <Panel><div className="flex flex-col gap-3 md:flex-row"><input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." className="min-h-[54px] flex-1 rounded-2xl border border-white/10 bg-black/20 px-5 text-white outline-none focus:border-cyan-200/40" /><button onClick={scanWallet} className="rounded-2xl border border-cyan-200/25 bg-cyan-300/12 px-7 font-black text-cyan-50">Scan</button></div><p className="mt-3 text-sm text-white/52">{walletMessage}</p></Panel>
      <Panel className="mt-5 overflow-hidden"><h2 className="text-xl font-black">Open positions</h2><div className="mt-4 overflow-auto"><table className="w-full min-w-[850px]"><thead><tr><TableHeader>Coin</TableHeader><TableHeader>Side</TableHeader><TableHeader>Size</TableHeader><TableHeader>Notional</TableHeader><TableHeader>Entry</TableHeader><TableHeader>PNL</TableHeader><TableHeader>Liq.</TableHeader><TableHeader>Lev.</TableHeader><TableHeader>Risk</TableHeader></tr></thead><tbody>{walletRows.length ? walletRows.map((row, i) => <tr key={`${row.coin}-${i}`}><TableCell className="font-black text-white">{row.coin}</TableCell><TableCell>{row.side}</TableCell><TableCell>{row.size}</TableCell><TableCell>{row.notional}</TableCell><TableCell>{row.entry}</TableCell><TableCell className={row.rawPnl >= 0 ? "text-emerald-100" : "text-red-100"}>{row.pnl}</TableCell><TableCell>{row.liq}</TableCell><TableCell>{row.lev}</TableCell><TableCell>{row.danger}</TableCell></tr>) : <tr><TableCell colSpan={9}>No wallet scanned yet.</TableCell></tr>}</tbody></table></div></Panel>
    </>
  );

  const content: Record<ViewId, React.ReactNode> = { overview: Overview, markets: Markets, buybacks: Buybacks, tape: Tape, nfts: Nfts, hlp: Hlp, tradfi: Tradfi, wallet: WalletScan };

  return (
    <main className="min-h-screen text-white">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-white/10 bg-[#021713]/92 p-5 backdrop-blur-xl xl:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-100"><Zap className="h-5 w-5" /></div>
          <div><p className="text-lg font-black uppercase tracking-[0.22em]">HypurrScope</p><p className="text-xs text-white/45">builder analytics console</p></div>
        </div>
        <nav className="space-y-2">{NAV.map((item) => { const Icon = item.icon; const active = view === item.id; return <button key={item.id} onClick={() => setView(item.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", active ? "border-cyan-200/30 bg-cyan-200/10 text-white" : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/85")}><Icon className="h-5 w-5" /><span><span className="block text-sm font-black">{item.label}</span><span className="block text-xs font-semibold text-white/38">{item.sub}</span></span></button>; })}</nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-xs text-white/45">
          <div className="mb-2 flex items-center justify-between"><span className="font-black text-white/70">Refresh</span><RefreshCw className="h-4 w-4" /></div>
          Markets 20s · Tape 8s · NFTs 90s<br />Last market update: {clock(last)}
        </div>
      </aside>
      <div className="xl:pl-72">
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#021713]/90 px-4 py-3 backdrop-blur-xl xl:hidden">
          <div className="mb-3 flex items-center justify-between"><span className="font-black uppercase tracking-[0.2em]">HypurrScope</span><StatusBadge status={marketStatus} /></div>
          <div className="flex gap-2 overflow-x-auto pb-1">{NAV.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={cn("shrink-0 rounded-full border px-4 py-2 text-xs font-black", view === item.id ? "border-cyan-200/35 bg-cyan-200/10" : "border-white/10 bg-white/[0.04] text-white/55")}>{item.label}</button>)}</div>
        </div>
        <div className="mx-auto max-w-[1780px] px-4 py-8 md:px-8 xl:px-10 xl:py-12">{content[view]}</div>
      </div>
    </main>
  );
}

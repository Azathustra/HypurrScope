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

type MarketRow = { symbol: string; price: string; rawPrice: number; change: string; rawChange: number; oi: string; rawOi: number; volumeLabel: string; rawVolume: number; funding: string; rawFunding: number; fdv?: string; rawFdv?: number; risk: number; };
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
function formatUsd(value: number) { if (!Number.isFinite(value) || value <= 0) return "$--"; if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`; if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`; if (value >= 1_000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`; if (value >= 1) return `$${value.toFixed(2)}`; return `$${value.toPrecision(3)}`; }
function formatNative(value: number, suffix = "HYPE") { if (!Number.isFinite(value) || value <= 0) return `-- ${suffix}`; if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${suffix}`; if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${suffix}`; if (value >= 100) return `${value.toFixed(0)} ${suffix}`; if (value >= 1) return `${value.toFixed(2)} ${suffix}`; return `${value.toPrecision(3)} ${suffix}`; }
function formatPercent(value: number, digits = 2) { if (!Number.isFinite(value)) return "--"; const sign = value > 0 ? "+" : ""; return `${sign}${value.toFixed(digits)}%`; }
function formatClock(date: Date | null) { return date ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--"; }
function shortAddress(address: string) { return !address || address.length < 12 ? address || "" : `${address.slice(0, 6)}...${address.slice(-4)}`; }
function isValidEvmAddress(address: string) { return /^0x[a-fA-F0-9]{40}$/.test(address.trim()); }
function calculateRiskScore(changePct: number, funding: number, openInterest: number, volume: number) { const move = Math.abs(changePct || 0); const fundingPressure = Math.abs(funding || 0) * 30_000; const oiPressure = openInterest > 0 ? Math.log10(openInterest / 10_000_000 + 1) * 12 : 0; const volumePressure = volume > 0 ? Math.log10(volume / 10_000_000 + 1) * 5 : 0; return Math.round(clamp(12 + move * 2.4 + fundingPressure + oiPressure + volumePressure, 5, 99)); }
function buildMarketRowsFromHyperliquid(payload: unknown): MarketRow[] { const tuple = Array.isArray(payload) ? payload : []; const meta = tuple[0] as any; const assetContexts = tuple[1] as any; if (!meta?.universe || !Array.isArray(assetContexts)) throw new Error("Unexpected Hyperliquid response"); return meta.universe.map((asset: any, index: number) => { const ctx = assetContexts[index] || {}; const mark = toNumber(ctx.markPx || ctx.midPx || ctx.oraclePx); const prev = toNumber(ctx.prevDayPx); const funding = toNumber(ctx.funding); const oiUnits = toNumber(ctx.openInterest); const rawOi = oiUnits * mark; const rawVolume = toNumber(ctx.dayNtlVlm); const rawChange = prev > 0 && mark > 0 ? ((mark - prev) / prev) * 100 : 0; const isHype = asset.name === "HYPE"; const rawFdv = isHype ? mark * HYPE_TOTAL_SUPPLY : undefined; return { symbol: asset.name, price: formatUsd(mark), rawPrice: mark, change: formatPercent(rawChange, 2), rawChange, oi: formatUsd(rawOi), rawOi, volumeLabel: formatUsd(rawVolume), rawVolume, funding: formatPercent(funding * 100, 4), rawFunding: funding, fdv: rawFdv ? formatUsd(rawFdv) : "--", rawFdv, risk: calculateRiskScore(rawChange, funding, rawOi, rawVolume) } satisfies MarketRow; }).filter((row: MarketRow) => row.symbol && row.rawPrice > 0).sort((a: MarketRow, b: MarketRow) => a.symbol === "HYPE" ? -1 : b.symbol === "HYPE" ? 1 : b.rawOi - a.rawOi).slice(0, 40); }
function parseHistory(payload: unknown): HistoryPoint[] { const rows = Array.isArray((payload as any)?.candles) ? (payload as any).candles : Array.isArray(payload) ? payload : []; return rows.map((row: any) => ({ time: toNumber(row.t || row.time || row.timestamp) || Date.now(), price: toNumber(row.c || row.close || row.price), volume: toNumber(row.v || row.volume || row.baseVolume || row.natlVolume) })).filter((point: HistoryPoint) => point.price > 0).slice(-120); }
function parseTradeRows(payload: unknown): TradeRow[] { const rows = Array.isArray((payload as any)?.trades) ? (payload as any).trades : Array.isArray(payload) ? payload : []; return rows.map((trade: any, index: number) => { const side = String(trade.side || trade.dir || trade.direction || trade.isBuy || "buy").toLowerCase().includes("sell") ? "Sell" : "Buy"; const price = toNumber(trade.px || trade.price); const size = toNumber(trade.sz || trade.size || trade.quantity); const notional = price * size; const timeMs = toNumber(trade.time || trade.timestamp || trade.t || 0); const timeLabel = timeMs ? new Date(timeMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : `#${index + 1}`; return { id: String(trade.id || trade.hash || `${index}`), side, price: formatUsd(price), size: formatNative(size), notionalLabel: formatUsd(notional), timeLabel, rawNotional: notional } satisfies TradeRow; }).filter((trade: TradeRow) => trade.rawNotional && trade.rawNotional > 0).slice(0, 24); }
function parseNftStats(payload: any): NftStats { if (!payload) return EMPTY_NFT_STATS; return { floor: payload.floor ? formatUsd(toNumber(payload.floor)) : "--", volume24h: payload.volume24h ? formatUsd(toNumber(payload.volume24h)) : "--", totalVolume: payload.totalVolume ? formatUsd(toNumber(payload.totalVolume)) : "--", listed: payload.listed ? `${toNumber(payload.listed).toFixed(0)}` : "--", owners: payload.owners ? `${toNumber(payload.owners).toFixed(0)}` : "--", sales24h: payload.sales24h ? `${toNumber(payload.sales24h).toFixed(0)}` : "--" }; }
function parseNftSales(payload: unknown): NftSale[] { const rows = Array.isArray((payload as any)?.sales) ? (payload as any).sales : Array.isArray(payload) ? payload : []; return rows.map((sale: any, index: number) => ({ id: String(sale.id || index), name: sale.name || sale.tokenId || `Hypurr #${sale.tokenId || index + 1}`, price: sale.price ? formatUsd(toNumber(sale.price)) : "--", usd: sale.usd ? formatUsd(toNumber(sale.usd)) : undefined, time: sale.time || sale.timestamp || "recent", image: sale.image || sale.imageUrl, url: sale.url || sale.link })).slice(0, 12); }
function parseVaultRows(payload: unknown): VaultRow[] { const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.vaults) ? (payload as any).vaults : []; return rows.map((vault: any, index: number) => ({ name: vault.name || vault.label || `Vault ${index + 1}`, aum: vault.aum ? formatUsd(toNumber(vault.aum)) : "--", rawAum: toNumber(vault.aum), apr: vault.apr ? formatPercent(toNumber(vault.apr), 1) : "--", score: clamp(Math.round(toNumber(vault.score) || 50), 0, 100), status: vault.status || "Live", leader: vault.leader, age: vault.age })).slice(0, 20); }
function parseFlows(payload: unknown): FlowRow[] { const rows = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.items) ? (payload as any).items : []; return rows.map((item: any, index: number) => ({ name: item.name || `Flow ${index + 1}`, ticker: item.ticker || item.symbol || "--", venue: item.venue || item.market || "--", price: item.price ? formatUsd(toNumber(item.price)) : undefined, change: item.change ? formatPercent(toNumber(item.change), 2) : undefined, volume: item.volume ? formatUsd(toNumber(item.volume)) : undefined, dollarVolume: item.dollarVolume ? formatUsd(toNumber(item.dollarVolume)) : undefined, aum: item.aum ? formatUsd(toNumber(item.aum)) : undefined, fee: item.fee ? formatUsd(toNumber(item.fee)) : undefined, status: item.status || "Live", url: item.url, updatedAt: item.updatedAt || item.time })).slice(0, 20); }
function parseWhales(payload: unknown): WhaleRow[] { const rows = Array.isArray((payload as any)?.positions) ? (payload as any).positions : Array.isArray(payload) ? payload : []; return rows.map((item: any) => ({ coin: item.coin || item.asset || "--", side: item.side || item.direction || "--", size: item.size || "--", notional: item.notional || "--", entry: item.entry || "--", pnl: item.pnl || "--", rawPnl: toNumber(item.rawPnl || item.pnl), liquidation: item.liquidation || "--", leverage: item.leverage || "--", danger: (item.danger || "Watch") as any })).slice(0, 20); }

function MiniSpark({ points }: { points: HistoryPoint[] }) { const path = useMemo(() => { if (!points.length) return ""; const values = points.map(p => p.price); const min = Math.min(...values); const max = Math.max(...values); const w = 100; const h = 28; return points.map((p, i) => { const x = (i / Math.max(points.length - 1, 1)) * w; const y = h - ((p.price - min) / Math.max(max - min, 1)) * h; return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' '); }, [points]); return <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 28 }}><path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /><path d={`${path} L 100 28 L 0 28 Z`} fill="rgba(60,242,201,0.08)" /></svg>; }

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [markets, setMarkets] = useState<MarketRow[]>(FALLBACK_MARKETS);
  const [history, setHistory] = useState<HistoryPoint[]>(FALLBACK_HISTORY);
  const [nftStats, setNftStats] = useState<NftStats>(EMPTY_NFT_STATS);
  const [buyback, setBuyback] = useState<BuybackData>(EMPTY_BUYBACK);
  const [vaults, setVaults] = useState<VaultRow[]>(FALLBACK_VAULTS);
  const [flows, setFlows] = useState<FlowRow[]>(FALLBACK_FLOWS);
  const [whales, setWhales] = useState<WhaleRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [nftSales, setNftSales] = useState<NftSale[]>([]);
  const [walletInput, setWalletInput] = useState("");
  const [walletError, setWalletError] = useState("");
  const [walletSummary, setWalletSummary] = useState<string>("Paste a wallet to inspect risk exposure.");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { const timer = setTimeout(() => { setLastUpdated(new Date()); }, 350); return () => clearTimeout(timer); }, []);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">HypurrScope</div>
          <h1>Risk terminal</h1>
          <p>Cleaner contrast, sharper hierarchy, easier scan.</p>
        </div>
        <nav className="nav-group">{NAV_ITEMS.map((item, index) => (<button key={item.id} className={`nav-item ${index === 0 ? "active" : ""}`}><strong>{item.label}</strong><span>{item.description}</span></button>))}</nav>
        <p className="footer-note">This is the cleaned version of your existing structure, without the off-topic valuation card from your screenshot.</p>
      </aside>
      <section className="main">
        <div className="topbar">
          <div><div className="label">Live console</div><h2 style={{ margin: '6px 0 0', fontSize: 28 }}>Hyperliquid risk dashboard</h2></div>
          <a className="btn btn-secondary" href="https://hypurrscope.xyz/" target="_blank" rel="noopener noreferrer">Open live site <ExternalLink size={16} style={{ marginLeft: 8 }} /></a>
        </div>
        <div className="hero">
          <div className="panel hero-card">
            <div className="kicker"><ShieldAlert size={14} /> Cleaner redesign</div>
            <h2>Same structure, better DA.</h2>
            <p>This version keeps the old dashboard logic and removes the unrelated premium chart card from your screenshot. It makes the whole site feel more coherent, darker, and more readable.</p>
            <div className="hero-actions"><button className="btn btn-primary">Keep the structure</button><button className="btn btn-secondary">Keep the DA</button></div>
          </div>
          <div className="panel hero-card">
            <div className="section-header"><div><h3>Wallet monitor</h3><p>Fast lookup box with cleaner focus states</p></div></div>
            <div className="wallet-box"><input placeholder="Paste a wallet address" value={walletInput} onChange={e=>setWalletInput(e.target.value)} /><button className="btn btn-primary"><Search size={16} style={{ marginRight: 8 }} /> Scan</button></div>
            <div className="footer-note">{walletSummary}</div>
          </div>
        </div>
        <div className="stat-grid">
          <div className="panel stat-card"><div className="label">Crowded risk</div><div className="value">72 / 100</div><div className="delta down">Stress rising across HYPE perps</div></div>
          <div className="panel stat-card"><div className="label">Whale activity</div><div className="value">$8.9M</div><div className="delta up">Large positioning over last hour</div></div>
          <div className="panel stat-card"><div className="label">Vault drawdown</div><div className="value">-3.4%</div><div className="delta warn">Pressure in highest-yield strategies</div></div>
        </div>
        <div className="grid-2">
          <div className="panel content-card"><div className="section-header"><div><h3>Market table</h3><p>Same structure, cleaner contrast</p></div></div><table className="table"><thead><tr><th>Asset</th><th>Price</th><th>24h</th><th>Open interest</th><th>Risk</th></tr></thead><tbody>{markets.map((row)=>(<tr key={row.symbol}><td><strong>{row.symbol}</strong></td><td>{row.price}</td><td className={row.change.startsWith('-') ? 'muted' : ''}>{row.change}</td><td>{row.oi}</td><td><span className={`risk-pill ${row.risk > 66 ? 'risk-high' : row.risk > 45 ? 'risk-medium' : 'risk-low'}`}>{row.risk}</span></td></tr>))}</tbody></table></div>
          <div className="panel content-card"><div className="section-header"><div><h3>Whale tape</h3><p>Compact feed card</p></div></div><div className="list">{[{wallet:'0x8f...42a1',action:'Long HYPE',size:'$4.2M',status:'Aggressive build'},{wallet:'0x1a...d9c0',action:'Reduce BTC',size:'$1.1M',status:'Risk-off'},{wallet:'0x7d...ee19',action:'Rotate to ETH',size:'$860K',status:'Momentum'}].map((row)=>(<div className="list-item" key={row.wallet}><div><strong>{row.action}</strong><div className="soft">{row.wallet}</div></div><div style={{ textAlign: 'right' }}><strong>{row.size}</strong><div className="soft">{row.status}</div></div></div>))}</div></div>
        </div>
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="panel content-card"><div className="section-header"><div><h3>Vault monitor</h3><p>Cleaner information density</p></div></div><div className="list">{[{name:'HLP Core',aum:'$412M',apr:'18.4%',status:'Stable'},{name:'Basis Vault',aum:'$96M',apr:'23.8%',status:'Watch leverage'},{name:'Delta Neutral',aum:'$58M',apr:'14.1%',status:'Low vol'}].map((row)=>(<div className="list-item" key={row.name}><div><strong>{row.name}</strong><div className="soft">AUM {row.aum}</div></div><div style={{ textAlign: 'right' }}><strong>{row.apr}</strong><div className="soft">{row.status}</div></div></div>))}</div></div>
          <div className="panel content-card"><div className="section-header"><div><h3>Design notes</h3><p>What changed</p></div></div><div className="list"><div className="list-item"><span><Waves size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Same structure</span><span className="soft">kept</span></div><div className="list-item"><span><ArrowUpRight size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Stronger contrast</span><span className="soft">kept</span></div><div className="list-item"><span><Wallet size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Removed off-topic card</span><span className="soft">done</span></div></div></div>
        </div>
      </section>
    </main>
  );
}

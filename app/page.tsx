"use client";

import React, { useEffect, useMemo, useState } from "react";

type View = "overview" | "markets" | "liquidity" | "wallet" | "builder";

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

const API_URL = "https://api.hyperliquid.xyz/info";
const HYPE_SUPPLY = 1_000_000_000;

const DEFAULT_COINS = ["HYPE", "BTC", "ETH", "SOL"];

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
  return normalizeBook({ levels: [bids.map(toRawLevel), asks.map(toRawLevel)] }) || {
    bids,
    asks,
    bestBid: bids[0].price,
    bestAsk: asks[0].price,
    bidUsd: 0,
    askUsd: 0,
    spreadPct: 0,
    imbalance: 0,
  };
}

function toRawLevel(level: BookLevel) {
  return { px: String(level.price), sz: String(level.size) };
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

async function postInfo(body: unknown) {
  const response = await fetch(API_URL, {
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
    .filter((market) => market.symbol && market.price > 0 && !market.delisted)
    .sort((a, b) => {
      if (a.symbol === "HYPE") return -1;
      if (b.symbol === "HYPE") return 1;
      return b.oiUsd - a.oiUsd;
    });
}

function normalizeCandles(payload: unknown): Candle[] {
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .map((row: any) => ({
      time: n(row.t || row.time || row.timestamp),
      close: n(row.c || row.close),
      volume: n(row.v || row.volume),
    }))
    .filter((row) => row.time > 0 && row.close > 0)
    .sort((a, b) => a.time - b.time)
    .slice(-96);
}

function normalizeBook(payload: any): Book | null {
  if (!payload?.levels || !Array.isArray(payload.levels)) return null;
  const bids = (payload.levels[0] || []).map(normalizeLevel).filter(Boolean) as BookLevel[];
  const asks = (payload.levels[1] || []).map(normalizeLevel).filter(Boolean) as BookLevel[];
  if (!bids.length || !asks.length) return null;
  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
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

function normalizeLevel(level: any): BookLevel | null {
  const price = n(level.px || level.price);
  const size = n(level.sz || level.size);
  if (price <= 0 || size <= 0) return null;
  return { price, size, usd: price * size };
}

function riskColor(score: number) {
  if (score >= 75) return "#ff7a8d";
  if (score >= 55) return "#f2c66d";
  return "#35d58a";
}

function shortAddress(address: string) {
  if (!address || address.length < 12) return address || "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        {book.bids.slice(0, 12).map((level, index) => (
          <div className="depth-row" key={`bid-${index}`}>
            <span>{formatUsd(level.price)}</span>
            <i className="bid" style={{ width: `${Math.max(4, (level.usd / maxUsd) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div>
        <strong>Asks</strong>
        {book.asks.slice(0, 12).map((level, index) => (
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
  const [source, setSource] = useState("Fallback model");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [marketSort, setMarketSort] = useState("oi");
  const [search, setSearch] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletStatus, setWalletStatus] = useState("Paste an address to analyze perp exposure.");
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    loadMarketData();
    const timer = window.setInterval(loadMarketData, 25_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  async function loadMarketData() {
    try {
      setSource("Refreshing");
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
      setSource("Hyperliquid live");
    } catch {
      setCandles(makeFallbackCandles(coin));
      setBook(makeFallbackBook(coin));
      setSource("Fallback model");
      setLastUpdate(new Date());
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
  const feePressure = (hype?.volumeUsd || 0) * 0.0002;
  const regimeScore = Math.round(clamp(Math.abs(weightedFunding) * 60_000 + Math.abs(selected?.changePct || 0) * 2 + Math.abs(book?.imbalance || 0) * 0.2, 0, 99));
  const regime = regimeScore > 65 ? "Volatile" : regimeScore > 35 ? "Active" : "Balanced";
  const marketOptions = Array.from(new Set(DEFAULT_COINS.concat(markets.slice(0, 30).map((market) => market.symbol))));

  const sortedMarkets = useMemo(() => {
    const query = search.trim().toUpperCase();
    const rows = markets.filter((market) => !query || market.symbol.includes(query));
    const sorters: Record<string, (a: Market, b: Market) => number> = {
      oi: (a, b) => b.oiUsd - a.oiUsd,
      risk: (a, b) => b.risk - a.risk,
      funding: (a, b) => Math.abs(b.funding) - Math.abs(a.funding),
      volume: (a, b) => b.volumeUsd - a.volumeUsd,
    };
    return rows.sort(sorters[marketSort] || sorters.oi).slice(0, 80);
  }, [markets, search, marketSort]);

  const signals = [
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
      label: "Book imbalance",
      value: formatPct(book?.imbalance || 0, 1),
      body: `${formatUsd(book?.bidUsd || 0)} bids versus ${formatUsd(book?.askUsd || 0)} asks in visible depth.`,
      tone: Math.abs(book?.imbalance || 0) > 18 ? "watch" : "good",
    },
    {
      label: "Highest stress",
      value: `${[...markets].sort((a, b) => b.risk - a.risk)[0]?.symbol || "--"} ${[...markets].sort((a, b) => b.risk - a.risk)[0]?.risk || "--"}`,
      body: "Computed from 24h move, funding, OI, volume, and leverage cap.",
      tone: "watch",
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
          {(["overview", "markets", "liquidity", "wallet", "builder"] as View[]).map((item) => (
            <button className={view === item ? "active" : ""} key={item} onClick={() => setView(item)}>
              <strong>{item[0].toUpperCase() + item.slice(1)}</strong>
              <small>{item === "overview" ? "HYPE pulse" : item === "markets" ? "Perps radar" : item === "liquidity" ? "Order book" : item === "wallet" ? "Risk scan" : "Proof layer"}</small>
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <span className={source.includes("live") ? "status live" : "status"}>{source}</span>
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
            <button className="icon-btn" onClick={loadMarketData} aria-label="Refresh">↻</button>
          </div>
          <nav className="mobile-tabs">
            {(["overview", "markets", "liquidity", "wallet", "builder"] as View[]).map((item) => (
              <button className={view === item ? "active" : ""} key={item} onClick={() => setView(item)}>{item}</button>
            ))}
          </nav>
        </header>

        {view === "overview" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">Live Hyperliquid console</p>
                <h1>HYPE market intelligence built for fast decisions.</h1>
                <p>Price, open interest, funding, depth, volatility, wallet exposure, and transparent scoring in one read-only workspace.</p>
                <div className="actions">
                  <button className="primary" onClick={() => setView("wallet")}>Scan wallet</button>
                  <button className="secondary" onClick={() => setView("markets")}>Open radar</button>
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
              <Kpi label="Funding" value={formatPct((selected?.funding || 0) * 100, 4)} detail={`Weighted ${formatPct(weightedFunding * 100, 4)}`} />
              <Kpi label="HYPE FDV" value={formatUsd(hype?.fdvUsd || 0)} detail={`${formatPct(totalOi ? ((hype?.oiUsd || 0) / totalOi) * 100 : 0, 1, false)} of total OI`} />
              <Kpi label="24h volume" value={formatUsd(selected?.volumeUsd || 0)} detail={`${formatUsd(totalVolume)} total perps volume`} />
              <Kpi label="Risk score" value={String(selected?.risk || "--")} detail="Move + funding + OI + volume + leverage" tone={(selected?.risk || 0) > 70 ? "negative" : "positive"} />
              <Kpi label="Book spread" value={formatPct(book?.spreadPct || 0, 4, false)} detail={`${formatUsd(book?.bidUsd || 0)} bids visible`} />
              <Kpi label="Fee pressure" value={formatUsd(feePressure)} detail="2.0 bps on HYPE volume" />
            </section>

            <section className="two-col">
              <Panel title={`${coin} 24h tape`} subtitle={`${formatUsd(selected?.volumeUsd || 0)} 24h volume, ${formatUsd(selected?.oiUsd || 0)} OI.`}>
                <Sparkline candles={candles} />
              </Panel>
              <Panel title="Signal stack" subtitle="Derived from funding, OI, volume, and book balance.">
                <div className="signals">
                  {signals.map((signal) => <Signal key={signal.label} {...signal} />)}
                </div>
              </Panel>
            </section>

            <section className="two-col lower">
              <Panel title="Risk heat" subtitle="Top markets by computed stress score.">
                <div className="heatmap">
                  {[...markets].sort((a, b) => b.risk - a.risk).slice(0, 24).map((market) => (
                    <div className="heat" key={market.symbol} style={{ borderColor: riskColor(market.risk) }}>
                      <strong>{market.symbol}</strong>
                      <span>{market.risk} risk</span>
                      <span>{formatPct(market.funding * 100, 4)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Fee-pressure model" subtitle="Configurable estimate, transparent assumption.">
                <div className="model-box">
                  <span>Fee rate assumption</span>
                  <input type="range" min="0" max="100" defaultValue="25" />
                  <div><strong>2.0 bps</strong><span>{formatUsd(feePressure)}</span></div>
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
                  <Stat label="Imbalance" value={formatPct(book?.imbalance || 0, 1)} />
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
                  <li><strong>Client-side scoring</strong><span>Risk, fee pressure, liquidity imbalance, and wallet health computed in browser.</span></li>
                  <li><strong>Graceful fallback</strong><span>The interface remains useful during API or network issues.</span></li>
                </ul>
              </Panel>
              <Panel title="Computed models" subtitle="Designed to be inspected and improved.">
                <ul className="proof-list">
                  <li><strong>Market risk</strong><span>24h move + funding + OI + volume + leverage cap.</span></li>
                  <li><strong>Wallet health</strong><span>Leverage, margin use, concentration, and liquidation distance.</span></li>
                  <li><strong>Book pressure</strong><span>Near-touch bid/ask USD depth and spread.</span></li>
                </ul>
              </Panel>
              <Panel title="Roadmap" subtitle="Next grant-facing layers.">
                <ol className="roadmap">
                  <li>Server API proxy with rate limiting and cache headers.</li>
                  <li>Historical signal archive and public wallet reports.</li>
                  <li>Open-source formulas and changelog for community review.</li>
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

function MarketTable({ rows }: { rows: Market[] }) {
  return (
    <article className="panel">
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

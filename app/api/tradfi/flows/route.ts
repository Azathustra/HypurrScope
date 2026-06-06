import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FlowRow = {
  name: string;
  ticker: string;
  yahooSymbol: string;
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

const PRODUCTS: FlowRow[] = [
  { name: "Bitwise Hyperliquid ETF", ticker: "BHYP", yahooSymbol: "BHYP", venue: "NYSE Arca / US", status: "Yahoo quote", url: "https://finance.yahoo.com/quote/BHYP/" },
  { name: "21Shares Hyperliquid ETF", ticker: "THYP", yahooSymbol: "THYP", venue: "Nasdaq / US", status: "Yahoo quote", url: "https://finance.yahoo.com/quote/THYP/" },
  { name: "21Shares Hyperliquid ETP", ticker: "HYPE.SW", yahooSymbol: "HYPE.SW", venue: "SIX / Switzerland", status: "Yahoo quote", url: "https://finance.yahoo.com/quote/HYPE.SW/" },
  { name: "CoinShares Hyperliquid Staking ETP", ticker: "LIQD.DE", yahooSymbol: "LIQD.DE", venue: "Xetra / Germany", status: "Yahoo quote", fee: "0.00%", url: "https://finance.yahoo.com/quote/LIQD.DE/" },
];

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value: number, currency = "USD") {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const prefix = currency === "EUR" ? "€" : currency === "CHF" ? "CHF " : "$";
  if (value >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K`;
  return `${prefix}${value.toFixed(2)}`;
}

function fmtNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(value: number) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function normalizeQuote(q: any): FlowRow | null {
  const product = PRODUCTS.find((item) => item.yahooSymbol === q.symbol);
  if (!product) return null;
  const price = num(q.regularMarketPrice || q.postMarketPrice || q.preMarketPrice);
  const volume = num(q.regularMarketVolume || q.volume);
  const currency = String(q.currency || "USD");
  const valueTraded = price * volume;
  const changePct = num(q.regularMarketChangePercent);
  const aum = num(q.totalAssets || q.netAssets || q.marketCap);
  return {
    ...product,
    price: price ? fmtMoney(price, currency) : "--",
    change: Number.isFinite(changePct) ? fmtPct(changePct) : "--",
    volume: fmtNumber(volume),
    dollarVolume: fmtMoney(valueTraded, currency),
    aum: aum ? fmtMoney(aum, currency) : product.aum || "--",
    updatedAt: new Date().toISOString(),
    status: volume > 0 ? "Live daily trading volume" : "Quote loaded, volume unavailable",
  };
}

export async function GET() {
  const symbols = PRODUCTS.map((item) => item.yahooSymbol).join(",");
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`, {
      headers: { accept: "application/json", "user-agent": "Mozilla/5.0 HypurrScope/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Yahoo quote failed ${res.status}`);
    const payload = await res.json();
    const quotes = Array.isArray(payload?.quoteResponse?.result) ? payload.quoteResponse.result : [];
    const rows = quotes.map(normalizeQuote).filter(Boolean) as FlowRow[];
    const byTicker = new Map(rows.map((row) => [row.ticker, row]));
    const flows = PRODUCTS.map((product) => byTicker.get(product.ticker) || { ...product, status: "No live quote returned", volume: "--", dollarVolume: "--" });
    return NextResponse.json(
      { ok: true, source: "yahoo-finance", updatedAt: new Date().toISOString(), note: "Daily trading volume, not primary-market net inflow.", flows },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=180" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, source: "fallback", updatedAt: new Date().toISOString(), error: error?.message || "Yahoo quote failed", flows: PRODUCTS.map((product) => ({ ...product, status: "Volume feed unavailable", volume: "--", dollarVolume: "--" })) },
      { status: 200, headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=180" } },
    );
  }
}

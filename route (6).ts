import { NextResponse } from "next/server";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";

type NormalizedTrade = {
  side: "Buy" | "Sell";
  price: number;
  size: number;
  notional: number;
  time: number;
};

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value).toLocaleString("en-US")}`;
  return `$${value.toFixed(2)}`;
}

function formatNative(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-- HYPE";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M HYPE`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K HYPE`;
  if (value >= 1) return `${value.toFixed(2)} HYPE`;
  return `${value.toPrecision(3)} HYPE`;
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function normalizeTrade(trade: any): NormalizedTrade | null {
  const price = toNumber(trade.px || trade.price);
  const size = toNumber(trade.sz || trade.size);
  const rawSide = String(trade.side || trade.dir || "").toLowerCase();
  const time = toNumber(trade.time || trade.timestamp);
  const side = rawSide === "b" || rawSide.includes("buy") ? "Buy" : rawSide === "a" || rawSide.includes("sell") ? "Sell" : "Buy";
  if (!price || !size || !time) return null;
  return { side, price, size, notional: price * size, time };
}

export async function GET() {
  try {
    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recentTrades", coin: "HYPE" }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ rows: [], error: text || "recentTrades failed" }, { status: response.status });
    }

    const payload = await response.json();
    const trades = (Array.isArray(payload) ? payload : [])
      .map(normalizeTrade)
      .filter(Boolean) as NormalizedTrade[];

    const recentCutoff = Date.now() - 30 * 60 * 1000;
    const recentTrades = trades.filter((trade) => trade.time >= recentCutoff);
    const grouped = ["Buy", "Sell"].map((side) => {
      const sideTrades = recentTrades.filter((trade) => trade.side === side);
      const notional = sideTrades.reduce((sum, trade) => sum + trade.notional, 0);
      const size = sideTrades.reduce((sum, trade) => sum + trade.size, 0);
      const avgPrice = size > 0 ? notional / size : 0;
      const lastTrade = sideTrades.length ? Math.max(...sideTrades.map((trade) => trade.time)) : 0;
      const confidence = sideTrades.length >= 20 && notional >= 1_000_000 ? "High" : sideTrades.length >= 10 && notional >= 250_000 ? "Medium" : "Low";
      return {
        side,
        notional: formatUsd(notional),
        rawNotional: notional,
        slices: sideTrades.length,
        avgSize: formatNative(sideTrades.length ? size / sideTrades.length : 0),
        avgPrice: formatUsd(avgPrice),
        lastTrade: lastTrade ? formatRelativeTime(lastTrade) : "--",
        confidence,
      };
    }).filter((row) => row.rawNotional > 50_000 || row.slices >= 5);

    return NextResponse.json({ rows: grouped, generatedAt: new Date().toISOString(), source: "hyperliquid-recentTrades" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ rows: [], error: "HYPE TWAP detector failed" }, { status: 500 });
  }
}

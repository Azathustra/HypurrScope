import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HL_INFO = "https://api.hyperliquid.xyz/info";

type RawTrade = {
  px?: string;
  sz?: string;
  side?: string;
  time?: number;
  tid?: number | string;
};

type TapeTrade = {
  id: string;
  side: "Buy" | "Sell";
  price: string;
  size: string;
  notional: number;
  notionalLabel: string;
  time: number;
  timeLabel: string;
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function usd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function compact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

function timeLabel(timestamp: number) {
  if (!timestamp) return "--";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function detectClusters(trades: TapeTrade[]) {
  const now = Date.now();
  const recent = trades.filter((trade) => now - trade.time <= 10 * 60_000);
  const groups = new Map<string, TapeTrade[]>();
  for (const trade of recent) {
    const bucket = Math.round((Number(trade.price.replace(/[$,]/g, "")) || 0) / 0.05) * 0.05;
    const key = `${trade.side}-${bucket.toFixed(2)}`;
    const existing = groups.get(key) || [];
    existing.push(trade);
    groups.set(key, existing);
  }
  return Array.from(groups.values())
    .filter((items) => items.length >= 3)
    .map((items) => {
      const side = items[0].side;
      const notional = items.reduce((sum, item) => sum + item.notional, 0);
      const size = items.reduce((sum, item) => sum + Number(item.size), 0);
      const weightedPrice = size > 0 ? notional / size : 0;
      const first = Math.min(...items.map((item) => item.time));
      const last = Math.max(...items.map((item) => item.time));
      return {
        side,
        slices: items.length,
        notional,
        notionalLabel: usd(notional),
        size: `${compact(size)} HYPE`,
        avgPrice: `$${weightedPrice.toFixed(2)}`,
        window: `${Math.max(1, Math.round((last - first) / 60_000))}m`,
        lastTrade: timeLabel(last),
        confidence: items.length >= 8 ? "High" : items.length >= 5 ? "Medium" : "Watch",
      };
    })
    .sort((a, b) => b.notional - a.notional)
    .slice(0, 12);
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(HL_INFO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recentTrades", coin: "HYPE" }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Hyperliquid ${res.status}`);
    const raw = (await res.json()) as RawTrade[];
    const trades = raw
      .map((trade, index): TapeTrade => {
        const price = num(trade.px);
        const size = num(trade.sz);
        const notional = price * size;
        return {
          id: String(trade.tid || `${trade.time}-${index}`),
          side: trade.side === "B" ? "Buy" : "Sell",
          price: `$${price.toFixed(2)}`,
          size: size.toString(),
          notional,
          notionalLabel: usd(notional),
          time: num(trade.time),
          timeLabel: timeLabel(num(trade.time)),
        };
      })
      .filter((trade) => trade.notional > 0 && trade.time > 0)
      .sort((a, b) => b.time - a.time);

    const now = Date.now();
    const recent = trades.filter((trade) => now - trade.time <= 10 * 60_000);
    const buy = recent.filter((trade) => trade.side === "Buy").reduce((sum, trade) => sum + trade.notional, 0);
    const sell = recent.filter((trade) => trade.side === "Sell").reduce((sum, trade) => sum + trade.notional, 0);
    const net = buy - sell;

    return NextResponse.json(
      {
        ok: true,
        source: "hyperliquid-recentTrades",
        updatedAt: new Date().toISOString(),
        summary: {
          buy,
          sell,
          net,
          buyLabel: usd(buy),
          sellLabel: usd(sell),
          netLabel: `${net >= 0 ? "+" : "-"}${usd(Math.abs(net))}`,
          netSide: net >= 0 ? "Buy" : "Sell",
          tradeCount: recent.length,
        },
        clusters: detectClusters(trades),
        trades: trades.slice(0, 40),
      },
      { headers: { "Cache-Control": "s-maxage=8, stale-while-revalidate=16" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message, summary: null, clusters: [], trades: [] }, { status: 200 });
  }
}

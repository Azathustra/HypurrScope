import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";

type Trade = {
  coin?: string;
  side?: string;
  px?: string | number;
  sz?: string | number;
  time?: number;
  tid?: number | string;
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtHype(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-- HYPE";
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K HYPE`;
  return `${value.toFixed(value >= 100 ? 0 : 2)} HYPE`;
}

function fmtPx(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  return `$${value.toFixed(2)}`;
}

function ago(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "recent";
  const delta = Math.max(0, Date.now() - ms);
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

async function fetchRecentTrades(): Promise<Trade[]> {
  const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "recentTrades", coin: "HYPE" }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Hyperliquid recentTrades failed ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export async function GET() {
  try {
    const trades = await fetchRecentTrades();
    const normalized = trades
      .map((trade) => {
        const px = num(trade.px);
        const sz = num(trade.sz);
        const time = num(trade.time);
        const notional = px * sz;
        const side = String(trade.side || "").toUpperCase().startsWith("B") ? "Buy" : "Sell";
        return {
          id: String(trade.tid || `${time}-${px}-${sz}`),
          side,
          px,
          sz,
          time,
          notional,
          price: fmtPx(px),
          size: fmtHype(sz),
          notionalLabel: fmtUsd(notional),
          timeLabel: ago(time),
        };
      })
      .filter((trade) => trade.px > 0 && trade.sz > 0)
      .sort((a, b) => b.time - a.time)
      .slice(0, 80);

    const windowMs = 20 * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    const recent = normalized.filter((trade) => trade.time >= cutoff);
    const buyNotional = recent.filter((t) => t.side === "Buy").reduce((s, t) => s + t.notional, 0);
    const sellNotional = recent.filter((t) => t.side === "Sell").reduce((s, t) => s + t.notional, 0);
    const buySize = recent.filter((t) => t.side === "Buy").reduce((s, t) => s + t.sz, 0);
    const sellSize = recent.filter((t) => t.side === "Sell").reduce((s, t) => s + t.sz, 0);

    const buckets = new Map<string, { side: "Buy" | "Sell"; notional: number; size: number; count: number; lastTime: number; priceSum: number }>();
    recent.forEach((trade) => {
      const bucketTs = Math.floor(trade.time / 30_000) * 30_000;
      const key = `${trade.side}-${bucketTs}`;
      const current = buckets.get(key) || { side: trade.side as "Buy" | "Sell", notional: 0, size: 0, count: 0, lastTime: 0, priceSum: 0 };
      current.notional += trade.notional;
      current.size += trade.sz;
      current.count += 1;
      current.lastTime = Math.max(current.lastTime, trade.time);
      current.priceSum += trade.px;
      buckets.set(key, current);
    });

    const twaps = Array.from(buckets.values())
      .filter((bucket) => bucket.count >= 2 || bucket.notional >= 10_000)
      .sort((a, b) => b.notional - a.notional)
      .slice(0, 16)
      .map((bucket) => ({
        side: bucket.side,
        notional: fmtUsd(bucket.notional),
        rawNotional: bucket.notional,
        size: fmtHype(bucket.size),
        slices: bucket.count,
        avgPrice: fmtPx(bucket.priceSum / Math.max(bucket.count, 1)),
        lastTrade: ago(bucket.lastTime),
        confidence: bucket.count >= 6 ? "High" : bucket.count >= 3 ? "Medium" : "Low",
      }));

    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        coin: "HYPE",
        window: "20m",
        summary: {
          buyNotional,
          sellNotional,
          buySize,
          sellSize,
          netNotional: buyNotional - sellNotional,
          buyLabel: fmtUsd(buyNotional),
          sellLabel: fmtUsd(sellNotional),
          netLabel: fmtUsd(Math.abs(buyNotional - sellNotional)),
          netSide: buyNotional >= sellNotional ? "Buy" : "Sell",
        },
        twaps,
        buyTwaps: twaps.filter((row) => row.side === "Buy"),
        sellTwaps: twaps.filter((row) => row.side === "Sell"),
        trades: normalized.slice(0, 60),
      },
      { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=20" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Could not load HYPE recentTrades", twaps: [], trades: [] },
      { status: 200, headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
    );
  }
}

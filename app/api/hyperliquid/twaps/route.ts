import { NextResponse } from "next/server";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const DEFAULT_COINS = ["HYPE"];

type RecentTrade = {
  px: string;
  sz: string;
  side: "A" | "B" | string;
  time: number;
  tid?: number;
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

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toPrecision(4)}`;
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function fetchRecentTrades(coin: string) {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "recentTrades", coin }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`recentTrades failed for ${coin}: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload) ? (payload as RecentTrade[]) : [];
}

function median(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function buildTwapLikeRows(coin: string, trades: RecentTrade[]) {
  const now = Date.now();
  const recent = trades
    .filter((trade) => Number.isFinite(trade.time) && now - trade.time <= 20 * 60_000)
    .sort((a, b) => a.time - b.time);

  return ["B", "A"].flatMap((side) => {
    const sideTrades = recent.filter((trade) => trade.side === side);
    if (sideTrades.length < 3) return [];

    const notionals = sideTrades.map((trade) => toNumber(trade.px) * toNumber(trade.sz)).filter((value) => value > 0);
    const sizes = sideTrades.map((trade) => toNumber(trade.sz)).filter((value) => value > 0);
    const totalNotional = notionals.reduce((sum, value) => sum + value, 0);
    const medianSize = median(sizes);
    const similarSizeCount = medianSize > 0 ? sizes.filter((size) => Math.abs(size - medianSize) / medianSize <= 0.35).length : 0;
    const similarityRatio = sizes.length ? similarSizeCount / sizes.length : 0;
    const first = sideTrades[0];
    const last = sideTrades[sideTrades.length - 1];
    const windowMinutes = Math.max(1, Math.round((last.time - first.time) / 60_000));

    if (totalNotional < 50_000 || similarityRatio < 0.34) return [];

    let confidenceScore = 35;
    confidenceScore += Math.min(sideTrades.length * 6, 28);
    confidenceScore += similarityRatio >= 0.66 ? 22 : similarityRatio >= 0.5 ? 14 : 6;
    confidenceScore += windowMinutes >= 3 ? 8 : 0;
    confidenceScore += totalNotional >= 1_000_000 ? 10 : totalNotional >= 250_000 ? 6 : 0;

    const confidence = confidenceScore >= 78 ? "High" : confidenceScore >= 58 ? "Medium" : "Low";
    const avgNotional = totalNotional / Math.max(1, notionals.length);

    return [
      {
        market: coin,
        side: side === "B" ? "Buy" : "Sell",
        notional: formatUsd(totalNotional),
        slices: `${sideTrades.length} trades`,
        avgSize: formatUsd(avgNotional),
        lastPrice: formatPrice(toNumber(last.px)),
        confidence,
        time: relativeTime(last.time),
        rawNotional: totalNotional,
        window: `${windowMinutes}m window`,
        source: "recentTrades",
      },
    ];
  });
}

export async function GET() {
  try {
    const results = await Promise.allSettled(DEFAULT_COINS.map(async (coin) => ({ coin, trades: await fetchRecentTrades(coin) })));

    const rows = results
      .flatMap((result) => (result.status === "fulfilled" ? buildTwapLikeRows(result.value.coin, result.value.trades) : []))
      .sort((a: any, b: any) => b.rawNotional - a.rawNotional)
      .slice(0, 12)
      .map(({ rawNotional, ...row }: any) => row);

    return NextResponse.json(
      {
        rows,
        generatedAt: new Date().toISOString(),
        note: "HYPE-only TWAP-style detector from Hyperliquid recentTrades. This is not an official all-user native TWAP feed.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ rows: [], error: "HYPE TWAP watcher failed" }, { status: 500 });
  }
}

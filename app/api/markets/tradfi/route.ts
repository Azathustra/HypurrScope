import { NextResponse } from "next/server";
import { formatCompactUsd, formatUsd, tradfiFallbackRows, type MarketRow } from "@/lib/market-data";

const trackedAssets = [
  { symbol: "SPY", name: "S&P 500 ETF", score: 82 },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", score: 84 },
  { symbol: "GLD", name: "Gold ETF", score: 77 },
  { symbol: "NVDA", name: "NVIDIA", score: 88 },
  { symbol: "AAPL", name: "Apple", score: 74 },
  { symbol: "TSLA", name: "Tesla", score: 71 }
];

export const revalidate = 60;

async function getQuote(symbol: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=7d&interval=1d`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) return null;

  const payload = await response.json();
  return payload.chart?.result?.[0] ?? null;
}

export async function GET() {
  try {
    const quotes = await Promise.all(
      trackedAssets.map(async (asset) => {
        const result = await getQuote(asset.symbol);
        const meta = result?.meta;
        const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((value: number | null) => typeof value === "number");

        if (!meta || !closes.length) {
          return tradfiFallbackRows.find((row) => row.ticker === asset.symbol);
        }

        const price = meta.regularMarketPrice ?? closes.at(-1);
        const previousClose = meta.previousClose ?? closes.at(-2) ?? price;
        const weekOpen = closes[0] ?? price;
        const day = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
        const week = weekOpen ? ((price - weekOpen) / weekOpen) * 100 : 0;

        return {
          name: asset.name,
          ticker: asset.symbol,
          price: formatUsd(price),
          day: Number(day.toFixed(2)),
          week: Number(week.toFixed(2)),
          cap: formatCompactUsd(meta.marketCap),
          score: asset.score
        } satisfies MarketRow;
      })
    );

    return NextResponse.json({ rows: quotes.filter(Boolean), source: "yahoo" });
  } catch {
    return NextResponse.json({ rows: tradfiFallbackRows, source: "fallback" });
  }
}

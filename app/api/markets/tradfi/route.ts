import { NextResponse } from "next/server";
import { formatCompactUsd, formatUsd, tradfiFallbackRows, type MarketRow } from "@/lib/market-data";

const trackedAssets = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
  { symbol: "GLD", name: "Gold ETF" },
  { symbol: "SLV", name: "Silver ETF" },
  { symbol: "TLT", name: "20Y Treasury ETF" },
  { symbol: "UUP", name: "US Dollar ETF" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "AVGO", name: "Broadcom" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "JPM", name: "JPMorgan" },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "GS", name: "Goldman Sachs" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "CVX", name: "Chevron" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "MSTR", name: "MicroStrategy" },
  { symbol: "MARA", name: "MARA Holdings" },
  { symbol: "RIOT", name: "Riot Platforms" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust" },
  { symbol: "ETHA", name: "iShares Ethereum Trust" }
];

export const revalidate = 60;

async function getQuote(symbol: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) return null;

  const payload = await response.json();
  return payload.chart?.result?.[0] ?? null;
}

function percentChange(current: number, previous?: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export async function GET() {
  try {
    const quotes = await Promise.all(
      trackedAssets.map(async (asset, index) => {
        const result = await getQuote(asset.symbol);
        const meta = result?.meta;
        const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((value: number | null) => typeof value === "number");

        if (!meta || !closes.length) {
          return tradfiFallbackRows.find((row) => row.ticker === asset.symbol);
        }

        const price = meta.regularMarketPrice ?? closes.at(-1);
        const previousClose = meta.previousClose ?? closes.at(-2) ?? price;
        const weekOpen = closes.at(-6) ?? closes[0] ?? price;
        const monthOpen = closes[0] ?? price;
        const rank = index + 1;

        return {
          rank,
          name: asset.name,
          ticker: asset.symbol,
          price: formatUsd(price),
          day: Number(percentChange(price, previousClose).toFixed(2)),
          week: Number(percentChange(price, weekOpen).toFixed(2)),
          month: Number(percentChange(price, monthOpen).toFixed(2)),
          cap: formatCompactUsd(meta.marketCap),
          score: Math.max(50, Math.min(94, 92 - Math.round(index / 2))),
          sparkline: closes.slice(-30)
        } satisfies MarketRow;
      })
    );

    return NextResponse.json({ rows: quotes.filter(Boolean), source: "yahoo-watchlist" });
  } catch {
    return NextResponse.json({ rows: tradfiFallbackRows, source: "fallback" });
  }
}

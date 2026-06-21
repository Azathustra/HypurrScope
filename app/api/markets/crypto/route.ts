import { NextResponse } from "next/server";
import { cryptoFallbackRows, formatCompactUsd, formatUsd, type MarketRow } from "@/lib/market-data";

const trackedAssets = [
  { id: "bitcoin", name: "Bitcoin", ticker: "BTC", score: 92 },
  { id: "ethereum", name: "Ethereum", ticker: "ETH", score: 81 },
  { id: "solana", name: "Solana", ticker: "SOL", score: 84 },
  { id: "hyperliquid", name: "Hyperliquid", ticker: "HYPE", score: 89 },
  { id: "bittensor", name: "Bittensor", ticker: "TAO", score: 76 },
  { id: "chainlink", name: "Chainlink", ticker: "LINK", score: 78 },
  { id: "binancecoin", name: "BNB", ticker: "BNB", score: 72 },
  { id: "ripple", name: "XRP", ticker: "XRP", score: 61 }
];

export const revalidate = 60;

export async function GET() {
  try {
    const ids = trackedAssets.map((asset) => asset.id).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
    }

    const payload = await response.json();
    const rows: MarketRow[] = trackedAssets.map((asset) => {
      const live = payload.find((item: { id: string }) => item.id === asset.id);

      if (!live) {
        return cryptoFallbackRows.find((row) => row.ticker === asset.ticker) ?? {
          name: asset.name,
          ticker: asset.ticker,
          price: "-",
          day: 0,
          week: 0,
          cap: "-",
          score: asset.score
        };
      }

      return {
        name: asset.name,
        ticker: asset.ticker,
        price: formatUsd(live.current_price),
        day: Number((live.price_change_percentage_24h_in_currency ?? live.price_change_percentage_24h ?? 0).toFixed(2)),
        week: Number((live.price_change_percentage_7d_in_currency ?? 0).toFixed(2)),
        cap: formatCompactUsd(live.market_cap),
        score: asset.score
      };
    });

    return NextResponse.json({ rows, source: "coingecko" });
  } catch {
    return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
  }
}

import { NextResponse } from "next/server";
import { cryptoFallbackRows, formatCompactUsd, formatUsd, type MarketRow } from "@/lib/market-data";

export const revalidate = 15;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d,30d",
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
    }

    const payload = await response.json();
    const rows: MarketRow[] = payload.map((coin: {
      market_cap_rank?: number;
      name: string;
      symbol: string;
      image?: string;
      current_price?: number;
      price_change_percentage_24h_in_currency?: number;
      price_change_percentage_7d_in_currency?: number;
      price_change_percentage_30d_in_currency?: number;
      market_cap?: number;
      sparkline_in_7d?: { price?: number[] };
    }) => ({
      rank: coin.market_cap_rank,
      name: coin.name,
      ticker: coin.symbol.toUpperCase(),
      logoUrl: coin.image,
      price: formatUsd(coin.current_price),
      priceValue: coin.current_price,
      day: Number((coin.price_change_percentage_24h_in_currency ?? 0).toFixed(2)),
      week: Number((coin.price_change_percentage_7d_in_currency ?? 0).toFixed(2)),
      month: Number((coin.price_change_percentage_30d_in_currency ?? 0).toFixed(2)),
      cap: formatCompactUsd(coin.market_cap),
      capValue: coin.market_cap,
      score: Math.max(50, Math.min(96, 98 - Math.round((coin.market_cap_rank ?? 100) / 2))),
      sparkline: coin.sparkline_in_7d?.price?.filter((value) => typeof value === "number").slice(-80)
    }));

    return NextResponse.json({ rows, source: "coingecko-top-100" });
  } catch {
    return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
  }
}

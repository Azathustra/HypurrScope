import { NextResponse } from "next/server";
import { applyCryptoLivePrices, fetchCryptoLivePrices } from "@/lib/crypto-live-prices";
import { cryptoFallbackRows, formatCompactUsd, formatUsd, type MarketRow } from "@/lib/market-data";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const COINGECKO_CACHE_MS = 120000;

let cachedRows: MarketRow[] | null = null;
let cachedRowsAt = 0;

type CoinGeckoCoin = {
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
};

export async function GET() {
  const base = await getBaseRows();
  const livePrices = await fetchCryptoLivePrices(base.rows.map((row) => row.ticker));
  const rows = applyCryptoLivePrices(base.rows, livePrices);

  return NextResponse.json({
    rows,
    source: livePrices.length ? "crypto-live" : base.source,
    updatedAt: new Date().toISOString()
  });
}

async function getBaseRows(): Promise<{ rows: MarketRow[]; source: string }> {
  const now = Date.now();

  if (cachedRows && now - cachedRowsAt < COINGECKO_CACHE_MS) {
    return { rows: cloneRows(cachedRows), source: "coingecko-cache" };
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d,30d",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    if (!response.ok) {
      return getCachedOrSeedRows();
    }

    const payload: CoinGeckoCoin[] = await response.json();
    const rows = payload.map(toMarketRow);

    if (rows.length) {
      cachedRows = rows;
      cachedRowsAt = now;
      return { rows: cloneRows(rows), source: "coingecko-top-100" };
    }

    return getCachedOrSeedRows();
  } catch {
    return getCachedOrSeedRows();
  }
}

function getCachedOrSeedRows() {
  if (cachedRows?.length) {
    return { rows: cloneRows(cachedRows), source: "coingecko-cache" };
  }

  return { rows: cloneRows(cryptoFallbackRows), source: "seeded-top-list" };
}

function toMarketRow(coin: CoinGeckoCoin): MarketRow {
  return {
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
  };
}

function cloneRows(rows: MarketRow[]) {
  return rows.map((row) => ({
    ...row,
    sparkline: row.sparkline ? [...row.sparkline] : undefined
  }));
}

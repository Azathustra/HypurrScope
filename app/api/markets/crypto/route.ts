import { NextResponse } from "next/server";
import { cryptoFallbackRows, formatCompactUsd, formatUsd, type MarketRow } from "@/lib/market-data";

export const revalidate = 15;
export const dynamic = "force-dynamic";

type BinanceTicker = {
  symbol: string;
  lastPrice?: string;
  priceChangePercent?: string;
};

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
  try {
    const [response, binanceTickers] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d,30d",
        { cache: "no-store" }
      ),
      fetchBinanceTickers()
    ]);

    if (!response.ok) {
      return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
    }

    const payload: CoinGeckoCoin[] = await response.json();
    const rows: MarketRow[] = payload.map((coin) => {
      const ticker = coin.symbol.toUpperCase();
      const liveTicker = findLiveTicker(ticker, binanceTickers);
      const livePriceValue = toNumber(liveTicker?.lastPrice);
      const livePrice = livePriceValue && livePriceValue > 0 ? livePriceValue : undefined;
      const liveDay = toNumber(liveTicker?.priceChangePercent);
      const priceValue = livePrice ?? coin.current_price;

      return {
        rank: coin.market_cap_rank,
        name: coin.name,
        ticker,
        logoUrl: coin.image,
        price: formatUsd(priceValue),
        priceValue,
        day: Number(((liveDay ?? coin.price_change_percentage_24h_in_currency) ?? 0).toFixed(2)),
        week: Number((coin.price_change_percentage_7d_in_currency ?? 0).toFixed(2)),
        month: Number((coin.price_change_percentage_30d_in_currency ?? 0).toFixed(2)),
        cap: formatCompactUsd(coin.market_cap),
        capValue: coin.market_cap,
        score: Math.max(50, Math.min(96, 98 - Math.round((coin.market_cap_rank ?? 100) / 2))),
        sparkline: coin.sparkline_in_7d?.price?.filter((value) => typeof value === "number").slice(-80)
      };
    });

    return NextResponse.json({ rows, source: "coingecko-binance-live", updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ rows: cryptoFallbackRows, source: "fallback" });
  }
}

async function fetchBinanceTickers() {
  const endpoints = ["https://api.binance.com/api/v3/ticker/24hr", "https://api.binance.us/api/v3/ticker/24hr"];
  const tickers = new Map<string, BinanceTicker>();

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (!response.ok) continue;

      const payload = await response.json();
      if (!Array.isArray(payload)) continue;

      for (const ticker of payload as BinanceTicker[]) {
        const base = getUsdBase(ticker.symbol);
        if (!base || tickers.has(base)) continue;
        tickers.set(base, ticker);
      }
    } catch {
      continue;
    }
  }

  return tickers;
}

function getUsdBase(symbol: string) {
  if (symbol.endsWith("USDT")) return symbol.slice(0, -4);
  if (symbol.endsWith("USD")) return symbol.slice(0, -3);
  return null;
}

function findLiveTicker(ticker: string, tickers: Map<string, BinanceTicker>) {
  const alias: Record<string, string> = {
    WBTC: "BTC",
    WETH: "ETH",
    STETH: "ETH",
    WBETH: "ETH"
  };

  return tickers.get(alias[ticker] ?? ticker);
}

function toNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

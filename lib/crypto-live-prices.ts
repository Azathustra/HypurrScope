import { formatUsd, type MarketRow } from "@/lib/market-data";

export type CryptoLivePrice = {
  ticker: string;
  price: string;
  priceValue: number;
  day?: number;
};

type BinanceTicker = {
  symbol: string;
  lastPrice?: string;
  priceChangePercent?: string;
};

let cachedTickers: Map<string, BinanceTicker> | null = null;
let cachedAt = 0;

export async function fetchCryptoLivePrices(symbols: string[]) {
  const requested = new Set(symbols.map((symbol) => normalizeTicker(symbol)).filter(Boolean));
  const tickers = await fetchBinanceTickers();

  return [...requested]
    .map((ticker): CryptoLivePrice | null => {
      const liveTicker = findLiveTicker(ticker, tickers);
      const priceValue = toNumber(liveTicker?.lastPrice);
      const day = toNumber(liveTicker?.priceChangePercent);

      if (!priceValue || priceValue <= 0) return null;

      return {
        ticker,
        price: formatUsd(priceValue),
        priceValue,
        day: typeof day === "number" ? Number(day.toFixed(2)) : undefined
      };
    })
    .filter((price): price is CryptoLivePrice => Boolean(price));
}

export function applyCryptoLivePrices(rows: MarketRow[], livePrices: CryptoLivePrice[]) {
  const prices = new Map(livePrices.map((price) => [price.ticker, price]));

  return rows.map((row) => {
    const live = prices.get(normalizeTicker(row.ticker));
    if (!live) return row;

    return {
      ...row,
      price: live.price,
      priceValue: live.priceValue,
      day: typeof live.day === "number" ? live.day : row.day
    };
  });
}

async function fetchBinanceTickers() {
  const now = Date.now();
  if (cachedTickers && now - cachedAt < 3000) return cachedTickers;

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

  cachedTickers = tickers;
  cachedAt = now;
  return tickers;
}

function getUsdBase(symbol: string) {
  const quotes = ["USDT", "USDC", "FDUSD", "USD"];
  const quote = quotes.find((item) => symbol.endsWith(item));
  return quote ? symbol.slice(0, -quote.length) : null;
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

function normalizeTicker(symbol: string) {
  return symbol.trim().toUpperCase();
}

function toNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

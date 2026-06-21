import { NextResponse } from "next/server";
import { formatUsd, type MarketRow } from "@/lib/market-data";

const trackedAssets = [
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"],
  ["AMZN", "Amazon"],
  ["GOOGL", "Alphabet"],
  ["META", "Meta Platforms"],
  ["AVGO", "Broadcom"],
  ["TSLA", "Tesla"],
  ["BRK-B", "Berkshire Hathaway"],
  ["LLY", "Eli Lilly"],
  ["JPM", "JPMorgan"],
  ["V", "Visa"],
  ["XOM", "Exxon Mobil"],
  ["MA", "Mastercard"],
  ["UNH", "UnitedHealth"],
  ["COST", "Costco"],
  ["WMT", "Walmart"],
  ["NFLX", "Netflix"],
  ["PG", "Procter & Gamble"],
  ["JNJ", "Johnson & Johnson"],
  ["HD", "Home Depot"],
  ["ABBV", "AbbVie"],
  ["BAC", "Bank of America"],
  ["KO", "Coca-Cola"],
  ["PLTR", "Palantir"],
  ["PM", "Philip Morris"],
  ["CRM", "Salesforce"],
  ["ORCL", "Oracle"],
  ["CSCO", "Cisco"],
  ["CVX", "Chevron"],
  ["WFC", "Wells Fargo"],
  ["ABT", "Abbott"],
  ["IBM", "IBM"],
  ["MCD", "McDonald's"],
  ["GE", "GE Aerospace"],
  ["LIN", "Linde"],
  ["AMD", "AMD"],
  ["MRK", "Merck"],
  ["TMO", "Thermo Fisher"],
  ["NOW", "ServiceNow"],
  ["AXP", "American Express"],
  ["DIS", "Disney"],
  ["GS", "Goldman Sachs"],
  ["INTU", "Intuit"],
  ["UBER", "Uber"],
  ["RTX", "RTX"],
  ["CAT", "Caterpillar"],
  ["T", "AT&T"],
  ["VZ", "Verizon"],
  ["PEP", "PepsiCo"],
  ["MS", "Morgan Stanley"],
  ["QCOM", "Qualcomm"],
  ["ISRG", "Intuitive Surgical"],
  ["BKNG", "Booking Holdings"],
  ["SPGI", "S&P Global"],
  ["TXN", "Texas Instruments"],
  ["AMGN", "Amgen"],
  ["NEE", "NextEra Energy"],
  ["PGR", "Progressive"],
  ["BLK", "BlackRock"],
  ["LOW", "Lowe's"],
  ["HON", "Honeywell"],
  ["SCHW", "Charles Schwab"],
  ["BA", "Boeing"],
  ["SYK", "Stryker"],
  ["DE", "Deere"],
  ["TJX", "TJX"],
  ["C", "Citigroup"],
  ["AMAT", "Applied Materials"],
  ["ADBE", "Adobe"],
  ["GILD", "Gilead"],
  ["MDT", "Medtronic"],
  ["LMT", "Lockheed Martin"],
  ["PANW", "Palo Alto Networks"],
  ["CB", "Chubb"],
  ["ADI", "Analog Devices"],
  ["VRTX", "Vertex"],
  ["SBUX", "Starbucks"],
  ["MU", "Micron Technology"],
  ["COP", "ConocoPhillips"],
  ["SPY", "S&P 500 ETF"],
  ["QQQ", "Nasdaq 100 ETF"],
  ["DIA", "Dow Jones ETF"],
  ["IWM", "Russell 2000 ETF"],
  ["GLD", "Gold ETF"],
  ["SLV", "Silver ETF"],
  ["TLT", "20Y Treasury ETF"],
  ["UUP", "US Dollar ETF"],
  ["EEM", "Emerging Markets ETF"],
  ["HYG", "High Yield Bond ETF"],
  ["LQD", "Investment Grade Bond ETF"],
  ["COIN", "Coinbase"],
  ["MSTR", "MicroStrategy"],
  ["MARA", "MARA Holdings"],
  ["RIOT", "Riot Platforms"],
  ["IBIT", "iShares Bitcoin Trust"],
  ["FBTC", "Fidelity Bitcoin Fund"],
  ["ETHA", "iShares Ethereum Trust"],
  ["ETHE", "Grayscale Ethereum Trust"],
  ["HOOD", "Robinhood"]
] as const;

export const revalidate = 60;
export const dynamic = "force-dynamic";

type TradFiAsset = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  cap: string;
};

function percentChange(current: number, previous?: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function logoUrl(symbol: string) {
  return `https://financialmodelingprep.com/image-stock/${symbol.replace(".", "-")}.png`;
}

function toYahooSymbol(symbol: string) {
  return symbol.replace(".", "-");
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", "\"");
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    },
    next: { revalidate: 60 }
  });
  if (!response.ok) return null;
  return response.json();
}

function latestPrice(closes: number[], quotePrice?: number) {
  return quotePrice || closes.at(-1) || 0;
}

function compactCloses(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function chunkSymbols(symbols: string[], size: number) {
  return Array.from({ length: Math.ceil(symbols.length / size) }, (_, index) => symbols.slice(index * size, index * size + size));
}

async function fetchSparkData(symbols: string[]) {
  const chunks = chunkSymbols(symbols, 20);
  const payloads = await Promise.all(
    chunks.map((chunk) =>
      fetchJson(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(chunk.join(","))}&range=1mo&interval=1d`)
    )
  );

  return payloads.reduce<Record<string, { close?: number[] }>>((merged, payload) => {
    if (!payload || typeof payload !== "object") return merged;
    return { ...merged, ...payload };
  }, {});
}

async function fetchTopCompanies(): Promise<TradFiAsset[]> {
  const html = await fetch("https://stockanalysis.com/list/biggest-companies/", {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0"
    },
    next: { revalidate: 60 * 60 }
  }).then((response) => (response.ok ? response.text() : ""));

  if (!html) return [];

  const rows = html.match(/<tr class="svelte-1ro3niy">[\s\S]*?<\/tr>/g) ?? [];

  return rows
    .map((row) => {
      const symbol = row.match(/<a href="\/stocks\/[^"]+\/">([^<]+)<\/a>/)?.[1];
      const name = row.match(/<td class="slw svelte-1ro3niy">([^<]+)<\/td>/)?.[1];
      const cells = [...row.matchAll(/<td[^>]*>(?:<!---->)?(?:<a[^>]*>)?([^<]+)(?:<\/a>)?(?:<!---->)?<\/td>/g)].map((match) =>
        decodeEntities(match[1].trim())
      );
      const cap = cells[3];

      if (!symbol || !name || !cap) return null;

      return {
        symbol: decodeEntities(symbol),
        yahooSymbol: toYahooSymbol(decodeEntities(symbol)),
        name: decodeEntities(name),
        cap
      };
    })
    .filter((asset): asset is TradFiAsset => Boolean(asset))
    .slice(0, 100);
}

function fallbackAssets(): TradFiAsset[] {
  return trackedAssets.map(([symbol, name]) => ({
    symbol,
    yahooSymbol: toYahooSymbol(symbol),
    name,
    cap: "-"
  }));
}

export async function GET() {
  try {
    const rankedAssets = await fetchTopCompanies();
    const assets = rankedAssets.length ? rankedAssets : fallbackAssets();
    const symbols = assets.map((asset) => asset.yahooSymbol);
    const sparkResults = await fetchSparkData(symbols);

    if (!Object.keys(sparkResults).length) {
      return NextResponse.json({ rows: fallbackRows(), source: "fallback" });
    }

    const rows: MarketRow[] = assets.map((asset, index) => {
      const closes = compactCloses(sparkResults[asset.yahooSymbol]?.close);
      const price = latestPrice(closes);
      const previousClose = closes.at(-2);
      const weekStart = closes.at(-6) ?? closes[0] ?? previousClose;
      const monthStart = closes[0] ?? weekStart;
      const day = price ? percentChange(price, previousClose) : Number.NaN;
      const week = price ? percentChange(price, weekStart) : Number.NaN;
      const month = price ? percentChange(price, monthStart) : Number.NaN;

      return {
        rank: index + 1,
        name: asset.name,
        ticker: asset.symbol,
        logoUrl: logoUrl(asset.yahooSymbol),
        price: price ? formatUsd(price) : "-",
        day: Number.isFinite(day) ? Number(day.toFixed(2)) : 0,
        week: Number.isFinite(week) ? Number(week.toFixed(2)) : 0,
        month: Number.isFinite(month) ? Number(month.toFixed(2)) : 0,
        cap: asset.cap,
        score: Math.max(50, Math.min(96, 96 - Math.round(index / 3))),
        sparkline: closes.length > 1 ? closes.slice(-30) : undefined
      };
    });

    return NextResponse.json({ rows, source: "stockanalysis-yahoo-live" });
  } catch {
    return NextResponse.json({ rows: fallbackRows(), source: "fallback" });
  }
}

function fallbackRows(): MarketRow[] {
  return trackedAssets.map(([symbol, name], index) => ({
    rank: index + 1,
    name,
    ticker: symbol,
    logoUrl: logoUrl(symbol),
    price: "-",
    day: 0,
    week: 0,
    month: 0,
    cap: "-",
    score: Math.max(50, Math.min(96, 96 - Math.round(index / 3))),
    sparkline: undefined
  }));
}

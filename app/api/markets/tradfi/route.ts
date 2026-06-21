import { NextResponse } from "next/server";
import { formatCompactUsd, formatUsd, type MarketRow } from "@/lib/market-data";

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
  ["MMC", "Marsh McLennan"],
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

function percentChange(current: number, previous?: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function logoUrl(symbol: string) {
  return `https://financialmodelingprep.com/image-stock/${symbol.replace(".", "-")}.png`;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { next: { revalidate: 60 } });
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

export async function GET() {
  try {
    const symbols = trackedAssets.map(([symbol]) => symbol).join(",");
    const sparkPayload = await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1mo&interval=1d`
    );

    if (!sparkPayload) {
      return NextResponse.json({ rows: fallbackRows(), source: "fallback" });
    }

    const sparkResults = sparkPayload ?? {};

    const rows: MarketRow[] = trackedAssets.map(([symbol, fallbackName], index) => {
      const closes = compactCloses(sparkResults[symbol]?.close);
      const price = latestPrice(closes);
      const previousClose = closes.at(-2);
      const weekStart = closes.at(-6) ?? closes[0] ?? previousClose;
      const monthStart = closes[0] ?? weekStart;
      const day = price ? percentChange(price, previousClose) : Number.NaN;
      const week = price ? percentChange(price, weekStart) : Number.NaN;
      const month = price ? percentChange(price, monthStart) : Number.NaN;

      return {
        rank: index + 1,
        name: fallbackName,
        ticker: symbol,
        logoUrl: logoUrl(symbol),
        price: price ? formatUsd(price) : "-",
        day: Number.isFinite(day) ? Number(day.toFixed(2)) : 0,
        week: Number.isFinite(week) ? Number(week.toFixed(2)) : 0,
        month: Number.isFinite(month) ? Number(month.toFixed(2)) : 0,
        cap: "-",
        score: Math.max(50, Math.min(96, 96 - Math.round(index / 3))),
        sparkline: closes.length > 1 ? closes.slice(-30) : undefined
      };
    });

    return NextResponse.json({ rows, source: "yahoo-spark-live" });
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

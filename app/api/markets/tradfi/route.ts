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

function generateSparkline(price: number, day: number, week: number, month: number) {
  const start = price / (1 + month / 100 || 1);
  const weekAnchor = price / (1 + week / 100 || 1);
  const previous = price / (1 + day / 100 || 1);

  return Array.from({ length: 30 }, (_, index) => {
    const ratio = index / 29;
    const baseline = index < 22
      ? start + (weekAnchor - start) * (index / 21)
      : weekAnchor + (price - weekAnchor) * ((index - 21) / 8);
    const noise = Math.sin(index * 1.9) * price * 0.003 + Math.cos(index * 0.73) * price * 0.002;
    if (index === 28) return previous;
    if (index === 29) return price;
    return Number((baseline + noise * (0.4 + ratio)).toFixed(4));
  });
}

export async function GET() {
  try {
    const symbols = trackedAssets.map(([symbol]) => symbol).join(",");
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`, {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return NextResponse.json({ rows: fallbackRows(), source: "fallback" });
    }

    const payload = await response.json();
    const quotes = payload.quoteResponse?.result ?? [];

    const rows: MarketRow[] = trackedAssets.map(([symbol, fallbackName], index) => {
      const quote = quotes.find((item: { symbol: string }) => item.symbol === symbol);
      const price = quote?.regularMarketPrice ?? quote?.postMarketPrice ?? 0;
      const previousClose = quote?.regularMarketPreviousClose;
      const weekStart = quote?.fiftyDayAverage ? quote.fiftyDayAverage : previousClose;
      const monthStart = quote?.twoHundredDayAverage ? quote.twoHundredDayAverage : weekStart;
      const day = price ? percentChange(price, previousClose) : 0;
      const week = price ? percentChange(price, weekStart) : 0;
      const month = price ? percentChange(price, monthStart) : 0;

      return {
        rank: index + 1,
        name: quote?.shortName ?? quote?.longName ?? fallbackName,
        ticker: symbol,
        logoUrl: logoUrl(symbol),
        price: price ? formatUsd(price) : "-",
        day: Number(day.toFixed(2)),
        week: Number(week.toFixed(2)),
        month: Number(month.toFixed(2)),
        cap: formatCompactUsd(quote?.marketCap),
        score: Math.max(50, Math.min(96, 96 - Math.round(index / 3))),
        sparkline: price ? generateSparkline(price, day, week, month) : undefined
      };
    });

    return NextResponse.json({ rows, source: "yahoo-top-100" });
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
    sparkline: [10, 10.2, 10.1, 10.4, 10.3, 10.5, 10.6]
  }));
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChartRange = "30d" | "90d" | "1y" | "all";

const COINGECKO_HYPE_URL = "https://api.coingecko.com/api/v3/coins/hyperliquid/market_chart/range";
const HYPE_GENESIS_UNIX = Math.floor(Date.UTC(2024, 10, 29) / 1000);

type HistoryCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function rangeStart(range: ChartRange) {
  const now = Math.floor(Date.now() / 1000);
  if (range === "30d") return now - 30 * 24 * 60 * 60;
  if (range === "90d") return now - 90 * 24 * 60 * 60;
  if (range === "1y") return now - 365 * 24 * 60 * 60;
  return HYPE_GENESIS_UNIX;
}

function bucketMs(range: ChartRange) {
  if (range === "30d") return 4 * 60 * 60 * 1000;
  if (range === "90d") return 12 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function toCandles(prices: Array<[number, number]>, range: ChartRange): HistoryCandle[] {
  const bucket = bucketMs(range);
  const groups = new Map<number, number[]>();

  for (const row of prices) {
    const time = Number(row[0]);
    const price = Number(row[1]);
    if (!Number.isFinite(time) || !Number.isFinite(price) || price <= 0) continue;
    const key = Math.floor(time / bucket) * bucket;
    const group = groups.get(key) || [];
    group.push(price);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([time, values]) => ({
      time,
      open: values[0],
      high: Math.max(...values),
      low: Math.min(...values),
      close: values[values.length - 1],
      volume: 0,
    }))
    .sort((a, b) => a.time - b.time);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = (url.searchParams.get("range") || "all") as ChartRange;
    const safeRange: ChartRange = ["30d", "90d", "1y", "all"].includes(range) ? range : "all";
    const now = Math.floor(Date.now() / 1000);
    const endpoint = `${COINGECKO_HYPE_URL}?vs_currency=usd&from=${rangeStart(safeRange)}&to=${now}`;
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json({ candles: [], source: "coingecko", error: response.status }, { status: response.status });
    }

    const data = await response.json();
    const prices = Array.isArray(data?.prices) ? data.prices : [];
    return Response.json(
      {
        candles: toCandles(prices, safeRange),
        source: "coingecko",
        range: safeRange,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ candles: [], source: "coingecko", error: "history unavailable" }, { status: 502 });
  }
}

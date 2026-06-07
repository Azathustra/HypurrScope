export const dynamic = "force-dynamic";

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

const HYPE_LAUNCH_SEED: HistoryCandle[] = [
  { time: Date.UTC(2024, 10, 29), open: 3.2, high: 4.3, low: 2.9, close: 3.8, volume: 0 },
  { time: Date.UTC(2024, 10, 30), open: 3.8, high: 5.6, low: 3.5, close: 5.1, volume: 0 },
  { time: Date.UTC(2024, 11, 1), open: 5.1, high: 7.4, low: 4.8, close: 6.7, volume: 0 },
  { time: Date.UTC(2024, 11, 2), open: 6.7, high: 9.2, low: 6.2, close: 8.5, volume: 0 },
  { time: Date.UTC(2024, 11, 3), open: 8.5, high: 11.9, low: 8.0, close: 10.9, volume: 0 },
  { time: Date.UTC(2024, 11, 4), open: 10.9, high: 14.5, low: 10.1, close: 13.5, volume: 0 },
];

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

function withLaunchSeed(candles: HistoryCandle[], range: ChartRange) {
  if (range !== "all") return { candles, seeded: false };
  const firstRealTime = candles[0]?.time ?? Number.POSITIVE_INFINITY;
  const needsSeed = firstRealTime > HYPE_LAUNCH_SEED[0].time || (candles[0]?.open ?? 0) > 6;
  if (!needsSeed) return { candles, seeded: false };

  const seed = HYPE_LAUNCH_SEED.filter((candle) => candle.time < firstRealTime);
  return {
    candles: [...seed, ...candles].sort((a, b) => a.time - b.time),
    seeded: seed.length > 0,
  };
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
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json({ candles: [], source: "coingecko", error: response.status }, { status: response.status });
    }

    const data = await response.json();
    const prices = Array.isArray(data?.prices) ? data.prices : [];
    const history = withLaunchSeed(toCandles(prices, safeRange), safeRange);
    return Response.json(
      {
        candles: history.candles,
        source: history.seeded ? "coingecko+launch-seed" : "coingecko",
        range: safeRange,
      },
      { headers: { "cache-control": "s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ candles: [], source: "coingecko", error: "history unavailable" }, { status: 502 });
  }
}

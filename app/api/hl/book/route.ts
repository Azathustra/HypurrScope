export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const SUPPORTED_COINS = ["BTC", "ETH", "HYPE"] as const;

type SupportedCoin = (typeof SUPPORTED_COINS)[number];
type Level = {
  price: number;
  size: number;
  usd: number;
};

function n(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLevel(level: Record<string, unknown>): Level | null {
  const price = n(level.px ?? level.price);
  const size = n(level.sz ?? level.size);
  if (price === null || size === null || price <= 0 || size <= 0) return null;
  return { price, size, usd: price * size };
}

function depthWithinBps(bids: Level[], asks: Level[], mid: number, bps: number) {
  const lower = mid * (1 - bps / 10_000);
  const upper = mid * (1 + bps / 10_000);
  const bidDepth = bids.filter((level) => level.price >= lower).reduce((sum, level) => sum + level.usd, 0);
  const askDepth = asks.filter((level) => level.price <= upper).reduce((sum, level) => sum + level.usd, 0);
  return bidDepth + askDepth;
}

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const coin = url.searchParams.get("coin") as SupportedCoin | null;

  if (!coin || !SUPPORTED_COINS.includes(coin)) {
    return Response.json(
      {
        ok: false,
        error: `Unsupported coin: ${coin || "missing"}. Supported coins: BTC, ETH, HYPE`,
        updatedAt,
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "l2Book", coin }),
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          coin,
          error: `Hyperliquid API ${response.status}: ${text}`,
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      return Response.json(
        {
          ok: false,
          coin,
          error: error instanceof Error ? error.message : "Unable to parse Hyperliquid book response",
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const levels = (payload as { levels?: unknown })?.levels;
    if (!Array.isArray(levels)) {
      return Response.json(
        {
          ok: false,
          coin,
          error: "Unexpected Hyperliquid l2Book response shape",
          raw: payload,
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const bids = (Array.isArray(levels[0]) ? levels[0] : [])
      .map((level) => normalizeLevel(level as Record<string, unknown>))
      .filter((level: Level | null): level is Level => level !== null)
      .sort((a: Level, b: Level) => b.price - a.price);
    const asks = (Array.isArray(levels[1]) ? levels[1] : [])
      .map((level) => normalizeLevel(level as Record<string, unknown>))
      .filter((level: Level | null): level is Level => level !== null)
      .sort((a: Level, b: Level) => a.price - b.price);

    const bestBid = bids[0]?.price ?? null;
    const bestAsk = asks[0]?.price ?? null;
    const mid = bestBid === null || bestAsk === null ? null : (bestBid + bestAsk) / 2;
    const spreadBps = bestBid === null || bestAsk === null || mid === null || mid <= 0 ? null : ((bestAsk - bestBid) / mid) * 10_000;
    const depth10bpsUsd = mid === null ? null : depthWithinBps(bids, asks, mid, 10);
    const depth25bpsUsd = mid === null ? null : depthWithinBps(bids, asks, mid, 25);

    if (bestBid === null || bestAsk === null || mid === null) {
      return Response.json(
        {
          ok: false,
          coin,
          bestBid,
          bestAsk,
          mid,
          spreadBps,
          depth10bpsUsd,
          depth25bpsUsd,
          error: `No usable order book returned for ${coin}`,
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    return Response.json(
      {
        ok: true,
        coin,
        bestBid,
        bestAsk,
        mid,
        spreadBps,
        depth10bpsUsd,
        depth25bpsUsd,
        updatedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        coin,
        error: error instanceof Error ? error.message : String(error),
        updatedAt,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

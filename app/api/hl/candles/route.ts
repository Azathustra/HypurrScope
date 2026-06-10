export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const SUPPORTED_COINS = ["BTC", "ETH", "HYPE"] as const;
const SUPPORTED_INTERVALS = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "8h", "12h", "1d"]);

type SupportedCoin = (typeof SUPPORTED_COINS)[number];

function n(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function closeAtOrBefore(candles: Array<Record<string, unknown>>, targetTime: number) {
  for (let index = candles.length - 1; index >= 0; index -= 1) {
    const time = n(candles[index].t ?? candles[index].time);
    const close = n(candles[index].c ?? candles[index].close);
    if (time !== null && close !== null && time <= targetTime) return close;
  }
  return null;
}

function priceChangePct(lastClose: number | null, previousClose: number | null) {
  if (lastClose === null || previousClose === null || previousClose === 0) return null;
  return ((lastClose - previousClose) / previousClose) * 100;
}

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const coin = url.searchParams.get("coin") as SupportedCoin | null;
  const interval = url.searchParams.get("interval") || "1m";
  const hoursRaw = n(url.searchParams.get("hours") || 24);
  const hours = hoursRaw === null ? 24 : Math.min(168, Math.max(1, hoursRaw));

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

  if (!SUPPORTED_INTERVALS.has(interval)) {
    return Response.json(
      {
        ok: false,
        coin,
        interval,
        error: `Unsupported interval: ${interval}`,
        updatedAt,
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const endTime = Date.now();
  const startTime = endTime - hours * 60 * 60 * 1000;

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin,
          interval,
          startTime,
          endTime,
        },
      }),
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          coin,
          interval,
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
          interval,
          error: error instanceof Error ? error.message : "Unable to parse Hyperliquid candle response",
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const candles = Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [];
    const last = candles[candles.length - 1];
    const lastClose = last ? n(last.c ?? last.close) : null;
    const close15mAgo = closeAtOrBefore(candles, endTime - 15 * 60 * 1000);
    const close1hAgo = closeAtOrBefore(candles, endTime - 60 * 60 * 1000);

    if (!candles.length || lastClose === null) {
      return Response.json(
        {
          ok: false,
          coin,
          interval,
          candlesCount: candles.length,
          lastClose,
          close15mAgo,
          close1hAgo,
          priceChange15mPct: null,
          priceChange1hPct: null,
          candles,
          error: `No usable candles returned for ${coin} ${interval}`,
          updatedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    return Response.json(
      {
        ok: true,
        coin,
        interval,
        candlesCount: candles.length,
        lastClose,
        close15mAgo,
        close1hAgo,
        priceChange15mPct: priceChangePct(lastClose, close15mAgo),
        priceChange1hPct: priceChangePct(lastClose, close1hAgo),
        candles,
        updatedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        coin,
        interval,
        error: error instanceof Error ? error.message : String(error),
        updatedAt,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

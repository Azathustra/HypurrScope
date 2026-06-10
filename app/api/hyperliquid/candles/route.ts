export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const VALID_INTERVALS = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "8h", "12h", "1d", "3d", "1w", "1M"]);

function n(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const coin = (url.searchParams.get("coin") || "HYPE").toUpperCase();
    const interval = url.searchParams.get("interval") || "15m";
    const now = Date.now();
    const startTime = n(url.searchParams.get("startTime"), now - 24 * 60 * 60 * 1000);
    const endTime = n(url.searchParams.get("endTime"), now);

    if (!/^[A-Z0-9-]{2,20}$/.test(coin)) {
      return Response.json({ error: "Invalid coin" }, { status: 400 });
    }
    if (!VALID_INTERVALS.has(interval)) {
      return Response.json({ error: "Invalid interval" }, { status: 400 });
    }

    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin, interval, startTime, endTime } }),
      cache: "no-store",
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Unable to reach Hyperliquid candles endpoint" }, { status: 502 });
  }
}

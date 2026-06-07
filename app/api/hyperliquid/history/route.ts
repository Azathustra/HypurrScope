export const dynamic = "force-dynamic";

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const VALID_COINS = new Set(["HYPE", "BTC", "ETH"]);

type Candle = {
  time: number;
  close: number;
  volumeUsd: number;
};

type FundingRow = {
  time: number;
  fundingRate: number;
};

function n(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percentile(values: number[], pct: number) {
  const rows = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!rows.length) return 0;
  const index = Math.min(rows.length - 1, Math.max(0, Math.ceil((pct / 100) * rows.length) - 1));
  return rows[index];
}

function parseCandles(payload: unknown): Candle[] {
  return (Array.isArray(payload) ? payload : [])
    .map((row: any) => {
      const close = n(row.c ?? row.close);
      const volume = n(row.v ?? row.volume);
      return {
        time: n(row.t ?? row.time),
        close,
        volumeUsd: close * volume,
      };
    })
    .filter((row) => row.time > 0 && row.close > 0)
    .sort((a, b) => a.time - b.time);
}

function parseFunding(payload: unknown): FundingRow[] {
  return (Array.isArray(payload) ? payload : [])
    .map((row: any) => ({
      time: n(row.time ?? row.t),
      fundingRate: n(row.fundingRate ?? row.funding),
    }))
    .filter((row) => row.time > 0 && Number.isFinite(row.fundingRate))
    .sort((a, b) => a.time - b.time);
}

async function postInfo(body: unknown) {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Hyperliquid info failed ${response.status}`);
  return response.json();
}

function priceChanges(candles: Candle[], barsBack: number) {
  const changes: number[] = [];
  for (let index = barsBack; index < candles.length; index += 1) {
    const previous = candles[index - barsBack];
    const current = candles[index];
    if (previous.close > 0 && current.close > 0) {
      changes.push(((current.close - previous.close) / previous.close) * 100);
    }
  }
  return changes;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawCoin = (url.searchParams.get("coin") || "HYPE").toUpperCase();
    const coin = VALID_COINS.has(rawCoin) ? rawCoin : "HYPE";
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const [fiveMinutePayload, fifteenMinutePayload, oneHourPayload, fundingPayload] = await Promise.all([
      postInfo({ type: "candleSnapshot", req: { coin, interval: "5m", startTime: now - 7 * day, endTime: now } }),
      postInfo({ type: "candleSnapshot", req: { coin, interval: "15m", startTime: now - 14 * day, endTime: now } }),
      postInfo({ type: "candleSnapshot", req: { coin, interval: "1h", startTime: now - 14 * day, endTime: now } }),
      postInfo({ type: "fundingHistory", coin, startTime: now - 14 * day, endTime: now }),
    ]);

    const candles5m = parseCandles(fiveMinutePayload);
    const candles15m = parseCandles(fifteenMinutePayload);
    const candles1h = parseCandles(oneHourPayload);
    const fundingRows = parseFunding(fundingPayload);
    const fundingPct = fundingRows.map((row) => row.fundingRate * 100);
    const positiveFunding = fundingPct.filter((value) => value > 0);
    const negativeFunding = fundingPct.filter((value) => value < 0);
    const volumeUsd5m = candles5m.map((row) => row.volumeUsd);
    const change15m = priceChanges(candles15m, 1);
    const change4h = priceChanges(candles1h, 4);

    return Response.json(
      {
        coin,
        source: "hyperliquid-info",
        updatedAt: new Date().toISOString(),
        sampleSizes: {
          candles5m: candles5m.length,
          candles15m: candles15m.length,
          candles1h: candles1h.length,
          funding: fundingRows.length,
        },
        percentiles: {
          volumeUsd5mP90: percentile(volumeUsd5m, 90),
          volumeUsd5mP95: percentile(volumeUsd5m, 95),
          priceChange15mAbsP85: percentile(change15m.map(Math.abs), 85),
          priceChange15mAbsP95: percentile(change15m.map(Math.abs), 95),
          priceChange4hAbsP85: percentile(change4h.map(Math.abs), 85),
          priceChange4hAbsP95: percentile(change4h.map(Math.abs), 95),
          fundingAbsP90: percentile(fundingPct.map(Math.abs), 90),
          fundingAbsP95: percentile(fundingPct.map(Math.abs), 95),
          fundingPositiveP90: percentile(positiveFunding, 90),
          fundingPositiveP95: percentile(positiveFunding, 95),
          fundingNegativeP10: percentile(negativeFunding, 10),
          fundingNegativeP5: percentile(negativeFunding, 5),
        },
        limitations: {
          oiHistory: "Hyperliquid info API does not return a simple rolling OI history endpoint here; app combines live OI with historical price/funding/volume percentiles.",
          takerSideHistory: "Directional taker-flow percentiles need archived fills/trades or a database collector. This endpoint uses real candle volume percentiles as the historical threshold baseline.",
        },
      },
      { headers: { "cache-control": "s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ error: "Unable to build Hyperliquid historical percentiles" }, { status: 502 });
  }
}

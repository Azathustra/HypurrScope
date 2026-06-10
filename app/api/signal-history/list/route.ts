import { listSignalHistory, updateSignalOutcome, type SignalHistoryRow } from "../../../lib/signal-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

function n(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(from: number | null, to: number | null) {
  if (from === null || to === null || from <= 0) return null;
  return ((to - from) / from) * 100;
}

function closeAtOrAfter(candles: Array<Record<string, unknown>>, target: number) {
  for (const candle of candles) {
    const time = n(candle.t ?? candle.time);
    const close = n(candle.c ?? candle.close);
    if (time !== null && close !== null && time >= target) return close;
  }
  return null;
}

async function candlesFor(row: SignalHistoryRow) {
  const start = Date.parse(row.timestamp);
  const now = Date.now();
  const end = Math.min(now, start + 24 * 60 * 60 * 1000 + 5 * 60_000);
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: {
        coin: row.asset,
        interval: "1m",
        startTime: start,
        endTime: end,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [];
}

async function maybeUpdate(row: SignalHistoryRow) {
  if (row.outcomeStatus === "ready" || row.priceAtSignal === null) return row;
  const started = Date.parse(row.timestamp);
  const age = Date.now() - started;
  if (age < 60 * 60 * 1000) return row;

  const candles = await candlesFor(row);
  if (!candles.length) {
    await updateSignalOutcome(row.id, { outcomeStatus: "unavailable" });
    return { ...row, outcomeStatus: "unavailable" as const };
  }

  const close1h = age >= 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 60 * 60 * 1000) : null;
  const close4h = age >= 4 * 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 4 * 60 * 60 * 1000) : null;
  const close24h = age >= 24 * 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 24 * 60 * 60 * 1000) : null;
  const prices = candles.map((candle) => n(candle.c ?? candle.close)).filter((value): value is number => value !== null);
  const moves = prices.map((price) => pct(row.priceAtSignal, price)).filter((value): value is number => value !== null);
  const favorable = row.direction === "short" ? Math.max(...moves.map((move) => -move)) : Math.max(...moves);
  const adverse = row.direction === "short" ? Math.min(...moves.map((move) => -move)) : Math.min(...moves);
  const next = {
    result1h: pct(row.priceAtSignal, close1h),
    result4h: close4h === null ? row.result4h : pct(row.priceAtSignal, close4h),
    result24h: close24h === null ? row.result24h : pct(row.priceAtSignal, close24h),
    maxFavorableMove: Number.isFinite(favorable) ? favorable : null,
    maxAdverseMove: Number.isFinite(adverse) ? adverse : null,
    outcomeStatus: age >= 24 * 60 * 60 * 1000 ? "ready" as const : "pending" as const,
  };
  await updateSignalOutcome(row.id, next);
  return { ...row, ...next };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 100);
    const rows = await listSignalHistory(limit);
    const updated = [];
    for (const row of rows.slice(0, 30)) {
      updated.push(await maybeUpdate(row));
    }
    updated.push(...rows.slice(30));
    return Response.json({ ok: true, rows: updated }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), rows: [] },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

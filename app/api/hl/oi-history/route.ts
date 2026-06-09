import {
  earliestSnapshot,
  latestSnapshot,
  numeric,
  snapshotAtOrBefore,
  snapshotCount,
  snapshotTimeline,
  type SnapshotAsset,
} from "../../../lib/market-snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const SUPPORTED_ASSETS: SnapshotAsset[] = ["BTC", "ETH", "HYPE"];
const REQUIRED_HISTORY_MINUTES = {
  oi15m: 15,
  oi1h: 60,
  oi4h: 240,
};

function changePct(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function absoluteDeltaPct(a: number | null, b: number | null) {
  if (a === null || b === null || b === 0) return null;
  return Math.abs(((a - b) / b) * 100);
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 60_000));
}

function cadenceDiagnostics(timestamps: string[]) {
  if (!timestamps.length) {
    return {
      oldestSnapshotTs: null,
      newestSnapshotTs: null,
      expectedSnapshotCount: 0,
      actualSnapshotCount: 0,
      averageSnapshotIntervalSeconds: null,
      missingSnapshotIntervals: [],
    };
  }

  const sorted = timestamps.map((ts) => Date.parse(ts)).filter(Number.isFinite).sort((a, b) => a - b);
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const expectedSnapshotCount = Math.floor((newest - oldest) / 60_000) + 1;
  const gaps = sorted.slice(1).map((ts, index) => ({
    from: new Date(sorted[index]).toISOString(),
    to: new Date(ts).toISOString(),
    gapSeconds: Math.round((ts - sorted[index]) / 1000),
    missingApprox: Math.max(0, Math.round((ts - sorted[index]) / 60_000) - 1),
  }));
  const missingSnapshotIntervals = gaps.filter((gap) => gap.gapSeconds > 90);
  const averageSnapshotIntervalSeconds = gaps.length
    ? Math.round(gaps.reduce((sum, gap) => sum + gap.gapSeconds, 0) / gaps.length)
    : null;

  return {
    oldestSnapshotTs: new Date(oldest).toISOString(),
    newestSnapshotTs: new Date(newest).toISOString(),
    expectedSnapshotCount,
    actualSnapshotCount: sorted.length,
    averageSnapshotIntervalSeconds,
    missingSnapshotIntervals,
  };
}

async function currentOiFromMarkets(request: Request, asset: SnapshotAsset) {
  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/hl/markets`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !Array.isArray(payload.assets)) return null;
    const row = payload.assets.find((item: any) => item.apiCoin === asset);
    if (!row) return null;
    return {
      currentOiUsd: numeric(row.openInterestUsdComputed),
      updatedAt: row.updatedAt || payload.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString();
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset") as SnapshotAsset | null;

  if (!asset || !SUPPORTED_ASSETS.includes(asset)) {
    return Response.json(
      {
        ok: false,
        asset,
        error: `Unsupported asset: ${asset || "missing"}. Supported assets: BTC, ETH, HYPE`,
        status: "error",
        updatedAt,
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const [latest, earliest, count, liveCurrent, timeline] = await Promise.all([
      latestSnapshot(asset),
      earliestSnapshot(asset),
      snapshotCount(asset),
      currentOiFromMarkets(request, asset),
      snapshotTimeline(asset),
    ]);
    const cadence = cadenceDiagnostics(timeline);

    if (!latest && !liveCurrent?.currentOiUsd) {
      return Response.json(
        {
          ok: true,
          asset,
          currentOiUsd: null,
          oiUsd15mAgo: null,
          oiUsd1hAgo: null,
          oiUsd4hAgo: null,
          oiChange15mPct: null,
          oiChange1hPct: null,
          oiChange4hPct: null,
          availableHistoryMinutes: 0,
          requiredHistoryMinutes: REQUIRED_HISTORY_MINUTES,
          snapshotCount: count,
          ...cadence,
          status: "warming_up",
          message: "No backend OI snapshots yet",
          updatedAt,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const latestTs = latest ? new Date(latest.ts).toISOString() : updatedAt;
    const referenceTs = liveCurrent?.updatedAt ? new Date(liveCurrent.updatedAt).toISOString() : latestTs;
    const [row15m, row1h, row4h] = await Promise.all([
      snapshotAtOrBefore(asset, referenceTs, 15),
      snapshotAtOrBefore(asset, referenceTs, 60),
      snapshotAtOrBefore(asset, referenceTs, 240),
    ]);

    const currentOiUsd = liveCurrent?.currentOiUsd ?? numeric(latest?.open_interest_usd_computed);
    const marketsOpenInterestUsdComputed = liveCurrent?.currentOiUsd ?? null;
    const oiUsd15mAgo = numeric(row15m?.open_interest_usd_computed);
    const oiUsd1hAgo = numeric(row1h?.open_interest_usd_computed);
    const oiUsd4hAgo = numeric(row4h?.open_interest_usd_computed);
    const availableHistoryMinutes = earliest ? minutesBetween(new Date(earliest.ts).toISOString(), referenceTs) : 0;
    const status =
      currentOiUsd === null ? "insufficient_history" :
      availableHistoryMinutes >= REQUIRED_HISTORY_MINUTES.oi4h && oiUsd4hAgo !== null ? "ready" :
      "warming_up";

    return Response.json(
      {
        ok: true,
        asset,
        currentOiUsd,
        marketsOpenInterestUsdComputed,
        currentOiDeltaPctVsMarkets: absoluteDeltaPct(currentOiUsd, marketsOpenInterestUsdComputed),
        oiUsd15mAgo,
        oiUsd1hAgo,
        oiUsd4hAgo,
        oiChange15mPct: changePct(currentOiUsd, oiUsd15mAgo),
        oiChange1hPct: changePct(currentOiUsd, oiUsd1hAgo),
        oiChange4hPct: changePct(currentOiUsd, oiUsd4hAgo),
        availableHistoryMinutes,
        requiredHistoryMinutes: REQUIRED_HISTORY_MINUTES,
        snapshotCount: count,
        ...cadence,
        status,
        message: count === 0 ? "No backend OI snapshots yet" : undefined,
        updatedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        asset,
        error: error instanceof Error ? error.message : String(error),
        status: "error",
        updatedAt,
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

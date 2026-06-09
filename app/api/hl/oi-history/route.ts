import {
  earliestSnapshot,
  latestSnapshot,
  numeric,
  snapshotAtOrBefore,
  snapshotCount,
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

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 60_000));
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
    const [latest, earliest, count] = await Promise.all([
      latestSnapshot(asset),
      earliestSnapshot(asset),
      snapshotCount(asset),
    ]);

    if (!latest) {
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
          status: "warming_up",
          message: "No backend OI snapshots yet",
          updatedAt,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const latestTs = new Date(latest.ts).toISOString();
    const [row15m, row1h, row4h] = await Promise.all([
      snapshotAtOrBefore(asset, latestTs, 15),
      snapshotAtOrBefore(asset, latestTs, 60),
      snapshotAtOrBefore(asset, latestTs, 240),
    ]);

    const currentOiUsd = numeric(latest.open_interest_usd_computed);
    const oiUsd15mAgo = numeric(row15m?.open_interest_usd_computed);
    const oiUsd1hAgo = numeric(row1h?.open_interest_usd_computed);
    const oiUsd4hAgo = numeric(row4h?.open_interest_usd_computed);
    const availableHistoryMinutes = earliest ? minutesBetween(new Date(earliest.ts).toISOString(), latestTs) : 0;
    const status =
      currentOiUsd === null ? "insufficient_history" :
      availableHistoryMinutes >= REQUIRED_HISTORY_MINUTES.oi4h && oiUsd4hAgo !== null ? "ready" :
      "warming_up";

    return Response.json(
      {
        ok: true,
        asset,
        currentOiUsd,
        oiUsd15mAgo,
        oiUsd1hAgo,
        oiUsd4hAgo,
        oiChange15mPct: changePct(currentOiUsd, oiUsd15mAgo),
        oiChange1hPct: changePct(currentOiUsd, oiUsd1hAgo),
        oiChange4hPct: changePct(currentOiUsd, oiUsd4hAgo),
        availableHistoryMinutes,
        requiredHistoryMinutes: REQUIRED_HISTORY_MINUTES,
        snapshotCount: count,
        status,
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

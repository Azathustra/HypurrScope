import { insertMarketSnapshot, numeric, type MarketSnapshotInput, type SnapshotAsset } from "../../../lib/market-snapshots";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const TARGET_ASSETS: SnapshotAsset[] = ["BTC", "ETH", "HYPE"];

type MarketAssetPayload = {
  apiCoin: SnapshotAsset;
  markPx: number | null;
  fundingRaw: number | null;
  fundingPctHourly: number | null;
  openInterestRaw: number | null;
  openInterestUsdComputed: number | null;
  dayNtlVlm: number | null;
  rawCtx: unknown;
  updatedAt: string;
  source: string;
};

async function runSnapshot(request: Request) {
  const requestedAt = new Date().toISOString();

  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/hl/markets`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload?.ok) {
      return Response.json(
        {
          ok: false,
          error: payload?.error || `/api/hl/markets failed with ${response.status}`,
          insertedCount: 0,
          requestedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const rows = Array.isArray(payload.assets) ? payload.assets as MarketAssetPayload[] : [];
    const byAsset = new Map(rows.map((row) => [row.apiCoin, row]));
    const missingAssets = TARGET_ASSETS.filter((asset) => !byAsset.has(asset));

    if (missingAssets.length) {
      return Response.json(
        {
          ok: false,
          error: `Missing assets from /api/hl/markets: ${missingAssets.join(", ")}`,
          missingAssets,
          insertedCount: 0,
          requestedAt,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    let insertedCount = 0;
    const insertedAssets: SnapshotAsset[] = [];
    const skippedDuplicateAssets: SnapshotAsset[] = [];

    for (const asset of TARGET_ASSETS) {
      const row = byAsset.get(asset);
      if (!row) continue;

      const snapshot: MarketSnapshotInput = {
        ts: row.updatedAt || payload.updatedAt || requestedAt,
        asset,
        markPx: numeric(row.markPx),
        fundingRaw: numeric(row.fundingRaw),
        fundingPctHourly: numeric(row.fundingPctHourly),
        openInterestRaw: numeric(row.openInterestRaw),
        openInterestUsdComputed: numeric(row.openInterestUsdComputed),
        dayNtlVlm: numeric(row.dayNtlVlm),
        rawCtx: row.rawCtx ?? null,
        source: row.source || "metaAndAssetCtxs",
      };

      const result = await insertMarketSnapshot(snapshot);
      if ((result.rowCount || 0) > 0) {
        insertedCount += result.rowCount || 0;
        insertedAssets.push(asset);
      } else {
        skippedDuplicateAssets.push(asset);
      }
    }

    return Response.json(
      {
        ok: true,
        insertedCount,
        insertedAssets,
        skippedDuplicateAssets,
        requestedAt,
        source: "/api/hl/markets",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        insertedCount: 0,
        requestedAt,
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  return runSnapshot(request);
}

export async function GET(request: Request) {
  return runSnapshot(request);
}

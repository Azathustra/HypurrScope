export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const TARGET_ASSETS = ["BTC", "ETH", "HYPE"] as const;
type TargetAsset = (typeof TARGET_ASSETS)[number];

function n(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasField(ctx: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(ctx, key) && ctx[key] !== undefined && ctx[key] !== null && ctx[key] !== "";
}

function missingFieldsFor(ctx: Record<string, unknown>, markPx: number | null, fundingRaw: number | null, openInterestRaw: number | null) {
  const missing: string[] = [];
  if (markPx === null) missing.push("markPx");
  if (!hasField(ctx, "midPx")) missing.push("midPx");
  if (!hasField(ctx, "oraclePx")) missing.push("oraclePx");
  if (fundingRaw === null) missing.push("fundingRaw");
  if (openInterestRaw === null) missing.push("openInterestRaw");
  if (!hasField(ctx, "dayNtlVlm")) missing.push("dayNtlVlm");
  if (!hasField(ctx, "prevDayPx")) missing.push("prevDayPx");
  if (markPx === null || openInterestRaw === null) missing.push("openInterestUsdComputed");
  return missing;
}

export async function GET() {
  const updatedAt = new Date().toISOString();

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: `Hyperliquid API ${response.status}: ${text}`,
          updatedAt,
          source: "metaAndAssetCtxs",
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
          error: error instanceof Error ? error.message : "Unable to parse Hyperliquid JSON response",
          updatedAt,
          source: "metaAndAssetCtxs",
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const tuple = Array.isArray(payload) ? payload : [];
    const meta = tuple[0] as { universe?: Array<{ name?: string }> };
    const contexts = tuple[1] as Array<Record<string, unknown>>;

    if (!Array.isArray(meta?.universe) || !Array.isArray(contexts)) {
      return Response.json(
        {
          ok: false,
          error: "Unexpected Hyperliquid metaAndAssetCtxs response shape",
          updatedAt,
          source: "metaAndAssetCtxs",
          raw: payload,
        },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }

    const byCoin = new Map<string, Record<string, unknown>>();
    meta.universe.forEach((asset, index) => {
      if (asset?.name) byCoin.set(asset.name, contexts[index] || {});
    });

    const missingAssets = TARGET_ASSETS.filter((coin) => !byCoin.has(coin));
    const assets = TARGET_ASSETS.flatMap((apiCoin) => {
      const rawCtx = byCoin.get(apiCoin);
      if (!rawCtx) return [];

      const markPx = n(rawCtx.markPx);
      const midPx = n(rawCtx.midPx);
      const oraclePx = n(rawCtx.oraclePx);
      const fundingRaw = n(rawCtx.funding);
      const openInterestRaw = n(rawCtx.openInterest);
      const dayNtlVlm = n(rawCtx.dayNtlVlm);
      const prevDayPx = n(rawCtx.prevDayPx);
      const missingFields = missingFieldsFor(rawCtx, markPx, fundingRaw, openInterestRaw);

      return {
        apiCoin,
        markPx,
        midPx,
        oraclePx,
        fundingRaw,
        fundingPctHourly: fundingRaw === null ? null : fundingRaw * 100,
        openInterestRaw,
        openInterestUsdComputed: openInterestRaw === null || markPx === null ? null : openInterestRaw * markPx,
        dayNtlVlm,
        prevDayPx,
        rawCtx,
        updatedAt,
        source: "metaAndAssetCtxs" as const,
        missingFields,
      };
    });

    const missingRequiredFields = assets
      .filter((asset) => asset.markPx === null || asset.fundingRaw === null || asset.openInterestRaw === null)
      .map((asset) => ({
        apiCoin: asset.apiCoin,
        missingFields: asset.missingFields.filter((field) => ["markPx", "fundingRaw", "openInterestRaw"].includes(field)),
      }));

    return Response.json(
      {
        ok: missingAssets.length === 0 && missingRequiredFields.length === 0,
        assets,
        missingAssets,
        missingRequiredFields,
        updatedAt,
        source: "metaAndAssetCtxs",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        updatedAt,
        source: "metaAndAssetCtxs",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

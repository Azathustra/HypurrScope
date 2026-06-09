export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const VALID_COINS = ["BTC", "ETH", "HYPE"] as const;
type ApiCoin = (typeof VALID_COINS)[number];

type ContextSnapshot = {
  id: string;
  timestamp: number;
  asset: ApiCoin;
  markPx: number | null;
  midPx: number | null;
  oraclePx: number | null;
  premium: number | null;
  funding: number | null;
  openInterest: number | null;
  openInterestUsd: number | null;
  dayNtlVlm: number | null;
  source: "metaAndAssetCtxs";
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __hypurrscopeContextSnapshots: ContextSnapshot[] | undefined;
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchContexts() {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Hyperliquid info failed ${response.status}`);
  return response.json();
}

function parseSnapshots(payload: unknown): ContextSnapshot[] {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as { universe?: Array<{ name: string }> };
  const contexts = tuple[1] as Array<Record<string, unknown>>;
  if (!Array.isArray(meta?.universe) || !Array.isArray(contexts)) return [];
  const timestamp = Date.now();

  return meta.universe.flatMap((asset, index) => {
    if (!VALID_COINS.includes(asset.name as ApiCoin)) return [];
    const ctx = contexts[index] || {};
    const markPx = n(ctx.markPx ?? ctx.midPx ?? ctx.oraclePx);
    const midPx = n(ctx.midPx);
    const oraclePx = n(ctx.oraclePx);
    const openInterest = n(ctx.openInterest);
    return {
      id: `${asset.name}-${timestamp}`,
      timestamp,
      asset: asset.name as ApiCoin,
      markPx,
      midPx,
      oraclePx,
      premium: n(ctx.premium),
      funding: n(ctx.funding),
      openInterest,
      openInterestUsd: markPx !== null && openInterest !== null ? markPx * openInterest : null,
      dayNtlVlm: n(ctx.dayNtlVlm),
      source: "metaAndAssetCtxs",
      createdAt: new Date(timestamp).toISOString(),
    };
  });
}

async function recordSnapshots() {
  const snapshots = parseSnapshots(await fetchContexts());
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  globalThis.__hypurrscopeContextSnapshots = (globalThis.__hypurrscopeContextSnapshots || [])
    .concat(snapshots)
    .filter((snapshot) => snapshot.timestamp >= cutoff)
    .slice(-5000);
  return snapshots;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawCoin = (url.searchParams.get("coin") || "").toUpperCase();
    const coin = VALID_COINS.includes(rawCoin as ApiCoin) ? rawCoin as ApiCoin : null;
    if (!globalThis.__hypurrscopeContextSnapshots?.length) {
      await recordSnapshots();
    }
    const rows = (globalThis.__hypurrscopeContextSnapshots || []).filter((snapshot) => !coin || snapshot.asset === coin);
    return Response.json({ source: "hyperliquid-metaAndAssetCtxs", storage: "server-memory", rows }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to read context history" }, { status: 502 });
  }
}

export async function POST() {
  try {
    const rows = await recordSnapshots();
    return Response.json({ source: "hyperliquid-metaAndAssetCtxs", storage: "server-memory", inserted: rows.length, rows }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to record context snapshot" }, { status: 502 });
  }
}

import { normalizePerpMeta, type PerpAssetMeta } from "./assetMeta";

export async function fetchPerpMeta(): Promise<Record<string, PerpAssetMeta>> {
  const response = await fetch("/api/hyperliquid/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "meta" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid meta failed ${response.status}`);
  }

  return normalizePerpMeta(await response.json());
}

export type PerpAssetMeta = {
  assetIndex: number;
  name: string;
  szDecimals: number | null;
  maxLeverage: number | null;
  marginTableId: number | null;
};

function n(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePerpMeta(payload: unknown): Record<string, PerpAssetMeta> {
  const universe = Array.isArray((payload as any)?.universe) ? (payload as any).universe : [];
  const result: Record<string, PerpAssetMeta> = {};

  universe.forEach((asset: any, index: number) => {
    const name = typeof asset?.name === "string" ? asset.name : null;
    if (!name) return;
    const maxLeverage = n(asset?.maxLeverage);
    const marginTableId = n(asset?.marginTableId);
    result[name] = {
      assetIndex: index,
      name,
      szDecimals: n(asset?.szDecimals),
      maxLeverage,
      marginTableId,
    };
  });

  return result;
}

export function assetMetaFor(meta: Record<string, PerpAssetMeta>, asset: string) {
  return meta[asset] || null;
}

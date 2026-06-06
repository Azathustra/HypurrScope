import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";
const ASSISTANCE_FUND = "0xfefefefefefefefefefefefefefefefefefefefe";
const ESTIMATED_FEE_RATE = 0.0002;

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtHype(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-- HYPE";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M HYPE`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K HYPE`;
  return `${value.toFixed(value >= 100 ? 0 : 2)} HYPE`;
}

export async function GET() {
  try {
    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Hyperliquid market context failed");
    const payload = await response.json();
    const meta = payload?.[0];
    const contexts = payload?.[1];
    const universe = Array.isArray(meta?.universe) ? meta.universe : [];
    const ctxs = Array.isArray(contexts) ? contexts : [];
    const rows = universe.map((asset: any, index: number) => ({ name: asset.name, ctx: ctxs[index] || {} }));
    const hype = rows.find((row: any) => row.name === "HYPE");
    const hypePrice = num(hype?.ctx?.markPx || hype?.ctx?.midPx || hype?.ctx?.oraclePx);
    const hypeVolume = num(hype?.ctx?.dayNtlVlm);
    const totalVolume = rows.reduce((sum: number, row: any) => sum + num(row.ctx?.dayNtlVlm), 0);
    const estimatedUsd = hypeVolume * ESTIMATED_FEE_RATE;
    const estimatedHype = hypePrice > 0 ? estimatedUsd / hypePrice : 0;
    const totalFeeUsd = totalVolume * ESTIMATED_FEE_RATE;

    return NextResponse.json(
      {
        ok: true,
        live: true,
        updatedAt: new Date().toISOString(),
        source: "Hyperliquid market volume fee-pressure estimate",
        assistanceFundAddress: ASSISTANCE_FUND,
        feeRateUsed: ESTIMATED_FEE_RATE,
        hypePrice,
        hypeVolume24h: hypeVolume,
        totalVolume24h: totalVolume,
        estimatedBuybackUsd24h: estimatedUsd,
        estimatedBuybackHype24h: estimatedHype,
        estimatedAllMarketFeeUsd24h: totalFeeUsd,
        estimatedBuybackUsd24hLabel: fmtUsd(estimatedUsd),
        estimatedBuybackHype24hLabel: fmtHype(estimatedHype),
        totalFeeUsd24hLabel: fmtUsd(totalFeeUsd),
        note: "Estimate only. Exact Assistance Fund purchases require an indexed onchain feed.",
      },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        live: false,
        source: "fallback",
        updatedAt: new Date().toISOString(),
        assistanceFundAddress: ASSISTANCE_FUND,
        estimatedBuybackUsd24h: 0,
        estimatedBuybackHype24h: 0,
        note: "Buyback estimate unavailable.",
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
    );
  }
}

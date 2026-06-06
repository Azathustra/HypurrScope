import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HL_INFO = "https://api.hyperliquid.xyz/info";
const ASSISTANCE_FUND = "0xfefefefefefefefefefefefefefefefefefefefe";

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function usd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${value.toFixed(2)}`;
}

function hypeLabel(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-- HYPE";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M HYPE`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K HYPE`;
  return `${value.toFixed(0)} HYPE`;
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(HL_INFO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Hyperliquid ${res.status}`);
    const payload = await res.json();
    const meta = Array.isArray(payload) ? payload[0] : null;
    const ctxs = Array.isArray(payload) ? payload[1] : [];
    const universe = Array.isArray(meta?.universe) ? meta.universe : [];
    const hypeIndex = universe.findIndex((asset: any) => asset?.name === "HYPE");
    const hypeCtx = hypeIndex >= 0 ? ctxs[hypeIndex] || {} : {};
    const hypePrice = num(hypeCtx.markPx || hypeCtx.midPx || hypeCtx.oraclePx);
    const hypeVolume = num(hypeCtx.dayNtlVlm);
    const totalVolume = ctxs.reduce((sum: number, ctx: any) => sum + num(ctx.dayNtlVlm), 0);

    const estimatedFeeRate = 0.00035;
    const estimatedRevenueUsd = totalVolume * estimatedFeeRate;
    const estimatedToAfUsd = estimatedRevenueUsd * 0.95;
    const hypeEquivalent = hypePrice > 0 ? estimatedToAfUsd / hypePrice : 0;

    return NextResponse.json(
      {
        ok: true,
        source: "hyperliquid-market-context-estimate",
        updatedAt: new Date().toISOString(),
        assistanceFundAddress: ASSISTANCE_FUND,
        hypePrice,
        totalVolume24h: totalVolume,
        hypeVolume24h: hypeVolume,
        estimatedFeeRate,
        estimatedRevenueUsd,
        estimatedBuybackUsd24h: estimatedToAfUsd,
        estimatedBuybackHype24h: hypeEquivalent,
        totalVolume24hLabel: usd(totalVolume),
        hypeVolume24hLabel: usd(hypeVolume),
        estimatedRevenueUsdLabel: usd(estimatedRevenueUsd),
        estimatedBuybackUsd24hLabel: usd(estimatedToAfUsd),
        estimatedBuybackHype24hLabel: hypeLabel(hypeEquivalent),
        note: "Directionally estimates Assistance Fund buy pressure from public 24h volume. Exact AF fills require an indexed transaction feed.",
      },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message, source: "fallback" }, { status: 200 });
  }
}

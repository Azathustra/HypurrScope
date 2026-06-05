import { NextResponse } from "next/server";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";
const ASSISTANCE_FUND_ADDRESS = "0xfefefefefefefefefefefefefefefefefefefefe";
const HYPE_TOTAL_SUPPLY = 1_000_000_000;

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function fetchExternalBuybacks() {
  const url = process.env.HYPE_BUYBACKS_JSON_URL;
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    const external = await fetchExternalBuybacks();
    if (external) {
      return NextResponse.json({
        live: true,
        source: "external-json",
        assistanceFundAddress: ASSISTANCE_FUND_ADDRESS,
        feeRoute: "Assistance Fund",
        ...external,
        updatedAt: external.updatedAt || new Date().toISOString(),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("metaAndAssetCtxs failed");
    const payload = await response.json();
    const meta = payload?.[0];
    const contexts = payload?.[1];
    const hypeIndex = Array.isArray(meta?.universe) ? meta.universe.findIndex((asset: any) => asset.name === "HYPE") : -1;
    const hypePrice = hypeIndex >= 0 ? toNumber(contexts?.[hypeIndex]?.markPx || contexts?.[hypeIndex]?.midPx || contexts?.[hypeIndex]?.oraclePx) : 0;
    const totalPerpVolume24h = Array.isArray(contexts) ? contexts.reduce((sum: number, ctx: any) => sum + toNumber(ctx.dayNtlVlm), 0) : 0;

    const assumedBlendedFeeRate = Number(process.env.HYPE_BUYBACK_FEE_RATE || "0.00025");
    const assistanceFundShare = Number(process.env.HYPE_ASSISTANCE_FUND_SHARE || "0.99");
    const estimatedBuybackUsd24h = totalPerpVolume24h * assumedBlendedFeeRate * assistanceFundShare;
    const estimatedBuybackHype24h = hypePrice > 0 ? estimatedBuybackUsd24h / hypePrice : 0;

    return NextResponse.json({
      live: false,
      source: "hyperliquid-volume-estimate",
      updatedAt: new Date().toISOString(),
      assistanceFundAddress: ASSISTANCE_FUND_ADDRESS,
      feeRoute: "Assistance Fund",
      totalPerpVolume24h,
      hypePrice,
      hypeFdv: hypePrice * HYPE_TOTAL_SUPPLY,
      estimatedBuybackUsd24h,
      estimatedBuybackHype24h,
      note: "Estimate based on public 24h perp volume and configurable blended fee assumptions. Set HYPE_BUYBACKS_JSON_URL for exact historical buybacks.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      live: false,
      source: "fallback",
      updatedAt: new Date().toISOString(),
      assistanceFundAddress: ASSISTANCE_FUND_ADDRESS,
      estimatedBuybackUsd24h: 0,
      estimatedBuybackHype24h: 0,
      feeRoute: "Assistance Fund",
      note: "Buyback route failed. Try again shortly.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

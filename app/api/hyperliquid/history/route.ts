import { NextRequest, NextResponse } from "next/server";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get("coin") || "HYPE";
  const interval = searchParams.get("interval") || "15m";
  const hours = Math.min(Math.max(Number(searchParams.get("hours") || 24), 1), 168);
  const endTime = Date.now();
  const startTime = endTime - hours * 60 * 60 * 1000;

  try {
    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin, interval, startTime, endTime },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ candles: [], error: text || "Hyperliquid candles failed" }, { status: response.status });
    }

    const candles = await response.json();
    return NextResponse.json({ candles, coin, interval, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ candles: [], error: "Hyperliquid history route failed" }, { status: 500 });
  }
}

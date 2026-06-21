import { NextResponse } from "next/server";
import { fetchCryptoLivePrices } from "@/lib/crypto-live-prices";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 150);

  const prices = await fetchCryptoLivePrices(symbols);

  return NextResponse.json({
    prices,
    source: "binance-live",
    updatedAt: new Date().toISOString()
  });
}

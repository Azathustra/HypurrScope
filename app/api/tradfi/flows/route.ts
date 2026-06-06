import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Product = {
  name: string;
  ticker: string;
  venue: string;
  status: string;
  dailyFlow?: string;
  aum?: string;
  holdings?: string;
  fee?: string;
  url?: string;
  updatedAt?: string;
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE",
    venue: "EU / SIX-style ETP watch",
    status: "Product watch",
    dailyFlow: "Connect feed",
    aum: "Product page",
    holdings: "Product page",
    fee: "Product page",
    url: "https://www.21shares.com/",
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD",
    venue: "Xetra watch",
    status: "Product watch",
    dailyFlow: "Connect feed",
    aum: "Product page",
    holdings: "Product page",
    fee: "Product page",
    url: "https://coinshares.com/",
  },
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    venue: "US filing watch",
    status: "Filing / launch watch",
    dailyFlow: "N/A until traded",
    aum: "--",
    holdings: "--",
    fee: "--",
    url: "https://www.sec.gov/",
  },
];

export async function GET() {
  const jsonUrl = process.env.HYPE_TRADFI_FLOW_JSON_URL;

  if (jsonUrl) {
    try {
      const response = await fetch(jsonUrl, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        const flows = Array.isArray(payload?.flows) ? payload.flows : Array.isArray(payload) ? payload : [];
        return NextResponse.json(
          { ok: true, source: "custom-json", updatedAt: new Date().toISOString(), flows },
          { headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } },
        );
      }
    } catch {}
  }

  return NextResponse.json(
    {
      ok: true,
      source: "watchlist",
      updatedAt: new Date().toISOString(),
      note: "No verified daily-flow feed is configured. Add HYPE_TRADFI_FLOW_JSON_URL to serve exact inflow data.",
      flows: DEFAULT_PRODUCTS,
    },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } },
  );
}

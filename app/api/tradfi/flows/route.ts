import { NextResponse } from "next/server";

const fallbackRows = [
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE",
    venue: "SIX / EU venues",
    status: "Live product",
    dailyFlow: "source needed",
    aum: "official page",
    holdings: "official page",
    fee: "official page",
    lastData: "configure HYPE_TRADFI_FLOW_JSON_URL",
    url: "https://www.21shares.com/",
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD",
    venue: "Xetra",
    status: "Live product",
    dailyFlow: "source needed",
    aum: "official page",
    holdings: "official page",
    fee: "official page",
    lastData: "configure HYPE_TRADFI_FLOW_JSON_URL",
    url: "https://coinshares.com/",
  },
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    venue: "US ETF watch",
    status: "Filing watch",
    dailyFlow: "not trading",
    aum: "--",
    holdings: "--",
    fee: "--",
    lastData: "SEC / issuer page",
    url: "https://www.sec.gov/",
  },
];

export async function GET() {
  const source = process.env.HYPE_TRADFI_FLOW_JSON_URL;
  if (source) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        return NextResponse.json({ live: true, rows: Array.isArray(payload?.rows) ? payload.rows : payload, source }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch (error) {
      // fall through to fallback rows
    }
  }

  return NextResponse.json({
    live: false,
    rows: fallbackRows,
    note: "Exact daily ETP/ETF flows require a dedicated issuer/API/CSV source. The dashboard intentionally does not invent flow numbers.",
  }, { headers: { "Cache-Control": "no-store" } });
}

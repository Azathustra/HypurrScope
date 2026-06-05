import { NextResponse } from "next/server";

type FlowRow = {
  name: string;
  ticker: string;
  venue: string;
  status: string;
  dailyFlow: string;
  rawDailyFlow: number;
  aum: string;
  holdings: string;
  fee: string;
  lastData: string;
  url: string;
};

const fallbackRows: FlowRow[] = [
  {
    name: "21Shares Hyperliquid ETP",
    ticker: "HYPE",
    venue: "SIX / EU venues",
    status: "Live ETP",
    dailyFlow: "Pending",
    rawDailyFlow: 0,
    aum: "Pending",
    holdings: "Pending",
    fee: "2.50%",
    lastData: "Source not wired",
    url: "https://www.21shares.com/",
  },
  {
    name: "CoinShares Hyperliquid Staking ETP",
    ticker: "LIQD",
    venue: "Xetra",
    status: "Live ETP",
    dailyFlow: "Pending",
    rawDailyFlow: 0,
    aum: "Pending",
    holdings: "Pending",
    fee: "0.00% mgmt",
    lastData: "Source not wired",
    url: "https://coinshares.com/",
  },
  {
    name: "Bitwise Hyperliquid ETF",
    ticker: "BHYP",
    venue: "NYSE Arca proposed",
    status: "Filing watch",
    dailyFlow: "Not live",
    rawDailyFlow: 0,
    aum: "Pending",
    holdings: "Pending",
    fee: "Pending",
    lastData: "SEC filing watch",
    url: "https://www.sec.gov/",
  },
];

function formatSignedUsd(value: number) {
  if (!Number.isFinite(value) || value === 0) return "Pending";
  const sign = value > 0 ? "+" : "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  return `${sign}$${abs.toFixed(2)}`;
}

function normalizeRow(row: any): FlowRow {
  const rawDailyFlow = Number(row.rawDailyFlow ?? row.daily_flow_usd ?? row.dailyFlowUsd ?? 0);
  return {
    name: row.name || "Unknown HYPE product",
    ticker: row.ticker || "--",
    venue: row.venue || "--",
    status: row.status || "Watch",
    dailyFlow: row.dailyFlow || formatSignedUsd(rawDailyFlow),
    rawDailyFlow: Number.isFinite(rawDailyFlow) ? rawDailyFlow : 0,
    aum: row.aum || row.aumUsd || "Pending",
    holdings: row.holdings || row.hypeHoldings || "Pending",
    fee: row.fee || "--",
    lastData: row.lastData || row.date || "--",
    url: row.url || "#",
  };
}

async function loadExternalFlowJson() {
  const url = process.env.HYPE_TRADFI_FLOW_JSON_URL;
  if (!url) return null;

  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error(`Flow JSON failed: ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload?.rows) ? payload.rows.map(normalizeRow) : [];
  return { rows, note: payload?.note || "Loaded from HYPE_TRADFI_FLOW_JSON_URL." };
}

export async function GET() {
  try {
    const external = await loadExternalFlowJson();
    if (external && external.rows.length > 0) {
      return NextResponse.json(
        { rows: external.rows, sourceReady: true, note: external.note, generatedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        rows: fallbackRows,
        sourceReady: false,
        note: "Daily flow source not configured yet. Add HYPE_TRADFI_FLOW_JSON_URL or wire product-specific APIs here; the UI is already focused on daily net inflow.",
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { rows: fallbackRows, sourceReady: false, note: "External flow source failed. Showing product watchlist only.", generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

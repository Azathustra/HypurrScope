import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FARSIDE_HYPE_URL = "https://farside.co.uk/hyp/";

type FlowRow = {
  name: string;
  ticker: string;
  venue: string;
  status: string;
  dailyFlow?: string;
  cumulativeFlow?: string;
  dollarVolume?: string;
  url?: string;
  updatedAt?: string;
};

const PRODUCTS = [
  { ticker: "BHYP", name: "Bitwise Hyperliquid ETF", venue: "US spot HYPE" },
  { ticker: "THYP", name: "21Shares Hyperliquid ETF", venue: "US spot HYPE" },
  { ticker: "HYPG", name: "Grayscale HYPE Staking ETF", venue: "US staking HYPE" },
  { ticker: "TOTAL", name: "Total HYPE ETF net flow", venue: "All tracked HYPE ETFs" },
];

function fmtFlow(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toFixed(abs >= 10 ? 1 : 2)}M`;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string) {
  if (!value || value === "-" || value.toLowerCase() === "n/a") return null;
  const cleaned = value.replace(/,/g, "").replace(/^\+/, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFarside(text: string) {
  const rowRegex = /(\d{1,2}\s+[A-Z][a-z]{2}\s+20\d{2})\s+(-|[-+]?\d+(?:\.\d+)?)\s+(-|[-+]?\d+(?:\.\d+)?)\s+(-|[-+]?\d+(?:\.\d+)?)\s+(-|[-+]?\d+(?:\.\d+)?)/g;
  const rows: Array<{ date: string; bhyp: number | null; thyp: number | null; hypg: number | null; total: number | null }> = [];
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(text)) !== null) {
    rows.push({ date: match[1], bhyp: parseNumber(match[2]), thyp: parseNumber(match[3]), hypg: parseNumber(match[4]), total: parseNumber(match[5]) });
  }
  return rows;
}

function cumulative(rows: Array<{ bhyp: number | null; thyp: number | null; hypg: number | null; total: number | null }>, key: "bhyp" | "thyp" | "hypg" | "total") {
  const sum = rows.reduce((acc, row) => acc + (row[key] || 0), 0);
  return rows.length ? fmtFlow(sum) : "--";
}

function fallback(status = "Farside flow feed unavailable"): FlowRow[] {
  return PRODUCTS.map((product) => ({ ...product, status, dailyFlow: "--", cumulativeFlow: "--", dollarVolume: "--", url: FARSIDE_HYPE_URL }));
}

export async function GET() {
  try {
    const response = await fetch(FARSIDE_HYPE_URL, {
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 HypurrScope/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Farside failed ${response.status}`);
    const html = await response.text();
    const rows = parseFarside(stripHtml(html));
    const latest = rows[rows.length - 1];
    if (!latest) throw new Error("No HYPE ETF rows parsed from Farside");

    const flows: FlowRow[] = [
      { ...PRODUCTS[0], dailyFlow: fmtFlow(latest.bhyp), cumulativeFlow: cumulative(rows, "bhyp"), status: `Latest row ${latest.date}`, dollarVolume: fmtFlow(latest.bhyp), url: FARSIDE_HYPE_URL, updatedAt: latest.date },
      { ...PRODUCTS[1], dailyFlow: fmtFlow(latest.thyp), cumulativeFlow: cumulative(rows, "thyp"), status: `Latest row ${latest.date}`, dollarVolume: fmtFlow(latest.thyp), url: FARSIDE_HYPE_URL, updatedAt: latest.date },
      { ...PRODUCTS[2], dailyFlow: fmtFlow(latest.hypg), cumulativeFlow: cumulative(rows, "hypg"), status: `Latest row ${latest.date}`, dollarVolume: fmtFlow(latest.hypg), url: FARSIDE_HYPE_URL, updatedAt: latest.date },
      { ...PRODUCTS[3], dailyFlow: fmtFlow(latest.total), cumulativeFlow: cumulative(rows, "total"), status: `Latest row ${latest.date}`, dollarVolume: fmtFlow(latest.total), url: FARSIDE_HYPE_URL, updatedAt: latest.date },
    ];

    return NextResponse.json(
      { ok: true, source: "farside-hype-flows", updatedAt: new Date().toISOString(), rows, flows, note: "Daily HYPE ETF net flow in US$m from Farside." },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, source: "fallback", updatedAt: new Date().toISOString(), error: error?.message || "Farside flow fetch failed", flows: fallback() },
      { status: 200, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } },
    );
  }
}

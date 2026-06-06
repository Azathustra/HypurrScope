import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EtfFlow = {
  date: string;
  bhyp: number | null;
  thyp: number | null;
  hypg: number | null;
  total: number | null;
};

const FARSIDE_URL = "https://farside.co.uk/hyp/";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .trim();
}

function parseCell(value: string): number | null {
  const cleaned = decodeHtml(value).replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "–") return null;
  const negative = /^\(.+\)$/.test(cleaned);
  const n = Number(cleaned.replace(/[()]/g, ""));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function fmtFlow(value: number | null) {
  if (value === null) return "--";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toFixed(abs >= 10 ? 1 : 2)}M`;
}

function parseFarside(html: string): EtfFlow[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n");
  const lines = text.split(/\n+/).map(decodeHtml).filter(Boolean);
  const rows: EtfFlow[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/^\d{2}\s+[A-Z][a-z]{2}\s+20\d{2}$/.test(lines[i])) continue;
    const date = lines[i];
    const bhyp = parseCell(lines[i + 1] || "");
    const thyp = parseCell(lines[i + 2] || "");
    const hypg = parseCell(lines[i + 3] || "");
    const total = parseCell(lines[i + 4] || "");
    if (bhyp === null && thyp === null && hypg === null && total === null) continue;
    rows.push({ date, bhyp, thyp, hypg, total });
  }

  return rows;
}

function flowRow(ticker: string, name: string, venue: string, latest: number | null, url: string) {
  return {
    ticker,
    name,
    venue,
    status: "Farside net ETF flow, US$m",
    price: "--",
    change: latest === null ? "--" : latest >= 0 ? "inflow" : "outflow",
    volume: "net flow",
    dollarVolume: fmtFlow(latest),
    url,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const response = await fetch(FARSIDE_URL, {
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 HypurrScope/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Farside failed ${response.status}`);
    const html = await response.text();
    const history = parseFarside(html);
    const latest = history[history.length - 1];
    if (!latest) throw new Error("No Hyperliquid ETF flow rows parsed from Farside.");

    const flows = [
      flowRow("BHYP", "Bitwise Hyperliquid ETF", "US", latest.bhyp, FARSIDE_URL),
      flowRow("THYP", "21Shares Hyperliquid ETF", "US", latest.thyp, FARSIDE_URL),
      flowRow("HYPG", "21Shares Hyperliquid ETF", "US", latest.hypg, FARSIDE_URL),
      flowRow("TOTAL", "Total daily flow", "All listed HYPE ETFs", latest.total, FARSIDE_URL),
    ];

    return NextResponse.json({
      ok: true,
      source: "farside-hyperliquid-etf-flow",
      updatedAt: new Date().toISOString(),
      latestDate: latest.date,
      note: "Net ETF flow, US$m, parsed from Farside Hyperliquid ETF Flow table.",
      flows,
      history: history.slice(-20).map((row) => ({ ...row, labels: { bhyp: fmtFlow(row.bhyp), thyp: fmtFlow(row.thyp), hypg: fmtFlow(row.hypg), total: fmtFlow(row.total) } })),
    }, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } });
  } catch (error: any) {
    const fallback = [
      flowRow("BHYP", "Bitwise Hyperliquid ETF", "US", null, FARSIDE_URL),
      flowRow("THYP", "21Shares Hyperliquid ETF", "US", null, FARSIDE_URL),
      flowRow("HYPG", "21Shares Hyperliquid ETF", "US", null, FARSIDE_URL),
      flowRow("TOTAL", "Total daily flow", "All listed HYPE ETFs", null, FARSIDE_URL),
    ];
    return NextResponse.json({ ok: false, source: "farside-fallback", updatedAt: new Date().toISOString(), error: error?.message || "Farside unavailable", flows: fallback, history: [] }, { status: 200, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } });
  }
}

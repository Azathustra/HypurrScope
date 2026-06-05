import { NextResponse } from "next/server";

const NANSEN_LEADERBOARD_URL = "https://api.nansen.ai/api/v1/perp-leaderboard";

function formatUsd(value: number) {
  if (!Number.isFinite(value) || value === 0) return "$--";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getArray(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload)) return payload;
  return [];
}

function normalizeAddress(row: any) {
  return row.trader_address || row.address || row.user || row.wallet || row.account || "";
}

function normalizeLeaderboardRows(payload: any) {
  return getArray(payload)
    .map((row: any, index: number) => {
      const address = normalizeAddress(row);
      const accountValue = Number(row.account_value ?? row.accountValue ?? row.account_value_usd ?? row.equity ?? 0);
      const pnl = Number(row.total_pnl ?? row.pnl ?? row.pnl_usd ?? row.totalPnl ?? 0);
      const roi = Number(row.roi ?? row.roi_pct ?? row.roi_percentage ?? 0);
      const volume = Number(row.volume ?? row.trading_volume ?? row.volume_usd ?? 0);
      return {
        rank: Number(row.rank || index + 1),
        address,
        label: row.trader_address_label || row.label || "Whale",
        accountValue: formatUsd(accountValue),
        rawAccountValue: Number.isFinite(accountValue) ? accountValue : 0,
        pnl: formatUsd(pnl),
        roi: formatPercent(roi),
        volume: formatUsd(volume),
      };
    })
    .filter((row: any) => /^0x[a-fA-F0-9]{40}$/.test(row.address))
    .sort((a: any, b: any) => b.rawAccountValue - a.rawAccountValue)
    .slice(0, 20)
    .map(({ rawAccountValue, ...row }: any, index: number) => ({ ...row, rank: index + 1 }));
}

function getDateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const apiKey = process.env.NANSEN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        rows: [],
        needsApiKey: true,
        note: "Top 20 whales requires a leaderboard data source. Add NANSEN_API_KEY in Vercel, or replace this route with another provider. Manual wallet scan works without it.",
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(NANSEN_LEADERBOARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey,
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        date: { from: getDateDaysAgo(30), to: getDateDaysAgo(0) },
        pagination: { page: 1, per_page: 50 },
        filters: { account_value: { min: 100_000 } },
        premium_labels: false,
        order_by: [{ field: "account_value", direction: "desc" }],
      }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Nansen leaderboard failed: ${response.status}`);
    const payload = await response.json();
    const rows = normalizeLeaderboardRows(payload);

    return NextResponse.json(
      {
        rows,
        needsApiKey: false,
        note: rows.length > 0 ? "Top whales ranked by account value from the leaderboard provider." : "Leaderboard provider returned no rows. Check API plan/response schema.",
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { rows: [], needsApiKey: false, note: "Whale leaderboard provider failed. Manual wallet scan still works.", generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

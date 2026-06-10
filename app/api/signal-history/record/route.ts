import { listSignalEpisodes, recordSignalEpisode, signalEpisodeStats, type SignalHistoryInput } from "../../../lib/signal-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ASSETS = new Set(["BTC", "ETH", "HYPE"]);
const SETUPS = new Set(["Fresh Long", "Fresh Short", "Crowded Long", "Crowded Short"]);
const STATUSES = new Set(["active", "near"]);

function valid(row: Partial<SignalHistoryInput>) {
  return ASSETS.has(String(row.asset)) && SETUPS.has(String(row.setupType)) && STATUSES.has(String(row.status));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [body];
    const usable = rows.filter(valid).slice(0, 12) as SignalHistoryInput[];
    if (!usable.length) {
      return Response.json({ ok: false, error: "No active or strong near BTC/ETH/HYPE signal episodes to record" }, { status: 400 });
    }
    const recorded = [];
    const skipped = [];
    for (const row of usable) {
      const result = await recordSignalEpisode(row);
      if (result.length) recorded.push(...result);
      else skipped.push({ asset: row.asset, setupType: row.setupType, finalScore: row.finalScore, status: row.status, reason: "below logging threshold or missing flow/final score" });
    }
    const [history, stats] = await Promise.all([listSignalEpisodes(120), signalEpisodeStats()]);
    return Response.json({ ok: true, recordedCount: recorded.length, skippedCount: skipped.length, skipped, rows: history, stats }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), rows: [] },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

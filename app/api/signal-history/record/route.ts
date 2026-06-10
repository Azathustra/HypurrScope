import { insertSignalHistory, listSignalHistory, type SignalHistoryInput } from "../../../lib/signal-history";

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
      return Response.json({ ok: false, error: "No active or near BTC/ETH/HYPE signal rows to record" }, { status: 400 });
    }
    const inserted = [];
    for (const row of usable) {
      inserted.push(...await insertSignalHistory(row));
    }
    const history = await listSignalHistory(100);
    return Response.json({ ok: true, insertedCount: inserted.length, rows: history }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), rows: [] },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FlowEventRow = {
  id: string;
  ts: number;
  asset: "BTC" | "ETH" | "HYPE";
  eventType: "large_trade" | "flow_burst" | "oi_spike" | "funding_stress" | "liquidity_thin" | "twap_like_heuristic";
  side: "Buy" | "Sell" | "Mixed" | "-";
  notionalUsd: number | null;
  price: number | null;
  context: string;
  signalHint: string | null;
  rawPayload: unknown;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __hypurrscopeFlowEvents: FlowEventRow[] | undefined;
}

function rows() {
  globalThis.__hypurrscopeFlowEvents ||= [];
  return globalThis.__hypurrscopeFlowEvents;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset");
  const events = rows().filter((event) => !asset || event.asset === asset);
  return Response.json({ storage: "server-memory", events }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const incoming = Array.isArray(payload) ? payload : [payload];
    const valid = incoming
      .filter((row) => row?.id && row?.asset && row?.eventType)
      .map((row) => ({ ...row, createdAt: row.createdAt || new Date().toISOString() })) as FlowEventRow[];
    const byId = new Map<string, FlowEventRow>();
    rows().concat(valid).forEach((event) => byId.set(event.id, event));
    globalThis.__hypurrscopeFlowEvents = Array.from(byId.values()).sort((a, b) => b.ts - a.ts).slice(0, 2000);
    return Response.json({ inserted: valid.length }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to save flow events" }, { status: 500 });
  }
}

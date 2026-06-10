export const dynamic = "force-dynamic";
export const revalidate = 0;

type AlertEventRow = {
  id: string;
  alertId: string;
  triggeredAt: number;
  asset: "BTC" | "ETH" | "HYPE";
  setupType: string;
  snapshot: Record<string, unknown>;
  delivered: boolean;
  deliveryError: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __hypurrscopeAlertEvents: AlertEventRow[] | undefined;
}

function rows() {
  globalThis.__hypurrscopeAlertEvents ||= [];
  return globalThis.__hypurrscopeAlertEvents;
}

export async function GET() {
  return Response.json({ storage: "server-memory", events: rows() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AlertEventRow;
    if (!body?.id || !body?.alertId) {
      return Response.json({ error: "Invalid alert event payload" }, { status: 400 });
    }
    const event = { ...body, triggeredAt: body.triggeredAt || Date.now() };
    globalThis.__hypurrscopeAlertEvents = [event].concat(rows()).slice(0, 1000);
    return Response.json({ event }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to save alert event" }, { status: 500 });
  }
}

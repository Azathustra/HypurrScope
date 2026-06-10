export const dynamic = "force-dynamic";
export const revalidate = 0;

type AlertRow = {
  id: string;
  asset: "BTC" | "ETH" | "HYPE";
  kind: string;
  alertType: "preset" | "custom" | "live";
  fingerprint: string;
  thresholds: Record<string, number | string>;
  triggerMode: "all" | "any";
  triggerCount: number;
  cooldownSeconds: number;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt: number | null;
  enabled: boolean;
  destination: "Browser" | "Telegram" | "Webhook";
};

declare global {
  // eslint-disable-next-line no-var
  var __hypurrscopeAlerts: AlertRow[] | undefined;
}

function rows() {
  globalThis.__hypurrscopeAlerts ||= [];
  return globalThis.__hypurrscopeAlerts;
}

export async function GET() {
  return Response.json({ storage: "server-memory", alerts: rows() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AlertRow;
    if (!body?.id || !body?.fingerprint) {
      return Response.json({ error: "Invalid alert payload" }, { status: 400 });
    }
    const current = rows();
    const duplicate = current.find((alert) => alert.fingerprint === body.fingerprint);
    if (duplicate) {
      return Response.json({ duplicate: true, alert: duplicate }, { headers: { "cache-control": "no-store" } });
    }
    const alert = { ...body, updatedAt: Date.now() };
    current.unshift(alert);
    globalThis.__hypurrscopeAlerts = current.slice(0, 500);
    return Response.json({ duplicate: false, alert }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to save alert" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<AlertRow> & { id?: string };
    if (!body.id) return Response.json({ error: "Missing alert id" }, { status: 400 });
    let updated: AlertRow | null = null;
    globalThis.__hypurrscopeAlerts = rows().map((alert) => {
      if (alert.id !== body.id) return alert;
      const next: AlertRow = { ...alert, ...body, id: alert.id, updatedAt: Date.now() };
      updated = next;
      return next;
    });
    return Response.json({ alert: updated }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to update alert" }, { status: 500 });
  }
}

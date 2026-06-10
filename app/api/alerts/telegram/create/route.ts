export const dynamic = "force-dynamic";
export const revalidate = 0;

type TelegramAlert = {
  id: string;
  asset: "BTC" | "ETH" | "HYPE";
  alertType: string;
  trigger: string;
  scoreThreshold: number;
  priceLevel: number;
  frequency: string;
  chatId: string;
  createdAt: string;
  enabled: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __hypurrscopeTelegramAlerts: TelegramAlert[] | undefined;
}

function rows() {
  globalThis.__hypurrscopeTelegramAlerts ||= [];
  return globalThis.__hypurrscopeTelegramAlerts;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!["BTC", "ETH", "HYPE"].includes(body?.asset)) {
      return Response.json({ ok: false, error: "Asset must be BTC, ETH or HYPE" }, { status: 400 });
    }
    if (!body?.chatId) {
      return Response.json({ ok: false, error: "Telegram chat id is required" }, { status: 400 });
    }
    const fingerprint = `${body.asset}|${body.alertType}|${body.trigger}|${body.scoreThreshold}|${body.priceLevel}|${body.frequency}|${body.chatId}`;
    const duplicate = rows().find((row) => `${row.asset}|${row.alertType}|${row.trigger}|${row.scoreThreshold}|${row.priceLevel}|${row.frequency}|${row.chatId}` === fingerprint);
    if (duplicate) return Response.json({ ok: true, duplicate: true, alert: duplicate }, { headers: { "cache-control": "no-store" } });

    const alert: TelegramAlert = {
      id: crypto.randomUUID(),
      asset: body.asset,
      alertType: String(body.alertType || "Fresh Long"),
      trigger: String(body.trigger || "near setup"),
      scoreThreshold: Number(body.scoreThreshold || 80),
      priceLevel: Number(body.priceLevel || 0),
      frequency: String(body.frequency || "cooldown 1h"),
      chatId: String(body.chatId),
      createdAt: new Date().toISOString(),
      enabled: true,
    };
    rows().unshift(alert);
    globalThis.__hypurrscopeTelegramAlerts = rows().slice(0, 500);
    return Response.json({ ok: true, duplicate: false, alert }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtUsd(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "unavailable";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function message(body: any) {
  const score = Number.isFinite(Number(body.finalScore)) ? Number(body.finalScore) : Number(body.scoreThreshold || 80);
  const title = body.beginnerTitle || `${body.asset} ${body.alertType} ${body.trigger} - ${score}%`;
  return [
    `Alert: ${title}`,
    `Price: ${fmtUsd(body.price)}`,
    `Watch level: ${body.watchLevel || body.triggerLevel || body.trigger}`,
    `Reason: ${body.reason || "waiting for confirmation"}`,
    `Risk: ${body.risk || "wait for confirmation"}`,
    `Open on Hyperliquid: ${body.openUrl || "https://app.hyperliquid.xyz"}`,
    `Details: ${body.detailsUrl || "https://hypurrscope.xyz"}`,
    "",
    "Informational alert only. Not financial advice.",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = message(body);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return Response.json({
        ok: true,
        delivered: false,
        warning: "Telegram preview generated. Configure TELEGRAM_BOT_TOKEN and provide a chat id to send real Telegram messages.",
        message: text,
      }, { headers: { "cache-control": "no-store" } });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true) {
      return Response.json({ ok: false, delivered: false, error: payload?.description || `Telegram API ${response.status}`, message: text }, { status: 502 });
    }
    return Response.json({ ok: true, delivered: true, message: text, telegram: payload }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, delivered: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

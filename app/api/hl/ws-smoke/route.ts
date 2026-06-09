import WebSocket from "ws";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type WsChannel = "allMids" | "trades" | "l2Book" | "activeAssetCtx";
type Subscription = { type: WsChannel; coin?: ApiCoin };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const ASSETS: ApiCoin[] = ["BTC", "ETH", "HYPE"];
const WS_URL = "wss://api.hyperliquid.xyz/ws";
const SMOKE_VERSION = "ws-smoke-v3-subscription-send-proof-2026-06-09";
const SUBSCRIPTIONS: Subscription[] = [
  { type: "allMids" },
  ...ASSETS.flatMap((coin) => [
    { type: "trades", coin } as Subscription,
    { type: "l2Book", coin } as Subscription,
    { type: "activeAssetCtx", coin } as Subscription,
  ]),
];

function keyFor(subscription: Subscription) {
  return `${subscription.type}${subscription.coin ? `:${subscription.coin}` : ""}`;
}

function nowIso() {
  return new Date().toISOString();
}

function numericSeconds(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(10, Math.max(1, Math.floor(parsed)));
}

function assetFromPayload(payload: any): ApiCoin | null {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    if (typeof payload[0] === "string" && ASSETS.includes(payload[0] as ApiCoin)) return payload[0] as ApiCoin;
    return assetFromPayload(payload[0]);
  }
  const coin = payload.coin || payload.s || payload.asset || payload.coinName ||
    payload.ctx?.coin || payload.ctx?.s ||
    payload.candle?.s || payload.candle?.coin;
  return ASSETS.includes(coin) ? coin : null;
}

function subscriptionFromAck(message: any): Subscription | null {
  const raw = message?.subscription || message?.data?.subscription || message?.data;
  const type = raw?.type;
  if (!["allMids", "trades", "l2Book", "activeAssetCtx"].includes(type)) return null;
  const coin = ASSETS.includes(raw?.coin) ? raw.coin as ApiCoin : undefined;
  return { type, coin };
}

function subscriptionFromLiveMessage(channel: string, data: any, message: any): Subscription | null {
  if (channel === "allMids") return { type: "allMids" };
  if (channel === "trades") {
    const rows = Array.isArray(data) ? data : Array.isArray(data?.trades) ? data.trades : [data];
    const coin = assetFromPayload(rows) || assetFromPayload(data) || message?.subscription?.coin;
    return ASSETS.includes(coin) ? { type: "trades", coin } : null;
  }
  if (channel === "l2Book") {
    const coin = assetFromPayload(data) || message?.subscription?.coin;
    return ASSETS.includes(coin) ? { type: "l2Book", coin } : null;
  }
  if (channel === "activeAssetCtx") {
    const coin = assetFromPayload(data) || message?.subscription?.coin;
    return ASSETS.includes(coin) ? { type: "activeAssetCtx", coin } : null;
  }
  return null;
}

function emptyAssetTimestamps() {
  return Object.fromEntries(ASSETS.map((asset) => [asset, {
    trades: null as string | null,
    l2Book: null as string | null,
    activeAssetCtx: null as string | null,
  }])) as Record<ApiCoin, Record<Exclude<WsChannel, "allMids">, string | null>>;
}

function noStore(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seconds = numericSeconds(url.searchParams.get("seconds"));
  const startedAt = Date.now();
  const connectionStartedAt = nowIso();
  const perChannelCounts: Record<string, number> = Object.fromEntries(SUBSCRIPTIONS.map((subscription) => [keyFor(subscription), 0]));
  const perAssetLastTimestamps = emptyAssetTimestamps();
  const subscriptionsSent: string[] = [];

  let connected = false;
  let subscriptionAcksCount = 0;
  let rawMessagesCount = 0;
  let lastMessageTimestamp: string | null = null;
  let lastRawMessagePreview: string | null = null;
  let error: string | null = null;
  let closeCode: number | null = null;
  let closeReason: string | null = null;
  let sendErrors: string[] = [];

  return await new Promise<Response>((resolve) => {
    let finished = false;
    const ws = new WebSocket(WS_URL, { handshakeTimeout: 5_000 });

    function hasEnoughProof() {
      if (!connected || rawMessagesCount <= 0 || subscriptionAcksCount <= 0) return false;
      return ASSETS.every((asset) => Boolean(perAssetLastTimestamps[asset].trades || perAssetLastTimestamps[asset].l2Book));
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000, "smoke test complete");
      } catch {
        // The response should still include the original error if closing fails.
      }

      const endedAt = nowIso();
      const ok = connected && rawMessagesCount > 0 && ASSETS.every((asset) => Boolean(perAssetLastTimestamps[asset].trades || perAssetLastTimestamps[asset].l2Book));
      if (!ok && !error) {
        if (!connected) error = `WebSocket did not open within ${seconds}s`;
        else if (!subscriptionsSent.length) error = "WebSocket opened but no subscriptions were attempted";
        else if (rawMessagesCount === 0) error = `WebSocket connected and ${subscriptionsSent.length} subscriptions were attempted, but no messages arrived within ${seconds}s`;
        else error = "WebSocket messages arrived, but BTC/ETH/HYPE trades or l2Book timestamps were not all observed";
      }
      resolve(noStore({
        smokeVersion: SMOKE_VERSION,
        ok,
        attemptedUrl: WS_URL,
        connected,
        connectionStartedAt,
        endedAt,
        durationMs: Date.now() - startedAt,
        requestedSeconds: seconds,
        subscriptionsPlanned: SUBSCRIPTIONS.map(keyFor),
        subscriptionsSent,
        subscriptionAcksCount,
        rawMessagesCount,
        lastMessageTimestamp,
        perChannelCounts,
        perAssetLastTimestamps,
        lastRawMessagePreview,
        error,
        sendErrors,
        closeCode,
        closeReason,
      }, ok ? 200 : 502));
    }

    const timeout = setTimeout(finish, seconds * 1000);

    ws.on("open", () => {
      connected = true;
      for (const subscription of SUBSCRIPTIONS) {
        const key = keyFor(subscription);
        const payload = JSON.stringify({ method: "subscribe", subscription });
        subscriptionsSent.push(key);
        try {
          ws.send(payload, (err) => {
            if (!err) return;
            const message = `send failed for ${key}: ${err.message}`;
            sendErrors.push(message);
            error = error || message;
          });
        } catch (err) {
          const message = `send threw for ${key}: ${err instanceof Error ? err.message : String(err)}`;
          sendErrors.push(message);
          error = error || message;
        }
      }
      if (!subscriptionsSent.length) {
        error = "WebSocket opened but no subscriptions were attempted";
        finish();
      }
    });

    ws.on("message", (raw) => {
      rawMessagesCount += 1;
      lastMessageTimestamp = nowIso();
      lastRawMessagePreview = String(raw).slice(0, 800);

      let message: any;
      try {
        message = JSON.parse(String(raw));
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        return;
      }

      const channel = String(message.channel || "");
      const data = message.data;

      if (channel === "subscriptionResponse") {
        subscriptionAcksCount += 1;
        const subscription = subscriptionFromAck(message);
        if (subscription) {
          const key = keyFor(subscription);
          perChannelCounts[key] = perChannelCounts[key] || 0;
        }
        return;
      }

      if (channel === "error" || message.error) {
        error = String(message.error || data?.error || "Hyperliquid WebSocket error");
        return;
      }

      const subscription = subscriptionFromLiveMessage(channel, data, message);
      if (!subscription) return;
      const key = keyFor(subscription);
      perChannelCounts[key] = (perChannelCounts[key] || 0) + 1;
      if (subscription.coin && subscription.type !== "allMids") {
        const assetChannel = subscription.type as Exclude<WsChannel, "allMids">;
        perAssetLastTimestamps[subscription.coin][assetChannel] = lastMessageTimestamp;
      }
      if (hasEnoughProof()) finish();
    });

    ws.on("error", (err) => {
      error = err instanceof Error ? err.message : String(err);
      if (!connected && rawMessagesCount === 0) finish();
    });

    ws.on("close", (code, reason) => {
      closeCode = code;
      closeReason = reason?.toString() || "";
      if (!finished && (!connected || rawMessagesCount === 0)) finish();
    });
  });
}

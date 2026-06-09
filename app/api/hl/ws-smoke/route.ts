import crypto from "node:crypto";
import tls from "node:tls";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type WsChannel = "allMids" | "trades" | "l2Book" | "activeAssetCtx";
type Subscription = { type: WsChannel; coin?: ApiCoin };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const ASSETS: ApiCoin[] = ["BTC", "ETH", "HYPE"];
const WS_HOST = "api.hyperliquid.xyz";
const WS_PATH = "/ws";
const WS_URL = `wss://${WS_HOST}${WS_PATH}`;
const SMOKE_VERSION = "ws-smoke-v5-native-tls-buffer-type-fix-2026-06-09";
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

function noStore(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store, max-age=0" },
  });
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

function makeClientFrame(message: string, opcode = 0x1) {
  const payload = Buffer.from(message);
  const mask = crypto.randomBytes(4);
  const length = payload.length;
  let header: Buffer;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | length;
  } else if (length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  const masked = Buffer.alloc(length);
  for (let index = 0; index < length; index += 1) masked[index] = payload[index] ^ mask[index % 4];
  return Buffer.concat([header, mask, masked]);
}

function parseFrames(buffer: Buffer<ArrayBufferLike>, onText: (text: string) => void, onClose: (code: number | null, reason: string) => void, socket: tls.TLSSocket): Buffer<ArrayBufferLike> {
  let offset = 0;

  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      const bigLength = buffer.readBigUInt64BE(offset + 2);
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("WebSocket frame too large");
      length = Number(bigLength);
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + length;
    if (buffer.length - offset < frameLength) break;

    const mask = masked ? buffer.subarray(offset + headerLength, offset + headerLength + 4) : null;
    const payloadStart = offset + headerLength + maskLength;
    const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + length));
    if (mask) {
      for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
    }

    offset += frameLength;

    if (opcode === 0x8) {
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : null;
      const reason = payload.length > 2 ? payload.subarray(2).toString("utf8") : "";
      onClose(code, reason);
      continue;
    }

    if (opcode === 0x9) {
      socket.write(makeClientFrame(payload.toString("binary"), 0x0a));
      continue;
    }

    if (opcode === 0x1) onText(payload.toString("utf8"));
  }

  return buffer.subarray(offset);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seconds = numericSeconds(url.searchParams.get("seconds"));
  const startedAt = Date.now();
  const connectionStartedAt = nowIso();
  const perChannelCounts: Record<string, number> = Object.fromEntries(SUBSCRIPTIONS.map((subscription) => [keyFor(subscription), 0]));
  const perAssetLastTimestamps = emptyAssetTimestamps();
  const subscriptionsPlanned = SUBSCRIPTIONS.map(keyFor);
  const subscriptionsSent: string[] = [];
  const sendErrors: string[] = [];

  let connected = false;
  let handshakeComplete = false;
  let subscriptionAcksCount = 0;
  let rawMessagesCount = 0;
  let lastMessageTimestamp: string | null = null;
  let lastRawMessagePreview: string | null = null;
  let error: string | null = null;
  let closeCode: number | null = null;
  let closeReason: string | null = null;
  let frameBuffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  return await new Promise<Response>((resolve) => {
    let finished = false;
    const key = crypto.randomBytes(16).toString("base64");
    const socket = tls.connect({
      host: WS_HOST,
      port: 443,
      servername: WS_HOST,
      ALPNProtocols: ["http/1.1"],
    });

    function hasEnoughProof() {
      if (!connected || rawMessagesCount <= 0 || subscriptionAcksCount <= 0) return false;
      return ASSETS.every((asset) => Boolean(perAssetLastTimestamps[asset].trades || perAssetLastTimestamps[asset].l2Book));
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      try {
        if (!socket.destroyed) socket.end(makeClientFrame(Buffer.from([0x03, 0xe8]).toString("binary"), 0x8));
      } catch {
        try {
          socket.destroy();
        } catch {
          // ignore close failure; the diagnostic response is more important.
        }
      }

      const ok = connected && rawMessagesCount > 0 && ASSETS.every((asset) => Boolean(perAssetLastTimestamps[asset].trades || perAssetLastTimestamps[asset].l2Book));
      if (!ok && !error) {
        if (!connected) error = `WebSocket handshake did not complete within ${seconds}s`;
        else if (!subscriptionsSent.length) error = "WebSocket opened but no subscriptions were attempted";
        else if (rawMessagesCount === 0) error = `WebSocket connected and ${subscriptionsSent.length} subscriptions were attempted, but no messages arrived within ${seconds}s`;
        else error = "WebSocket messages arrived, but BTC/ETH/HYPE trades or l2Book timestamps were not all observed";
      }

      resolve(noStore({
        smokeVersion: SMOKE_VERSION,
        ok,
        attemptedUrl: WS_URL,
        connected,
        handshakeComplete,
        connectionStartedAt,
        endedAt: nowIso(),
        durationMs: Date.now() - startedAt,
        requestedSeconds: seconds,
        subscriptionsPlanned,
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

    function sendSubscriptions() {
      for (const subscription of SUBSCRIPTIONS) {
        const subscriptionKey = keyFor(subscription);
        const payload = JSON.stringify({ method: "subscribe", subscription });
        subscriptionsSent.push(subscriptionKey);
        try {
          socket.write(makeClientFrame(payload), (err) => {
            if (!err) return;
            const message = `send failed for ${subscriptionKey}: ${err.message}`;
            sendErrors.push(message);
            error = error || message;
          });
        } catch (err) {
          const message = `send threw for ${subscriptionKey}: ${err instanceof Error ? err.message : String(err)}`;
          sendErrors.push(message);
          error = error || message;
        }
      }
      if (!subscriptionsSent.length) {
        error = "WebSocket opened but no subscriptions were attempted";
        finish();
      }
    }

    function onText(rawText: string) {
      rawMessagesCount += 1;
      lastMessageTimestamp = nowIso();
      lastRawMessagePreview = rawText.slice(0, 800);

      let message: any;
      try {
        message = JSON.parse(rawText);
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
    }

    const timeout = setTimeout(finish, seconds * 1000);

    socket.once("secureConnect", () => {
      const requestLines = [
        `GET ${WS_PATH} HTTP/1.1`,
        `Host: ${WS_HOST}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "User-Agent: HypurrScope/1.0",
        "",
        "",
      ];
      socket.write(requestLines.join("\r\n"));
    });

    socket.on("data", (chunk) => {
      try {
        if (!handshakeComplete) {
          frameBuffer = Buffer.concat([frameBuffer, chunk]);
          const headerEnd = frameBuffer.indexOf("\r\n\r\n");
          if (headerEnd === -1) return;

          const headers = frameBuffer.subarray(0, headerEnd).toString("utf8");
          const remaining = frameBuffer.subarray(headerEnd + 4);
          frameBuffer = remaining;

          if (!/^HTTP\/1\.1 101\b/i.test(headers)) {
            error = `WebSocket upgrade failed: ${headers.split("\r\n")[0] || "missing status line"}`;
            finish();
            return;
          }

          const accept = headers.match(/sec-websocket-accept:\s*(.+)\r?$/im)?.[1]?.trim();
          const expectedAccept = crypto.createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
          if (accept !== expectedAccept) {
            error = "WebSocket upgrade failed: invalid Sec-WebSocket-Accept";
            finish();
            return;
          }

          connected = true;
          handshakeComplete = true;
          sendSubscriptions();
        } else {
          frameBuffer = Buffer.concat([frameBuffer, chunk]);
        }

        frameBuffer = parseFrames(frameBuffer, onText, (code, reason) => {
          closeCode = code;
          closeReason = reason;
          if (!finished) finish();
        }, socket);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        finish();
      }
    });

    socket.on("error", (err) => {
      error = err instanceof Error ? err.message : String(err);
      if (!finished && (!connected || rawMessagesCount === 0)) finish();
    });

    socket.on("close", () => {
      if (!finished && (!connected || rawMessagesCount === 0)) finish();
    });
  });
}

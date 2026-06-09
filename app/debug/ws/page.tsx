"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type WsStatus = "connecting" | "connected" | "streaming" | "stale" | "reconnecting" | "error";
type WsChannel = "allMids" | "trades" | "l2Book" | "candle" | "activeAssetCtx";
type Subscription = { type: WsChannel; coin?: ApiCoin; interval?: "1m" };
type Row = {
  key: string;
  channel: WsChannel;
  asset: ApiCoin | "all";
  acknowledgedAt: number | null;
  lastMessageAt: number | null;
  error: string | null;
};

const ASSETS: ApiCoin[] = ["BTC", "ETH", "HYPE"];
const WS_URL = "wss://api.hyperliquid.xyz/ws";
const SUBSCRIPTIONS: Subscription[] = [
  { type: "allMids" },
  ...ASSETS.flatMap((coin) => [
    { type: "trades", coin } as Subscription,
    { type: "l2Book", coin } as Subscription,
    { type: "candle", coin, interval: "1m" } as Subscription,
    { type: "activeAssetCtx", coin } as Subscription,
  ]),
];

function keyFor(subscription: Subscription) {
  return `${subscription.type}${subscription.coin ? `:${subscription.coin}` : ""}${subscription.interval ? `:${subscription.interval}` : ""}`;
}

function initialRows() {
  return Object.fromEntries(SUBSCRIPTIONS.map((subscription) => [keyFor(subscription), {
    key: keyFor(subscription),
    channel: subscription.type,
    asset: subscription.coin || "all",
    acknowledgedAt: null,
    lastMessageAt: null,
    error: null,
  } satisfies Row])) as Record<string, Row>;
}

function stamp(value: number | null) {
  return value ? new Date(value).toISOString() : null;
}

function age(value: number | null) {
  if (!value) return "waiting";
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  return seconds < 90 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}

function assetFromPayload(payload: any): ApiCoin | null {
  const row = Array.isArray(payload) ? payload[0] : payload;
  const coin = row?.coin || row?.s || row?.asset || row?.coinName ||
    row?.ctx?.coin || row?.ctx?.s ||
    row?.candle?.s || row?.candle?.coin;
  return ASSETS.includes(coin) ? coin : null;
}

function subscriptionFromAck(message: any): Subscription | null {
  const raw = message?.subscription || message?.data?.subscription || message?.data;
  const type = raw?.type;
  if (!["allMids", "trades", "l2Book", "candle", "activeAssetCtx"].includes(type)) return null;
  const coin = ASSETS.includes(raw?.coin) ? raw.coin as ApiCoin : undefined;
  return {
    type,
    coin,
    interval: raw?.interval === "1m" ? "1m" : undefined,
  };
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
  if (channel === "candle") {
    const coin = assetFromPayload(data) || message?.subscription?.coin;
    return ASSETS.includes(coin) ? { type: "candle", coin, interval: "1m" } : null;
  }
  if (channel === "activeAssetCtx") {
    const coin = assetFromPayload(data) || message?.subscription?.coin;
    return ASSETS.includes(coin) ? { type: "activeAssetCtx", coin } : null;
  }
  return null;
}

export default function DebugWsPage() {
  const [hydratedAt, setHydratedAt] = useState<number | null>(null);
  const [browserCanUseWebSocket, setBrowserCanUseWebSocket] = useState<boolean | null>(null);
  const [websocketStatus, setWebsocketStatus] = useState<WsStatus>("connecting");
  const [connectionStartedAt, setConnectionStartedAt] = useState<number | null>(null);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [closeCode, setCloseCode] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [lastSubscriptionSent, setLastSubscriptionSent] = useState<string | null>(null);
  const [userAgent, setUserAgent] = useState<string | null>(null);
  const [rawMessagesCount, setRawMessagesCount] = useState(0);
  const [subscriptionAcksCount, setSubscriptionAcksCount] = useState(0);
  const [lastRawMessagePreview, setLastRawMessagePreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>(() => initialRows());
  const [logs, setLogs] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const stoppedRef = useRef(false);

  function log(message: string) {
    const line = `${new Date().toISOString()} ${message}`;
    console.info(`[HypurrScope debug/ws] ${message}`);
    setLogs((current) => [line, ...current].slice(0, 100));
  }

  function markAck(subscription: Subscription, at: number) {
    const key = keyFor(subscription);
    setRows((current) => ({
      ...current,
      [key]: {
        ...(current[key] || { key, channel: subscription.type, asset: subscription.coin || "all", acknowledgedAt: null, lastMessageAt: null, error: null }),
        acknowledgedAt: at,
        error: null,
      },
    }));
    log(`subscription acknowledged ${key}`);
  }

  function markMessage(subscription: Subscription, at: number) {
    const key = keyFor(subscription);
    setRows((current) => ({
      ...current,
      [key]: {
        ...(current[key] || { key, channel: subscription.type, asset: subscription.coin || "all", acknowledgedAt: null, lastMessageAt: null, error: null }),
        lastMessageAt: at,
        error: null,
      },
    }));
    setWebsocketStatus("streaming");
    setLastError(null);
    setLastMessageTimestamp(at);
  }

  useEffect(() => {
    stoppedRef.current = false;
    setHydratedAt(Date.now());
    setBrowserCanUseWebSocket(typeof window.WebSocket === "function");
    setUserAgent(window.navigator.userAgent);

    function subscribeAll(socket: WebSocket) {
      SUBSCRIPTIONS.forEach((subscription) => {
        const key = keyFor(subscription);
        socket.send(JSON.stringify({ method: "subscribe", subscription }));
        setLastSubscriptionSent(key);
        log(`sent subscription ${key}`);
      });
    }

    function scheduleReconnect() {
      if (stoppedRef.current) return;
      setWebsocketStatus("reconnecting");
      setReconnectCount((current) => current + 1);
      setLastError((current) => current || "WebSocket disconnected; reconnecting");
      const delay = Math.min(15_000, 1_000 * Math.max(1, 2 ** Math.min(attemptsRef.current, 4)));
      attemptsRef.current += 1;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      log(`reconnecting in ${delay}ms`);
      reconnectRef.current = window.setTimeout(connect, delay);
    }

    function connect() {
      if (stoppedRef.current) return;
      if (typeof window.WebSocket !== "function") {
        setWebsocketStatus("error");
        setLastError("Browser WebSocket API is unavailable");
        return;
      }

      setCloseCode(null);
      setCloseReason(null);
      setWebsocketStatus(attemptsRef.current ? "reconnecting" : "connecting");
      setLastError(null);
      log(`opening ${WS_URL}`);

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      const openTimeout = window.setTimeout(() => {
        if (socket.readyState !== WebSocket.CONNECTING) return;
        const error = `WebSocket connection timed out while connecting to ${WS_URL}`;
        setWebsocketStatus("error");
        setLastError(error);
        log(error);
        socket.close();
      }, 20_000);

      socket.onopen = () => {
        window.clearTimeout(openTimeout);
        attemptsRef.current = 0;
        setConnectionStartedAt(Date.now());
        setWebsocketStatus("connected");
        setLastError(null);
        log("websocket connected");
        subscribeAll(socket);
      };

      socket.onmessage = (event) => {
        const at = Date.now();
        setRawMessagesCount((current) => current + 1);
        setLastRawMessagePreview(String(event.data || "").slice(0, 500));
        setLastMessageTimestamp(at);

        let message: any;
        try {
          message = JSON.parse(String(event.data || "{}"));
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);
          setWebsocketStatus("error");
          setLastError(errorText);
          log(`websocket parse error: ${errorText}`);
          return;
        }

        const channel = String(message.channel || "");
        const data = message.data;

        if (channel === "subscriptionResponse") {
          setSubscriptionAcksCount((current) => current + 1);
          const subscription = subscriptionFromAck(message);
          if (subscription) markAck(subscription, at);
          return;
        }

        if (channel === "error" || message.error) {
          const errorText = String(message.error || data?.error || "Hyperliquid WebSocket error");
          setWebsocketStatus("error");
          setLastError(errorText);
          log(`websocket error message: ${errorText}`);
          return;
        }

        const subscription = subscriptionFromLiveMessage(channel, data, message);
        if (subscription) markMessage(subscription, at);
      };

      socket.onerror = () => {
        setWebsocketStatus("error");
        setLastError(`Browser WebSocket error event while connecting to ${WS_URL}`);
        log(`Browser WebSocket error event while connecting to ${WS_URL}`);
      };

      socket.onclose = (event) => {
        window.clearTimeout(openTimeout);
        setCloseCode(event.code);
        setCloseReason(event.reason || "");
        log(`websocket closed code=${event.code} reason=${event.reason || "-"}`);
        scheduleReconnect();
      };
    }

    connect();
    const staleTimer = window.setInterval(() => {
      setLastMessageTimestamp((current) => {
        if (!current || Date.now() - current <= 90_000) return current;
        setWebsocketStatus((status) => status === "streaming" || status === "connected" ? "stale" : status);
        setLastError("No WebSocket messages for 90s");
        return current;
      });
    }, 1_000);

    return () => {
      stoppedRef.current = true;
      window.clearInterval(staleTimer);
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      if (socketRef.current) socketRef.current.close();
      socketRef.current = null;
    };
  }, []);

  const proof = useMemo(() => ({
    hydratedAt: stamp(hydratedAt),
    browserCanUseWebSocket,
    attemptedUrl: WS_URL,
    websocketStatus,
    connectionStartedAt: stamp(connectionStartedAt),
    lastMessageTimestamp: stamp(lastMessageTimestamp),
    reconnectCount,
    lastError,
    closeCode,
    closeReason,
    lastSubscriptionSent,
    userAgent,
    rawMessagesCount,
    subscriptionAcksCount,
    lastRawMessagePreview,
    btcTradesLastTimestamp: stamp(rows["trades:BTC"]?.lastMessageAt ?? null),
    ethTradesLastTimestamp: stamp(rows["trades:ETH"]?.lastMessageAt ?? null),
    hypeTradesLastTimestamp: stamp(rows["trades:HYPE"]?.lastMessageAt ?? null),
    btcL2BookLastTimestamp: stamp(rows["l2Book:BTC"]?.lastMessageAt ?? null),
    ethL2BookLastTimestamp: stamp(rows["l2Book:ETH"]?.lastMessageAt ?? null),
    hypeL2BookLastTimestamp: stamp(rows["l2Book:HYPE"]?.lastMessageAt ?? null),
    btcCandleLastTimestamp: stamp(rows["candle:BTC:1m"]?.lastMessageAt ?? null),
    ethCandleLastTimestamp: stamp(rows["candle:ETH:1m"]?.lastMessageAt ?? null),
    hypeCandleLastTimestamp: stamp(rows["candle:HYPE:1m"]?.lastMessageAt ?? null),
    btcActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:BTC"]?.lastMessageAt ?? null),
    ethActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:ETH"]?.lastMessageAt ?? null),
    hypeActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:HYPE"]?.lastMessageAt ?? null),
    subscribedChannels: SUBSCRIPTIONS.map(keyFor),
  }), [
    hydratedAt,
    browserCanUseWebSocket,
    websocketStatus,
    connectionStartedAt,
    lastMessageTimestamp,
    reconnectCount,
    lastError,
    closeCode,
    closeReason,
    lastSubscriptionSent,
    userAgent,
    rawMessagesCount,
    subscriptionAcksCount,
    lastRawMessagePreview,
    rows,
  ]);

  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope WebSocket debug</h1>
      <section style={{ border: "1px solid #244338", padding: 16, marginBottom: 18 }}>
        <p><strong>hydratedAt:</strong> <span>{stamp(hydratedAt) || "waiting"}</span></p>
        <p><strong>browserCanUseWebSocket:</strong> <span>{browserCanUseWebSocket === null ? "waiting" : String(browserCanUseWebSocket)}</span></p>
        <p><strong>attemptedUrl:</strong> <span>{WS_URL}</span></p>
        <p><strong>websocketStatus:</strong> <span>{websocketStatus}</span></p>
        <p><strong>connectionStartedAt:</strong> <span>{stamp(connectionStartedAt) || "waiting"}</span></p>
        <p><strong>lastMessageTimestamp:</strong> <span>{stamp(lastMessageTimestamp) || "waiting"}</span></p>
        <p><strong>reconnectCount:</strong> <span>{reconnectCount}</span></p>
        <p><strong>lastError:</strong> <span>{lastError || "-"}</span></p>
        <p><strong>closeCode:</strong> <span>{closeCode ?? "-"}</span></p>
        <p><strong>closeReason:</strong> <span>{closeReason || "-"}</span></p>
        <p><strong>lastSubscriptionSent:</strong> <span>{lastSubscriptionSent || "waiting"}</span></p>
        <p><strong>userAgent:</strong> <span>{userAgent || "waiting"}</span></p>
        <p><strong>rawMessagesCount:</strong> <span>{rawMessagesCount}</span></p>
        <p><strong>subscriptionAcksCount:</strong> <span>{subscriptionAcksCount}</span></p>
        <p><strong>lastRawMessagePreview:</strong> <span>{lastRawMessagePreview || "waiting"}</span></p>
      </section>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
        <thead>
          <tr><th>channel</th><th>asset</th><th>ack</th><th>last message</th><th>last message ISO</th><th>error</th></tr>
        </thead>
        <tbody>
          {Object.values(rows).map((row) => (
            <tr key={row.key}>
              <td>{row.channel}</td>
              <td>{row.asset}</td>
              <td>{row.acknowledgedAt ? age(row.acknowledgedAt) : "waiting"}</td>
              <td>{age(row.lastMessageAt)}</td>
              <td>{stamp(row.lastMessageAt) || "-"}</td>
              <td>{row.error || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Browser console logs</h2>
      <pre style={{ marginBottom: 18, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>{logs.length ? logs.join("\n") : "waiting for browser hydration"}</pre>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Machine-readable proof</h2>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>{JSON.stringify(proof, null, 2)}</pre>
    </main>
  );
}

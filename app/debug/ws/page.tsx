"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type WsStatus = "connecting" | "connected" | "streaming" | "stale" | "reconnecting" | "error";
type WsChannel = "allMids" | "trades" | "l2Book" | "candle" | "activeAssetCtx";
type WsSubscription = { type: WsChannel; coin?: ApiCoin; interval?: "1m" };
type DebugRow = {
  key: string;
  channel: WsChannel;
  asset: ApiCoin | "all";
  acknowledgedAt: number | null;
  lastMessageAt: number | null;
  error: string | null;
};

const ASSETS: ApiCoin[] = ["BTC", "ETH", "HYPE"];
const WS_URL = "wss://api.hyperliquid.xyz/ws";
const SUBSCRIPTIONS: WsSubscription[] = [
  { type: "allMids" },
  ...ASSETS.flatMap((coin): WsSubscription[] => [
    { type: "trades", coin },
    { type: "l2Book", coin },
    { type: "candle", coin, interval: "1m" },
    { type: "activeAssetCtx", coin },
  ]),
];

function keyFor(subscription: WsSubscription) {
  return `${subscription.type}${subscription.coin ? `:${subscription.coin}` : ""}${subscription.interval ? `:${subscription.interval}` : ""}`;
}

function initialRows(previous?: Record<string, DebugRow>) {
  return Object.fromEntries(SUBSCRIPTIONS.map((subscription) => {
    const key = keyFor(subscription);
    const old = previous?.[key];
    return [key, {
      key,
      channel: subscription.type,
      asset: subscription.coin || "all",
      acknowledgedAt: old?.acknowledgedAt ?? null,
      lastMessageAt: old?.lastMessageAt ?? null,
      error: old?.error ?? null,
    } satisfies DebugRow];
  })) as Record<string, DebugRow>;
}

function subscriptionFromResponse(message: any): WsSubscription | null {
  const raw = message?.data?.subscription || message?.subscription;
  if (!raw || !["allMids", "trades", "l2Book", "candle", "activeAssetCtx"].includes(raw.type)) return null;
  const coin = ASSETS.includes(raw.coin) ? raw.coin as ApiCoin : undefined;
  return { type: raw.type, coin, interval: raw.interval === "1m" ? "1m" : undefined };
}

function assetFromData(data: any): ApiCoin | null {
  const coin = data?.coin || data?.s || data?.ctx?.coin || data?.[0]?.coin || data?.[0]?.s;
  return ASSETS.includes(coin) ? coin : null;
}

function stamp(value: number | null) {
  return value ? new Date(value).toISOString() : null;
}

function age(value: number | null, now: number) {
  if (!value) return "waiting";
  const seconds = Math.max(0, Math.round((now - value) / 1000));
  return seconds < 90 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}

export default function DebugWsPage() {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, DebugRow>>(() => initialRows());
  const [now, setNow] = useState(Date.now());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    stoppedRef.current = false;

    function scheduleReconnect() {
      if (stoppedRef.current) return;
      setStatus("reconnecting");
      setLastError("WebSocket disconnected; reconnecting");
      setReconnectCount((value) => value + 1);
      const delay = Math.min(15_000, 1_000 * Math.max(1, 2 ** Math.min(attemptsRef.current, 4)));
      attemptsRef.current += 1;
      reconnectRef.current = window.setTimeout(connect, delay);
    }

    function subscribe(socket: WebSocket) {
      SUBSCRIPTIONS.forEach((subscription) => {
        socket.send(JSON.stringify({ method: "subscribe", subscription }));
      });
    }

    function markAck(subscription: WsSubscription, at: number) {
      const key = keyFor(subscription);
      setRows((current) => ({
        ...current,
        [key]: { ...(current[key] || { key, channel: subscription.type, asset: subscription.coin || "all", lastMessageAt: null }), acknowledgedAt: at, error: null },
      }));
    }

    function markMessage(subscription: WsSubscription, at: number) {
      const key = keyFor(subscription);
      setRows((current) => ({
        ...current,
        [key]: { ...(current[key] || { key, channel: subscription.type, asset: subscription.coin || "all", acknowledgedAt: null }), lastMessageAt: at, error: null },
      }));
    }

    function connect() {
      if (stoppedRef.current) return;
      setStatus(attemptsRef.current > 0 ? "reconnecting" : "connecting");
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        const at = Date.now();
        attemptsRef.current = 0;
        setStartedAt((value) => value || at);
        setStatus("connected");
        setLastError(null);
        subscribe(socket);
      };

      socket.onmessage = (event) => {
        try {
          const at = Date.now();
          const message = JSON.parse(event.data);
          const channel = String(message.channel || "");
          const data = message.data;
          setLastMessageAt(at);

          if (channel === "subscriptionResponse") {
            const subscription = subscriptionFromResponse(message);
            if (subscription) markAck(subscription, at);
            return;
          }

          if (channel === "error" || message.error) {
            setStatus("error");
            setLastError(String(message.error || data?.error || "Hyperliquid WebSocket error"));
            return;
          }

          if (channel === "allMids") markMessage({ type: "allMids" }, at);
          if (channel === "trades") {
            const coin = assetFromData(Array.isArray(data) ? data : data?.trades || data);
            if (coin) markMessage({ type: "trades", coin }, at);
          }
          if (channel === "l2Book") {
            const coin = assetFromData(data);
            if (coin) markMessage({ type: "l2Book", coin }, at);
          }
          if (channel === "candle") {
            const coin = assetFromData(data);
            if (coin) markMessage({ type: "candle", coin, interval: "1m" }, at);
          }
          if (channel === "activeAssetCtx") {
            const coin = assetFromData(data);
            if (coin) markMessage({ type: "activeAssetCtx", coin }, at);
          }
          setStatus("streaming");
        } catch (error) {
          setStatus("error");
          setLastError(error instanceof Error ? error.message : String(error));
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setLastError("Hyperliquid WebSocket error");
      };

      socket.onclose = () => scheduleReconnect();
    }

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!lastMessageAt || status === "reconnecting" || status === "error") return;
    if (now - lastMessageAt > 90_000) {
      setStatus("stale");
      setLastError("No WebSocket messages for 90s");
    }
  }, [lastMessageAt, now, status]);

  const rowsList = useMemo(() => Object.values(rows), [rows]);
  const proof = {
    websocketStatus: status,
    connectionStartedAt: stamp(startedAt),
    lastMessageTimestamp: stamp(lastMessageAt),
    subscribedChannels: rowsList.map((row) => `${row.channel}:${row.asset}`),
    btcTradesLastTimestamp: stamp(rows[keyFor({ type: "trades", coin: "BTC" })]?.lastMessageAt ?? null),
    ethTradesLastTimestamp: stamp(rows[keyFor({ type: "trades", coin: "ETH" })]?.lastMessageAt ?? null),
    hypeTradesLastTimestamp: stamp(rows[keyFor({ type: "trades", coin: "HYPE" })]?.lastMessageAt ?? null),
    btcL2BookLastTimestamp: stamp(rows[keyFor({ type: "l2Book", coin: "BTC" })]?.lastMessageAt ?? null),
    ethL2BookLastTimestamp: stamp(rows[keyFor({ type: "l2Book", coin: "ETH" })]?.lastMessageAt ?? null),
    hypeL2BookLastTimestamp: stamp(rows[keyFor({ type: "l2Book", coin: "HYPE" })]?.lastMessageAt ?? null),
    btcActiveAssetCtxLastTimestamp: stamp(rows[keyFor({ type: "activeAssetCtx", coin: "BTC" })]?.lastMessageAt ?? null),
    ethActiveAssetCtxLastTimestamp: stamp(rows[keyFor({ type: "activeAssetCtx", coin: "ETH" })]?.lastMessageAt ?? null),
    hypeActiveAssetCtxLastTimestamp: stamp(rows[keyFor({ type: "activeAssetCtx", coin: "HYPE" })]?.lastMessageAt ?? null),
    reconnectCount,
    lastError,
  };

  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope WebSocket debug</h1>
      <section style={{ border: "1px solid #244338", padding: 16, marginBottom: 18 }}>
        <p><strong>websocket status:</strong> {status}</p>
        <p><strong>connection started at:</strong> {stamp(startedAt) || "waiting"}</p>
        <p><strong>last message timestamp:</strong> {stamp(lastMessageAt) || "waiting"}</p>
        <p><strong>reconnect count:</strong> {reconnectCount}</p>
        <p><strong>last error:</strong> {lastError || "-"}</p>
      </section>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
        <thead>
          <tr><th>channel</th><th>asset</th><th>ack</th><th>last message</th><th>last message ISO</th><th>error</th></tr>
        </thead>
        <tbody>
          {rowsList.map((row) => (
            <tr key={row.key}>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{row.channel}</td>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{row.asset}</td>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{row.acknowledgedAt ? age(row.acknowledgedAt, now) : "waiting"}</td>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{age(row.lastMessageAt, now)}</td>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{stamp(row.lastMessageAt) || "-"}</td>
              <td style={{ border: "1px solid #244338", padding: 8 }}>{row.error || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Machine-readable proof</h2>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>{JSON.stringify(proof, null, 2)}</pre>
    </main>
  );
}

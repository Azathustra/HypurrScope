type ApiCoin = "BTC" | "ETH" | "HYPE";
type WsChannel = "allMids" | "trades" | "l2Book" | "candle" | "activeAssetCtx";
type Subscription = { type: WsChannel; coin?: ApiCoin; interval?: "1m" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function rowId(key: string, field: string) {
  return `row-${key.replace(/[^a-z0-9]/gi, "-")}-${field}`;
}

function debugScript() {
  return `
(function () {
  var ASSETS = ${JSON.stringify(ASSETS)};
  var WS_URL = ${JSON.stringify(WS_URL)};
  var SUBSCRIPTIONS = ${JSON.stringify(SUBSCRIPTIONS)};
  var rows = {};
  var socket = null;
  var reconnectTimer = null;
  var stopped = false;
  var reconnectAttempts = 0;
  var state = {
    hydratedAt: null,
    browserCanUseWebSocket: null,
    attemptedUrl: WS_URL,
    websocketStatus: "connecting",
    connectionStartedAt: null,
    lastMessageTimestamp: null,
    reconnectCount: 0,
    lastError: null,
    closeCode: null,
    closeReason: null,
    lastSubscriptionSent: null,
    userAgent: null,
    rawMessagesCount: 0,
    subscriptionAcksCount: 0,
    lastRawMessagePreview: null
  };

  function keyFor(subscription) {
    return subscription.type + (subscription.coin ? ":" + subscription.coin : "") + (subscription.interval ? ":" + subscription.interval : "");
  }

  function safeId(key, field) {
    return "row-" + key.replace(/[^a-z0-9]/gi, "-") + "-" + field;
  }

  function stamp(value) {
    return value || null;
  }

  function age(value) {
    if (!value) return "waiting";
    var seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000));
    return seconds < 90 ? seconds + "s ago" : Math.round(seconds / 60) + "m ago";
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null || value === "" ? "waiting" : String(value);
  }

  function log(message) {
    var line = new Date().toISOString() + " " + message;
    console.info("[HypurrScope debug/ws] " + message);
    var logs = document.getElementById("browser-console-logs");
    if (logs) logs.textContent = line + "\\n" + (logs.textContent || "").replace("waiting for browser WebSocket", "");
  }

  function assetFromPayload(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) {
      if (typeof payload[0] === "string" && ASSETS.indexOf(payload[0]) >= 0) return payload[0];
      return assetFromPayload(payload[0]);
    }
    var coin = payload.coin || payload.s || payload.asset || payload.coinName ||
      (payload.ctx && (payload.ctx.coin || payload.ctx.s)) ||
      (payload.candle && (payload.candle.s || payload.candle.coin));
    return ASSETS.indexOf(coin) >= 0 ? coin : null;
  }

  function subscriptionFromAck(message) {
    var raw = (message && message.subscription) ||
      (message && message.data && message.data.subscription) ||
      (message && message.data);
    var type = raw && raw.type;
    if (["allMids", "trades", "l2Book", "candle", "activeAssetCtx"].indexOf(type) < 0) return null;
    var subscription = { type: type };
    if (ASSETS.indexOf(raw.coin) >= 0) subscription.coin = raw.coin;
    if (raw.interval === "1m") subscription.interval = "1m";
    return subscription;
  }

  function subscriptionFromLiveMessage(channel, data, message) {
    if (channel === "allMids") return { type: "allMids" };
    if (channel === "trades") {
      var tradeRows = Array.isArray(data) ? data : (data && Array.isArray(data.trades) ? data.trades : [data]);
      var tradeCoin = assetFromPayload(tradeRows) || assetFromPayload(data) || (message.subscription && message.subscription.coin);
      return ASSETS.indexOf(tradeCoin) >= 0 ? { type: "trades", coin: tradeCoin } : null;
    }
    if (channel === "l2Book") {
      var bookCoin = assetFromPayload(data) || (message.subscription && message.subscription.coin);
      return ASSETS.indexOf(bookCoin) >= 0 ? { type: "l2Book", coin: bookCoin } : null;
    }
    if (channel === "candle") {
      var candleCoin = assetFromPayload(data) || (message.subscription && message.subscription.coin);
      return ASSETS.indexOf(candleCoin) >= 0 ? { type: "candle", coin: candleCoin, interval: "1m" } : null;
    }
    if (channel === "activeAssetCtx") {
      var ctxCoin = assetFromPayload(data) || (message.subscription && message.subscription.coin);
      return ASSETS.indexOf(ctxCoin) >= 0 ? { type: "activeAssetCtx", coin: ctxCoin } : null;
    }
    return null;
  }

  function ensureRow(subscription) {
    var key = keyFor(subscription);
    if (!rows[key]) {
      rows[key] = {
        key: key,
        channel: subscription.type,
        asset: subscription.coin || "all",
        acknowledgedAt: null,
        lastMessageAt: null,
        error: null
      };
    }
    return rows[key];
  }

  function markAck(subscription) {
    var row = ensureRow(subscription);
    row.acknowledgedAt = new Date().toISOString();
    row.error = null;
    log("subscription acknowledged " + row.key);
  }

  function markMessage(subscription) {
    var row = ensureRow(subscription);
    var now = new Date().toISOString();
    row.lastMessageAt = now;
    row.error = null;
    state.websocketStatus = "streaming";
    state.lastMessageTimestamp = now;
    state.lastError = null;
  }

  function proof() {
    return {
      hydratedAt: state.hydratedAt,
      browserCanUseWebSocket: state.browserCanUseWebSocket,
      attemptedUrl: state.attemptedUrl,
      websocketStatus: state.websocketStatus,
      connectionStartedAt: state.connectionStartedAt,
      lastMessageTimestamp: state.lastMessageTimestamp,
      reconnectCount: state.reconnectCount,
      lastError: state.lastError,
      closeCode: state.closeCode,
      closeReason: state.closeReason,
      lastSubscriptionSent: state.lastSubscriptionSent,
      userAgent: state.userAgent,
      rawMessagesCount: state.rawMessagesCount,
      subscriptionAcksCount: state.subscriptionAcksCount,
      lastRawMessagePreview: state.lastRawMessagePreview,
      btcTradesLastTimestamp: stamp(rows["trades:BTC"] && rows["trades:BTC"].lastMessageAt),
      ethTradesLastTimestamp: stamp(rows["trades:ETH"] && rows["trades:ETH"].lastMessageAt),
      hypeTradesLastTimestamp: stamp(rows["trades:HYPE"] && rows["trades:HYPE"].lastMessageAt),
      btcL2BookLastTimestamp: stamp(rows["l2Book:BTC"] && rows["l2Book:BTC"].lastMessageAt),
      ethL2BookLastTimestamp: stamp(rows["l2Book:ETH"] && rows["l2Book:ETH"].lastMessageAt),
      hypeL2BookLastTimestamp: stamp(rows["l2Book:HYPE"] && rows["l2Book:HYPE"].lastMessageAt),
      btcCandleLastTimestamp: stamp(rows["candle:BTC:1m"] && rows["candle:BTC:1m"].lastMessageAt),
      ethCandleLastTimestamp: stamp(rows["candle:ETH:1m"] && rows["candle:ETH:1m"].lastMessageAt),
      hypeCandleLastTimestamp: stamp(rows["candle:HYPE:1m"] && rows["candle:HYPE:1m"].lastMessageAt),
      btcActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:BTC"] && rows["activeAssetCtx:BTC"].lastMessageAt),
      ethActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:ETH"] && rows["activeAssetCtx:ETH"].lastMessageAt),
      hypeActiveAssetCtxLastTimestamp: stamp(rows["activeAssetCtx:HYPE"] && rows["activeAssetCtx:HYPE"].lastMessageAt),
      subscribedChannels: SUBSCRIPTIONS.map(keyFor)
    };
  }

  function render() {
    setText("hydratedAt", state.hydratedAt);
    setText("browserCanUseWebSocket", state.browserCanUseWebSocket === null ? "waiting" : String(state.browserCanUseWebSocket));
    setText("attemptedUrl", state.attemptedUrl);
    setText("websocketStatus", state.websocketStatus);
    setText("connectionStartedAt", state.connectionStartedAt);
    setText("lastMessageTimestamp", state.lastMessageTimestamp);
    setText("reconnectCount", state.reconnectCount);
    setText("lastError", state.lastError || "-");
    setText("closeCode", state.closeCode == null ? "-" : state.closeCode);
    setText("closeReason", state.closeReason || "-");
    setText("lastSubscriptionSent", state.lastSubscriptionSent || "waiting");
    setText("userAgent", state.userAgent || "waiting");
    setText("rawMessagesCount", state.rawMessagesCount);
    setText("subscriptionAcksCount", state.subscriptionAcksCount);
    setText("lastRawMessagePreview", state.lastRawMessagePreview || "waiting");
    Object.keys(rows).forEach(function (key) {
      var row = rows[key];
      setText(safeId(key, "ack"), row.acknowledgedAt ? age(row.acknowledgedAt) : "waiting");
      setText(safeId(key, "last"), age(row.lastMessageAt));
      setText(safeId(key, "iso"), row.lastMessageAt || "-");
      setText(safeId(key, "error"), row.error || "-");
    });
    var machine = document.getElementById("machine-readable-proof");
    if (machine) machine.textContent = JSON.stringify(proof(), null, 2);
    window.__hypurrscopeWsProof = proof();
  }

  function subscribeAll(ws) {
    SUBSCRIPTIONS.forEach(function (subscription) {
      var key = keyFor(subscription);
      ws.send(JSON.stringify({ method: "subscribe", subscription: subscription }));
      state.lastSubscriptionSent = key;
      log("sent subscription " + key);
      render();
    });
  }

  function scheduleReconnect() {
    if (stopped) return;
    state.websocketStatus = "reconnecting";
    state.reconnectCount += 1;
    state.lastError = state.lastError || "WebSocket disconnected; reconnecting";
    render();
    var delay = Math.min(15000, 1000 * Math.max(1, Math.pow(2, Math.min(reconnectAttempts, 4))));
    reconnectAttempts += 1;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    log("reconnecting in " + delay + "ms");
    reconnectTimer = window.setTimeout(connect, delay);
  }

  function connect() {
    if (stopped) return;
    if (typeof window.WebSocket !== "function") {
      state.browserCanUseWebSocket = false;
      state.websocketStatus = "error";
      state.lastError = "Browser WebSocket API is unavailable";
      render();
      return;
    }
    state.hydratedAt = state.hydratedAt || new Date().toISOString();
    state.browserCanUseWebSocket = true;
    state.userAgent = window.navigator.userAgent;
    state.connectionStartedAt = new Date().toISOString();
    state.websocketStatus = reconnectAttempts ? "reconnecting" : "connecting";
    state.closeCode = null;
    state.closeReason = null;
    state.lastError = null;
    render();
    log("opening " + WS_URL);

    socket = new WebSocket(WS_URL);
    var openTimeout = window.setTimeout(function () {
      if (!socket || socket.readyState !== WebSocket.CONNECTING) return;
      state.websocketStatus = "error";
      state.lastError = "WebSocket connection timed out while connecting to " + WS_URL;
      render();
      log(state.lastError);
      socket.close();
    }, 20000);

    socket.onopen = function () {
      window.clearTimeout(openTimeout);
      reconnectAttempts = 0;
      state.websocketStatus = "connected";
      state.lastError = null;
      render();
      log("websocket connected");
      subscribeAll(socket);
    };

    socket.onmessage = function (event) {
      state.rawMessagesCount += 1;
      state.lastRawMessagePreview = String(event.data || "").slice(0, 500);
      state.lastMessageTimestamp = new Date().toISOString();
      var message;
      try {
        message = JSON.parse(String(event.data || "{}"));
      } catch (error) {
        state.websocketStatus = "error";
        state.lastError = error && error.message ? error.message : String(error);
        render();
        log("websocket parse error: " + state.lastError);
        return;
      }
      var channel = String(message.channel || "");
      var data = message.data;
      if (channel === "subscriptionResponse") {
        state.subscriptionAcksCount += 1;
        var ackSubscription = subscriptionFromAck(message);
        if (ackSubscription) markAck(ackSubscription);
        render();
        return;
      }
      if (channel === "error" || message.error) {
        state.websocketStatus = "error";
        state.lastError = String(message.error || (data && data.error) || "Hyperliquid WebSocket error");
        render();
        log("websocket error message: " + state.lastError);
        return;
      }
      var liveSubscription = subscriptionFromLiveMessage(channel, data, message);
      if (liveSubscription) markMessage(liveSubscription);
      render();
    };

    socket.onerror = function () {
      state.websocketStatus = "error";
      state.lastError = "Browser WebSocket error event while connecting to " + WS_URL;
      render();
      log(state.lastError);
    };

    socket.onclose = function (event) {
      window.clearTimeout(openTimeout);
      state.closeCode = event.code;
      state.closeReason = event.reason || "";
      render();
      log("websocket closed code=" + event.code + " reason=" + (event.reason || "-"));
      scheduleReconnect();
    };
  }

  SUBSCRIPTIONS.forEach(function (subscription) {
    ensureRow(subscription);
  });
  render();
  connect();
  window.setInterval(render, 1000);
})();
`;
}

export default function DebugWsPage() {
  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope WebSocket debug</h1>
      <section style={{ border: "1px solid #244338", padding: 16, marginBottom: 18 }}>
        <p><strong>hydratedAt:</strong> <span id="hydratedAt">waiting</span></p>
        <p><strong>browserCanUseWebSocket:</strong> <span id="browserCanUseWebSocket">waiting</span></p>
        <p><strong>attemptedUrl:</strong> <span id="attemptedUrl">{WS_URL}</span></p>
        <p><strong>websocketStatus:</strong> <span id="websocketStatus">connecting</span></p>
        <p><strong>connectionStartedAt:</strong> <span id="connectionStartedAt">waiting</span></p>
        <p><strong>lastMessageTimestamp:</strong> <span id="lastMessageTimestamp">waiting</span></p>
        <p><strong>reconnectCount:</strong> <span id="reconnectCount">0</span></p>
        <p><strong>lastError:</strong> <span id="lastError">-</span></p>
        <p><strong>closeCode:</strong> <span id="closeCode">-</span></p>
        <p><strong>closeReason:</strong> <span id="closeReason">-</span></p>
        <p><strong>lastSubscriptionSent:</strong> <span id="lastSubscriptionSent">waiting</span></p>
        <p><strong>userAgent:</strong> <span id="userAgent">waiting</span></p>
        <p><strong>rawMessagesCount:</strong> <span id="rawMessagesCount">0</span></p>
        <p><strong>subscriptionAcksCount:</strong> <span id="subscriptionAcksCount">0</span></p>
        <p><strong>lastRawMessagePreview:</strong> <span id="lastRawMessagePreview">waiting</span></p>
      </section>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
        <thead>
          <tr><th>channel</th><th>asset</th><th>ack</th><th>last message</th><th>last message ISO</th><th>error</th></tr>
        </thead>
        <tbody>
          {SUBSCRIPTIONS.map((subscription) => {
            const key = keyFor(subscription);
            return (
              <tr key={key}>
                <td>{subscription.type}</td>
                <td>{subscription.coin || "all"}</td>
                <td id={rowId(key, "ack")}>waiting</td>
                <td id={rowId(key, "last")}>waiting</td>
                <td id={rowId(key, "iso")}>-</td>
                <td id={rowId(key, "error")}>-</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Browser console logs</h2>
      <pre id="browser-console-logs" style={{ marginBottom: 18, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>waiting for browser WebSocket</pre>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Machine-readable proof</h2>
      <pre id="machine-readable-proof" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>waiting</pre>
      <script dangerouslySetInnerHTML={{ __html: debugScript() }} />
    </main>
  );
}

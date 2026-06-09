export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEBUG_SCRIPT = String.raw`
(function () {
  var ASSETS = ["BTC", "ETH", "HYPE"];
  var WS_URL = "wss://api.hyperliquid.xyz/ws";
  var SUBSCRIPTIONS = [{ type: "allMids" }];
  ASSETS.forEach(function (coin) {
    SUBSCRIPTIONS.push({ type: "trades", coin: coin });
    SUBSCRIPTIONS.push({ type: "l2Book", coin: coin });
    SUBSCRIPTIONS.push({ type: "candle", coin: coin, interval: "1m" });
    SUBSCRIPTIONS.push({ type: "activeAssetCtx", coin: coin });
  });

  var state = {
    hydratedAt: Date.now(),
    websocketStatus: "connecting",
    connectionStartedAt: null,
    lastMessageTimestamp: null,
    reconnectCount: 0,
    lastError: null,
    userAgent: navigator.userAgent,
    browserCanUseWebSocket: typeof window.WebSocket === "function",
    attemptedUrl: WS_URL,
    closeCode: null,
    closeReason: null,
    lastSubscriptionSent: null
  };
  var logs = [];
  var rows = {};
  var socket = null;
  var reconnectTimer = null;
  var staleTimer = null;
  var reconnectAttempt = 0;
  var stopped = false;

  function keyFor(subscription) {
    var key = subscription.type;
    if (subscription.coin) key += ":" + subscription.coin;
    if (subscription.interval) key += ":" + subscription.interval;
    return key;
  }

  SUBSCRIPTIONS.forEach(function (subscription) {
    var key = keyFor(subscription);
    rows[key] = {
      key: key,
      channel: subscription.type,
      asset: subscription.coin || "all",
      acknowledgedAt: null,
      lastMessageAt: null,
      error: null
    };
  });

  function stamp(value) {
    return value ? new Date(value).toISOString() : null;
  }

  function age(value) {
    if (!value) return "waiting";
    var seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
    return seconds < 90 ? seconds + "s ago" : Math.round(seconds / 60) + "m ago";
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value == null || value === "" ? "-" : String(value);
  }

  function log(message) {
    var line = new Date().toISOString() + " " + message;
    console.info("[HypurrScope debug/ws] " + message);
    logs.unshift(line);
    if (logs.length > 80) logs.length = 80;
    render();
  }

  function subscriptionFromResponse(message) {
    var raw = (message && message.data && message.data.subscription) || (message && message.subscription);
    if (!raw || ["allMids", "trades", "l2Book", "candle", "activeAssetCtx"].indexOf(raw.type) === -1) return null;
    return {
      type: raw.type,
      coin: ASSETS.indexOf(raw.coin) >= 0 ? raw.coin : undefined,
      interval: raw.interval === "1m" ? "1m" : undefined
    };
  }

  function assetFromPayload(payload) {
    var row = Array.isArray(payload) ? payload[0] : payload;
    if (!row) return null;
    var coin = row.coin || row.s || (row.ctx && row.ctx.coin) || (row.candle && row.candle.s);
    return ASSETS.indexOf(coin) >= 0 ? coin : null;
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

  function markAck(subscription, at) {
    var row = ensureRow(subscription);
    row.acknowledgedAt = at;
    row.error = null;
    log("subscription acknowledged " + keyFor(subscription));
  }

  function markMessage(subscription, at) {
    var row = ensureRow(subscription);
    row.lastMessageAt = at;
    row.error = null;
    state.websocketStatus = "streaming";
    state.lastMessageTimestamp = at;
    render();
  }

  function proof() {
    return {
      hydratedAt: stamp(state.hydratedAt),
      browserCanUseWebSocket: state.browserCanUseWebSocket,
      attemptedUrl: state.attemptedUrl,
      websocketStatus: state.websocketStatus,
      connectionStartedAt: stamp(state.connectionStartedAt),
      lastMessageTimestamp: stamp(state.lastMessageTimestamp),
      reconnectCount: state.reconnectCount,
      lastError: state.lastError,
      closeCode: state.closeCode,
      closeReason: state.closeReason,
      lastSubscriptionSent: state.lastSubscriptionSent,
      userAgent: state.userAgent,
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
    setText("hydratedAt", stamp(state.hydratedAt) || "waiting");
    setText("browserCanUseWebSocket", String(state.browserCanUseWebSocket));
    setText("attemptedUrl", state.attemptedUrl);
    setText("websocketStatus", state.websocketStatus);
    setText("connectionStartedAt", stamp(state.connectionStartedAt) || "waiting");
    setText("lastMessageTimestamp", stamp(state.lastMessageTimestamp) || "waiting");
    setText("reconnectCount", state.reconnectCount);
    setText("lastError", state.lastError || "-");
    setText("closeCode", state.closeCode == null ? "-" : state.closeCode);
    setText("closeReason", state.closeReason || "-");
    setText("lastSubscriptionSent", state.lastSubscriptionSent || "-");
    setText("userAgent", state.userAgent);

    var body = document.getElementById("debugRows");
    if (body) {
      body.innerHTML = Object.keys(rows).map(function (key) {
        var row = rows[key];
        return "<tr><td>" + row.channel + "</td><td>" + row.asset + "</td><td>" +
          (row.acknowledgedAt ? age(row.acknowledgedAt) : "waiting") + "</td><td>" +
          age(row.lastMessageAt) + "</td><td>" +
          (stamp(row.lastMessageAt) || "-") + "</td><td>" +
          (row.error || "-") + "</td></tr>";
      }).join("");
    }
    var logsNode = document.getElementById("browserLogs");
    if (logsNode) logsNode.textContent = logs.length ? logs.join("\n") : "waiting for browser script";
    var proofNode = document.getElementById("proof");
    if (proofNode) proofNode.textContent = JSON.stringify(proof(), null, 2);
  }

  function subscribeAll() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    SUBSCRIPTIONS.forEach(function (subscription) {
      state.lastSubscriptionSent = keyFor(subscription);
      socket.send(JSON.stringify({ method: "subscribe", subscription: subscription }));
      log("sent subscription " + state.lastSubscriptionSent);
    });
    render();
  }

  function scheduleReconnect() {
    if (stopped) return;
    state.websocketStatus = "reconnecting";
    state.reconnectCount += 1;
    if (!state.lastError) state.lastError = "WebSocket disconnected; reconnecting";
    var delay = Math.min(15000, 1000 * Math.max(1, Math.pow(2, Math.min(reconnectAttempt, 4))));
    reconnectAttempt += 1;
    log("reconnecting in " + delay + "ms");
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connect, delay);
  }

  function connect() {
    if (stopped) return;
    state.attemptedUrl = WS_URL;
    state.closeCode = null;
    state.closeReason = null;
    if (!state.browserCanUseWebSocket) {
      state.websocketStatus = "error";
      state.lastError = "Browser WebSocket API is unavailable";
      log(state.lastError);
      return;
    }

    state.websocketStatus = reconnectAttempt ? "reconnecting" : "connecting";
    state.lastError = null;
    render();
    log("opening " + WS_URL);
    socket = new WebSocket(WS_URL);
    var openTimeout = window.setTimeout(function () {
      if (!socket || socket.readyState !== WebSocket.CONNECTING) return;
      state.websocketStatus = "error";
      state.lastError = "WebSocket connection timed out while connecting to " + WS_URL;
      log(state.lastError);
      socket.close();
      render();
    }, 20000);

    socket.onopen = function () {
      window.clearTimeout(openTimeout);
      reconnectAttempt = 0;
      state.websocketStatus = "connected";
      state.connectionStartedAt = state.connectionStartedAt || Date.now();
      state.lastError = null;
      log("websocket connected");
      subscribeAll();
    };

    socket.onmessage = function (event) {
      var at = Date.now();
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        state.websocketStatus = "error";
        state.lastError = error instanceof Error ? error.message : String(error);
        log("websocket parse error: " + state.lastError);
        return;
      }

      var channel = String(message.channel || "");
      var data = message.data;
      state.lastMessageTimestamp = at;

      if (channel === "subscriptionResponse") {
        var subscription = subscriptionFromResponse(message);
        if (subscription) markAck(subscription, at);
        render();
        return;
      }

      if (channel === "error" || message.error) {
        state.websocketStatus = "error";
        state.lastError = String(message.error || (data && data.error) || "Hyperliquid WebSocket error");
        log("websocket error message: " + state.lastError);
        render();
        return;
      }

      if (channel === "allMids") markMessage({ type: "allMids" }, at);
      if (channel === "trades") {
        var rawRows = Array.isArray(data) ? data : Array.isArray(data && data.trades) ? data.trades : [data];
        var tradeCoin = assetFromPayload(rawRows) || (message.subscription && message.subscription.coin);
        if (ASSETS.indexOf(tradeCoin) >= 0) markMessage({ type: "trades", coin: tradeCoin }, at);
      }
      if (channel === "l2Book") {
        var bookCoin = assetFromPayload(data);
        if (bookCoin) markMessage({ type: "l2Book", coin: bookCoin }, at);
      }
      if (channel === "candle") {
        var candleCoin = assetFromPayload(data);
        if (candleCoin) markMessage({ type: "candle", coin: candleCoin, interval: "1m" }, at);
      }
      if (channel === "activeAssetCtx") {
        var ctxCoin = assetFromPayload(data);
        if (ctxCoin) markMessage({ type: "activeAssetCtx", coin: ctxCoin }, at);
      }
      render();
    };

    socket.onerror = function () {
      state.websocketStatus = "error";
      state.lastError = "Browser WebSocket error event while connecting to " + WS_URL;
      log(state.lastError);
      render();
    };

    socket.onclose = function (event) {
      window.clearTimeout(openTimeout);
      state.closeCode = event.code;
      state.closeReason = event.reason || "";
      log("websocket closed code=" + event.code + " reason=" + (event.reason || "-"));
      scheduleReconnect();
    };
  }

  staleTimer = window.setInterval(function () {
    if (!state.lastMessageTimestamp || state.websocketStatus === "error" || state.websocketStatus === "reconnecting") return;
    if (Date.now() - state.lastMessageTimestamp > 90000) {
      state.websocketStatus = "stale";
      state.lastError = "No WebSocket messages for 90s";
      log(state.lastError);
    } else {
      render();
    }
  }, 1000);

  window.addEventListener("beforeunload", function () {
    stopped = true;
    window.clearTimeout(reconnectTimer);
    window.clearInterval(staleTimer);
    if (socket) socket.close();
  });

  render();
  connect();
})();
`;

export default function DebugWsPage() {
  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope WebSocket debug</h1>
      <section style={{ border: "1px solid #244338", padding: 16, marginBottom: 18 }}>
        <p><strong>hydratedAt:</strong> <span id="hydratedAt">waiting</span></p>
        <p><strong>browserCanUseWebSocket:</strong> <span id="browserCanUseWebSocket">waiting</span></p>
        <p><strong>attemptedUrl:</strong> <span id="attemptedUrl">waiting</span></p>
        <p><strong>websocketStatus:</strong> <span id="websocketStatus">connecting</span></p>
        <p><strong>connectionStartedAt:</strong> <span id="connectionStartedAt">waiting</span></p>
        <p><strong>lastMessageTimestamp:</strong> <span id="lastMessageTimestamp">waiting</span></p>
        <p><strong>reconnectCount:</strong> <span id="reconnectCount">0</span></p>
        <p><strong>lastError:</strong> <span id="lastError">-</span></p>
        <p><strong>closeCode:</strong> <span id="closeCode">-</span></p>
        <p><strong>closeReason:</strong> <span id="closeReason">-</span></p>
        <p><strong>lastSubscriptionSent:</strong> <span id="lastSubscriptionSent">waiting</span></p>
        <p><strong>userAgent:</strong> <span id="userAgent">waiting</span></p>
      </section>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
        <thead>
          <tr><th>channel</th><th>asset</th><th>ack</th><th>last message</th><th>last message ISO</th><th>error</th></tr>
        </thead>
        <tbody id="debugRows" />
      </table>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Browser console logs</h2>
      <pre id="browserLogs" style={{ marginBottom: 18, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>waiting for browser script</pre>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Machine-readable proof</h2>
      <pre id="proof" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>waiting</pre>
      <script dangerouslySetInnerHTML={{ __html: DEBUG_SCRIPT }} />
    </main>
  );
}

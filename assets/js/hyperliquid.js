(function attachHyperliquid(window) {
  "use strict";

  const API_URL = "https://api.hyperliquid.xyz/info";
  const DEFAULT_TIMEOUT_MS = 12000;

  function timeoutSignal(ms) {
    const controller = new AbortController();
    const handle = window.setTimeout(() => controller.abort(), ms);
    return { controller, clear: () => window.clearTimeout(handle) };
  }

  async function postInfo(body, options) {
    const timer = timeoutSignal((options && options.timeoutMs) || DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: timer.controller.signal,
      });
      if (!response.ok) throw new Error(`Hyperliquid API ${response.status}`);
      return response.json();
    } finally {
      timer.clear();
    }
  }

  async function safeInfo(body, fallback) {
    try {
      return { ok: true, value: await postInfo(body), error: null };
    } catch (error) {
      return { ok: false, value: fallback, error: error.message || String(error) };
    }
  }

  async function getCoreSnapshot(coin) {
    const selectedCoin = coin || "HYPE";
    const now = Date.now();
    const startTime = now - 24 * 60 * 60 * 1000;

    const [market, candles, book] = await Promise.all([
      safeInfo({ type: "metaAndAssetCtxs" }, null),
      safeInfo({
        type: "candleSnapshot",
        req: { coin: selectedCoin, interval: "15m", startTime, endTime: now },
      }, []),
      safeInfo({ type: "l2Book", coin: selectedCoin, nSigFigs: 5 }, null),
    ]);

    const errors = [market, candles, book].filter((item) => !item.ok).map((item) => item.error);
    if (!market.ok || !market.value) {
      throw new Error(errors[0] || "Unable to load Hyperliquid markets");
    }

    return {
      coin: selectedCoin,
      rawMarket: market.value,
      rawCandles: candles.value || [],
      rawBook: book.value,
      errors,
      fetchedAt: new Date().toISOString(),
      source: API_URL,
    };
  }

  async function getWallet(address) {
    const trimmed = String(address || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      throw new Error("Invalid EVM address");
    }

    const [state, fills, openOrders, funding] = await Promise.all([
      safeInfo({ type: "clearinghouseState", user: trimmed }, null),
      safeInfo({ type: "userFills", user: trimmed }, []),
      safeInfo({ type: "frontendOpenOrders", user: trimmed }, []),
      safeInfo({ type: "userFunding", user: trimmed, startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 }, []),
    ]);

    if (!state.ok || !state.value) {
      throw new Error(state.error || "Unable to load account state");
    }

    return {
      address: trimmed,
      state: state.value,
      fills: fills.value || [],
      openOrders: openOrders.value || [],
      funding: funding.value || [],
      errors: [fills, openOrders, funding].filter((item) => !item.ok).map((item) => item.error),
      fetchedAt: new Date().toISOString(),
    };
  }

  window.HyperliquidAPI = {
    postInfo,
    getCoreSnapshot,
    getWallet,
  };
})(window);

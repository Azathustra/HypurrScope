import { expect, test } from "@playwright/test";

const ASSETS = ["BTC", "ETH", "HYPE"] as const;
const PRESETS = ["Fresh Long", "Fresh Short", "Crowded Long", "Crowded Short"] as const;

async function apiOk(page: import("@playwright/test").Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), `${path} HTTP status`).toBeTruthy();
  const payload = await response.json();
  expect(payload.ok, `${path} ok`).toBe(true);
  return payload;
}

async function overview(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "HypurrScope Risk Radar" })).toBeVisible();
}

function assetCard(page: import("@playwright/test").Page, asset: string) {
  return page.locator(".asset-card").filter({ hasText: asset }).first();
}

async function waitForLiveFlowMetrics(page: import("@playwright/test").Page) {
  await page.goto("/recent-flow");
  await expect(page.getByRole("heading", { name: "Recent Flow" })).toBeVisible();
  await expect(page.getByText(/Streaming|Collecting live flow/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Opening Hyperliquid WebSocket")).not.toBeVisible({ timeout: 30_000 });

  for (const asset of ASSETS) {
    const row = page.getByTestId(`flow-metrics-${asset}`);
    await expect(row, `${asset} flow metrics row`).toBeVisible();
    await expect(row.locator('[data-col="taker-buy-ratio-5m"]'), `${asset} takerBuyRatio5m`).toContainText(/%/, { timeout: 30_000 });
    await expect(row.locator('[data-col="taker-sell-ratio-5m"]'), `${asset} takerSellRatio5m`).toContainText(/%/, { timeout: 30_000 });
    await expect(row.locator('[data-col="buy-notional-5m"]'), `${asset} buyNotional5m`).toContainText(/\$/, { timeout: 30_000 });
    await expect(row.locator('[data-col="sell-notional-5m"]'), `${asset} sellNotional5m`).toContainText(/\$/, { timeout: 30_000 });
    await expect(row.locator('[data-col="net-buy-flow-5m"]'), `${asset} netBuyFlow5m`).toContainText(/\$/, { timeout: 30_000 });
    await expect(row.locator('[data-col="net-sell-flow-5m"]'), `${asset} netSellFlow5m`).toContainText(/\$/, { timeout: 30_000 });
    await expect(row.locator('[data-col="cvd-5m"]'), `${asset} CVD 5m`).toContainText(/\$/, { timeout: 30_000 });
    await expect(row.locator('[data-col="cvd-15m"]'), `${asset} CVD 15m`).toContainText(/\$/, { timeout: 30_000 });
  }

  await expect(page.getByTestId("trade-side-row").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("trade-side-row").first().locator('[data-col="interpreted-side"]')).toContainText(/Buy|Sell/);
}

test("production REST data endpoints return usable BTC ETH HYPE data", async ({ page }) => {
  const markets = await apiOk(page, "/api/hl/markets");
  for (const asset of ASSETS) {
    const row = markets.assets.find((item: any) => item.apiCoin === asset);
    expect(row, `${asset} market row`).toBeTruthy();
    for (const field of ["markPx", "fundingRaw", "fundingPctHourly", "openInterestRaw", "openInterestUsdComputed", "dayNtlVlm", "updatedAt"]) {
      expect(row[field], `${asset} ${field}`).not.toBeNull();
      expect(row[field], `${asset} ${field}`).not.toBeUndefined();
    }

    const candles = await apiOk(page, `/api/hl/candles?coin=${asset}&interval=1m&hours=24`);
    expect(candles.candlesCount, `${asset} candlesCount`).toBeGreaterThan(100);

    const book = await apiOk(page, `/api/hl/book?coin=${asset}`);
    for (const field of ["bestBid", "bestAsk", "spreadBps", "depth10bpsUsd", "depth25bpsUsd"]) {
      expect(book[field], `${asset} book ${field}`).not.toBeNull();
      expect(book[field], `${asset} book ${field}`).not.toBeUndefined();
    }

    const oi = await apiOk(page, `/api/hl/oi-history?asset=${asset}`);
    expect(oi.availableHistoryMinutes, `${asset} availableHistoryMinutes`).not.toBeUndefined();
    for (const field of [
      "cadenceStatus",
      "lastSnapshotAgeSeconds",
      "averageSnapshotIntervalSecondsLast60m",
      "averageSnapshotIntervalSecondsLast4h",
      "expectedSnapshotCountLast60m",
      "actualSnapshotCountLast60m",
      "missingSnapshotIntervalsLast60m",
      "missingSnapshotIntervalsLast4h",
    ]) {
      expect(oi[field], `${asset} OI ${field}`).not.toBeUndefined();
    }
    expect(["healthy", "healthy_recent_with_historical_gap", "degraded"]).toContain(oi.cadenceStatus);
  }
});

test("overview loads cards without market loading placeholders when APIs are ok", async ({ page }) => {
  const markets = await apiOk(page, "/api/hl/markets");
  await overview(page);
  await page.waitForTimeout(5_000);

  for (const asset of ASSETS) {
    expect(markets.assets.some((item: any) => item.apiCoin === asset)).toBe(true);
    const card = assetCard(page, asset);
    await expect(card, `${asset} card`).toBeVisible();
    await expect(card, `${asset} price loading`).not.toContainText(/Price\s+Loading/i);
    await expect(card, `${asset} 15m loading`).not.toContainText(/15m\s+Loading/i);
    await expect(card, `${asset} 1h loading`).not.toContainText(/1h\s+Loading/i);
    await expect(card, `${asset} funding loading`).not.toContainText(/Hourly funding\s+Loading/i);
    await expect(card, `${asset} open interest loading`).not.toContainText(/Open interest\s+Loading/i);
    await expect(card, `${asset} depth loading`).not.toContainText(/Depth \+\/-10 bps\s+Loading/i);
    await expect(card, `${asset} source timestamp`).not.toContainText(/updatedAt missing/i);
  }
});

test("public homepage HTML does not expose card loading placeholders", async ({ page }) => {
  const response = await page.request.get("/");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  for (const placeholder of [
    "Price Loading",
    "Funding Loading",
    "Open interest Loading",
    "24h volume Loading",
    "Spread Loading",
    "Depth Loading",
    "updatedAt missing",
  ]) {
    expect(html, placeholder).not.toContain(placeholder);
  }
});

test("snapshot endpoint inserts rows and OI history exposes snapshot counts", async ({ page }) => {
  const before = await apiOk(page, "/api/hl/oi-history?asset=BTC");
  const snapshot = await page.request.post("/api/cron/snapshot");
  expect(snapshot.ok(), "snapshot HTTP status").toBeTruthy();
  const snapshotPayload = await snapshot.json();
  expect(snapshotPayload.ok, "snapshot ok").toBe(true);
  expect(snapshotPayload.insertedAssets, "snapshot assets").toBeDefined();

  const after = await apiOk(page, "/api/hl/oi-history?asset=BTC");
  expect(after.snapshotCount, "BTC snapshotCount").toBeGreaterThanOrEqual(before.snapshotCount || 0);
  expect(after.currentOiUsd, "BTC current OI").not.toBeNull();
  expect(after.availableHistoryMinutes, "BTC available history").not.toBeUndefined();
});

test("closest setups include all four presets for BTC ETH HYPE", async ({ page }) => {
  await overview(page);
  const panel = page.locator(".radar-panel").filter({ hasText: "Closest setups" });
  await expect(panel).toBeVisible();
  const rows = panel.locator("tbody tr");
  await expect(rows).toHaveCount(12);
  await expect(panel.getByText("Structure score")).toBeVisible();
  await expect(panel.getByText("Flow score")).toBeVisible();
  await expect(panel.getByText("Final score")).toBeVisible();
  await expect(panel.getByText("Current value / target value")).toBeVisible();
  await expect(panel.getByText("Needs data")).toHaveCount(0);
  await expect(panel.getByText("No score")).toHaveCount(0);

  for (const asset of ASSETS) {
    for (const preset of PRESETS) {
      await expect(panel.locator("tbody tr").filter({ hasText: asset }).filter({ hasText: preset })).toHaveCount(1);
    }
  }
  await expect(panel.getByText(/Price 15m:|Hourly funding:|Taker buy ratio:/)).toBeVisible();
});

test("live flow metrics produce numeric flowScore and finalScore for closest setups", async ({ page }) => {
  await waitForLiveFlowMetrics(page);
  await page.getByRole("button", { name: "Overview" }).click();

  const panel = page.locator(".radar-panel").filter({ hasText: "Closest setups" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("tbody tr")).toHaveCount(12);
  await expect(panel).not.toContainText(/flow unavailable/i);
  await expect(panel).not.toContainText(/not_evaluable_flow_missing/i);

  for (const asset of ASSETS) {
    for (const preset of PRESETS) {
      const row = page.getByTestId(`closest-setup-${asset}-${preset.replace(/\s+/g, "-").toLowerCase()}`);
      await expect(row, `${asset} ${preset} row`).toBeVisible();
      await expect(row.locator('[data-col="structure-score"]'), `${asset} ${preset} structureScore`).toContainText(/^\d+%$/);
      await expect(row.locator('[data-col="flow-score"]'), `${asset} ${preset} flowScore`).toContainText(/^\d+%$/);
      await expect(row.locator('[data-col="final-score"]'), `${asset} ${preset} finalScore`).toContainText(/^\d+%$/);
      await expect(row.locator('[data-col="status"]'), `${asset} ${preset} status`).toContainText(/active|near|inactive/);
      await expect(row.locator('[data-col="current-target"]'), `${asset} ${preset} current target`).toContainText(/target|PASS|waiting|flow/i);
    }
  }
});

test("debug data exposes freshness fields", async ({ page }) => {
  await page.goto("/debug/data");
  await expect(page.getByText("serverNow:")).toBeVisible();
  await expect(page.getByText("dataUpdatedAt:")).toBeVisible();
  await expect(page.getByText("dataAgeSeconds:")).toBeVisible();
  await expect(page.getByText("freshness:")).toBeVisible();
  await expect(page.getByText(/freshness:\s*ready/i)).toBeVisible({ timeout: 15_000 });
});

test("watchlist direct route shows exactly BTC ETH HYPE", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
  const table = page.locator(".radar-panel").filter({ hasText: "BTC / ETH / HYPE market board" });
  await expect(table.locator("tbody tr")).toHaveCount(3);
  for (const asset of ASSETS) await expect(table.locator("tbody tr").filter({ hasText: asset })).toHaveCount(1);
  for (const header of ["Price", "15m", "1h", "OI 15m", "OI 1h", "OI 4h", "Hourly funding", "Spread", "Depth +/-10bps"]) {
    await expect(table.locator("thead")).toContainText(header);
  }
});

test("alerts direct route has tabs, asset presets and duplicate blocking", async ({ page }) => {
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Presets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your own" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My alerts" })).toBeVisible();

  for (const asset of ASSETS) {
    await page.getByRole("button", { name: asset }).click();
    for (const preset of PRESETS) {
      await expect(page.getByText(`${asset} ${preset}`)).toBeVisible();
    }
  }

  const createButtons = page.getByRole("button", { name: "Create preset alert" });
  await createButtons.first().click();
  await expect(page.getByRole("button", { name: "Already created" }).first()).toBeDisabled();
});

test("custom alert builder includes all required controls", async ({ page }) => {
  await page.goto("/alerts");
  await page.getByRole("button", { name: "Create your own" }).click();
  for (const label of [
    "Price 15m",
    "OI 15m",
    "OI 4h",
    "Funding above",
    "Funding below",
    "Taker buy ratio",
    "Taker sell ratio",
    "Net buy flow 5m",
    "Net sell flow 5m",
    "Large trade threshold",
    "Spread threshold",
    "Depth threshold",
    "Cooldown",
  ]) {
    await expect(page.getByText(label, { exact: false })).toBeVisible();
  }
  await expect(page.getByText(/All conditions|Any/i)).toBeVisible();
  await expect(page.getByText(/Browser/i)).toBeVisible();
});

test("wallet scanner rejects invalid addresses and never asks for private credentials", async ({ page }) => {
  await page.goto("/wallet-scanner");
  await expect(page.getByRole("heading", { name: "Wallet Scanner" })).toBeVisible();
  await expect(page.getByText(/private key|seed phrase|signature|wallet connect/i)).toHaveCount(0);
  await expect(page.getByPlaceholder(/private key/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /connect wallet|sign|signature/i })).toHaveCount(0);
  await page.getByPlaceholder("0x...").fill("not-a-wallet");
  await page.getByRole("button", { name: "Scan" }).click();
  await expect(page.getByText(/Invalid address/i)).toBeVisible();
});

test("recent flow does not remain connecting forever when websocket streams", async ({ page }) => {
  await waitForLiveFlowMetrics(page);
  await expect(page.getByText("Flow metrics debug")).toBeVisible();
  await expect(page.getByText("Trade side mapping debug")).toBeVisible();
  await expect(page.getByText("takerBuyRatio5m")).toBeVisible();
  await expect(page.getByText("Raw trade side")).toBeVisible();
});

test("debug websocket page exposes subscriptions and timestamps", async ({ page }) => {
  await page.goto("/debug/ws");
  await expect(page.getByRole("heading", { name: "HypurrScope WebSocket debug" })).toBeVisible();
  await expect(page.getByText(/hydratedAt:/i)).toBeVisible();
  await expect(page.getByText(/browserCanUseWebSocket:\s*true/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/userAgent:/i)).toBeVisible();
  await expect(page.getByText(/attemptedUrl:/i)).toBeVisible();
  await expect(page.getByText(/lastSubscriptionSent:/i)).toBeVisible();
  await expect(page.getByText(/rawMessagesCount:/i)).toBeVisible();
  await expect(page.getByText(/subscriptionAcksCount:/i)).toBeVisible();
  await expect(page.getByText(/lastRawMessagePreview:/i)).toBeVisible();
  await expect(page.getByText(/websocketStatus:\s*streaming/i)).toBeVisible({ timeout: 30_000 });
  const proof = await page.locator("pre").last().textContent();
  const parsed = JSON.parse(proof || "{}");
  expect(parsed.hydratedAt).toBeTruthy();
  expect(parsed.websocketStatus).toBe("streaming");
  expect(parsed.browserCanUseWebSocket).toBe(true);
  expect(parsed.userAgent).toBeTruthy();
  expect(parsed.attemptedUrl).toBe("wss://api.hyperliquid.xyz/ws");
  expect(parsed.lastSubscriptionSent).toBeTruthy();
  expect(parsed.rawMessagesCount).toBeGreaterThan(0);
  expect(parsed.subscriptionAcksCount).toBeGreaterThan(0);
  expect(parsed.lastRawMessagePreview).toBeTruthy();
  for (const channel of ["candle:BTC:1m", "candle:ETH:1m", "candle:HYPE:1m"]) {
    expect(parsed.subscribedChannels, channel).toContain(channel);
  }
  for (const field of [
    "btcTradesLastTimestamp",
    "ethTradesLastTimestamp",
    "hypeTradesLastTimestamp",
    "btcL2BookLastTimestamp",
    "ethL2BookLastTimestamp",
    "hypeL2BookLastTimestamp",
    "btcActiveAssetCtxLastTimestamp",
    "ethActiveAssetCtxLastTimestamp",
    "hypeActiveAssetCtxLastTimestamp",
  ]) {
    expect(parsed[field], field).toBeTruthy();
  }
});

test("server websocket smoke endpoint proves Hyperliquid streaming", async ({ page }) => {
  const response = await page.request.get("/api/hl/ws-smoke?seconds=10", { timeout: 15_000 });
  expect(response.ok(), "ws-smoke HTTP status").toBeTruthy();
  const payload = await response.json();
  expect(payload.ok, "ws-smoke ok").toBe(true);
  expect(payload.attemptedUrl).toBe("wss://api.hyperliquid.xyz/ws");
  expect(payload.connected).toBe(true);
  expect(payload.rawMessagesCount).toBeGreaterThan(0);
  expect(payload.subscriptionAcksCount).toBeGreaterThan(0);
  for (const asset of ASSETS) {
    expect(
      payload.perAssetLastTimestamps[asset].trades || payload.perAssetLastTimestamps[asset].l2Book,
      `${asset} trades or l2Book timestamp`,
    ).toBeTruthy();
  }
});

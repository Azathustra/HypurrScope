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

  for (const asset of ASSETS) {
    for (const preset of PRESETS) {
      await expect(panel.locator("tbody tr").filter({ hasText: asset }).filter({ hasText: preset })).toHaveCount(1);
    }
  }
});

test("watchlist direct route shows exactly BTC ETH HYPE", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
  const table = page.locator(".radar-panel").filter({ hasText: "BTC / ETH / HYPE market board" });
  await expect(table.locator("tbody tr")).toHaveCount(3);
  for (const asset of ASSETS) await expect(table.locator("tbody tr").filter({ hasText: asset })).toHaveCount(1);
});

test("alerts direct route has tabs, asset selector, HYPE presets and duplicate blocking", async ({ page }) => {
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Presets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your own" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My alerts" })).toBeVisible();

  await page.getByRole("button", { name: "HYPE" }).click();
  for (const preset of PRESETS) await expect(page.locator(".radar-panel").filter({ hasText: preset })).toBeVisible();

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
  await expect(page.getByPlaceholder(/private key/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /connect wallet|sign|signature/i })).toHaveCount(0);
  await page.getByPlaceholder("0x...").fill("not-a-wallet");
  await page.getByRole("button", { name: "Scan" }).click();
  await expect(page.getByText(/Invalid address/i)).toBeVisible();
});

test("recent flow does not remain connecting forever when websocket streams", async ({ page }) => {
  await page.goto("/recent-flow");
  await expect(page.getByRole("heading", { name: "Recent Flow" })).toBeVisible();
  await expect(page.getByText(/Streaming|Collecting live flow|Reconnecting|Trade stream error|Trade stream stale/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Connecting to trade stream")).not.toBeVisible({ timeout: 30_000 });
});

test("debug websocket page exposes subscriptions and timestamps", async ({ page }) => {
  await page.goto("/debug/ws");
  await expect(page.getByRole("heading", { name: "HypurrScope WebSocket debug" })).toBeVisible();
  await expect(page.getByText(/websocket status:\s*streaming/i)).toBeVisible({ timeout: 30_000 });
  const proof = await page.locator("pre").last().textContent();
  const parsed = JSON.parse(proof || "{}");
  expect(parsed.websocketStatus).toBe("streaming");
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

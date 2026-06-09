import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;
const oiHistoryRoute = fs.readFileSync("app/api/hl/oi-history/route.ts", "utf8");
const debugWs = fs.readFileSync("app/debug/ws/page.tsx", "utf8");
const wsSmokeRoute = fs.readFileSync("app/api/hl/ws-smoke/route.ts", "utf8");

const required = [
  ["BTC flow", page.includes("flow5mUsd: 10_000_000")],
  ["ETH flow", page.includes("flow5mUsd: 6_000_000")],
  ["HYPE flow", page.includes("flow5mUsd: 1_500_000")],
  ["Depth plus/minus 10 bps", page.includes("Depth +/-10 bps")],
  ["Depth plus/minus 25 bps", page.includes("depth25Bps")],
  ["Funding displayed as percent", page.includes("fundingRaw * 100")],
  ["Context history route", page.includes("/api/hyperliquid/context-history")],
  ["Alerts backend route exists", fs.existsSync("app/api/alerts/route.ts")],
  ["Flow events backend route exists", fs.existsSync("app/api/flow-events/route.ts")],
  ["OI cadence top-level fields", ["cadenceStatus", "lastSnapshotAgeSeconds", "averageSnapshotIntervalSecondsLast60m", "averageSnapshotIntervalSecondsLast4h", "expectedSnapshotCountLast60m", "actualSnapshotCountLast60m", "missingSnapshotIntervalsLast60m", "missingSnapshotIntervalsLast4h"].every((field) => oiHistoryRoute.includes(field))],
  ["OI recent historical gap status", oiHistoryRoute.includes("healthy_recent_with_historical_gap")],
  ["Debug WS browser fields", ["hydratedAt", "browserCanUseWebSocket", "attemptedUrl", "rawMessagesCount", "subscriptionAcksCount", "lastRawMessagePreview"].every((field) => debugWs.includes(field))],
  ["Debug WS correct subscriptions", debugWs.includes('type: "allMids"') && debugWs.includes('type: "trades"') && debugWs.includes('type: "l2Book"') && debugWs.includes('type: "candle"') && debugWs.includes('type: "activeAssetCtx"')],
  ["WS smoke route exists", fs.existsSync("app/api/hl/ws-smoke/route.ts")],
  ["WS smoke uses server WebSocket", wsSmokeRoute.includes('import WebSocket from "ws"') && wsSmokeRoute.includes("wss://api.hyperliquid.xyz/ws")],
  ["WS smoke correct subscriptions", wsSmokeRoute.includes('type: "allMids"') && wsSmokeRoute.includes('type: "trades"') && wsSmokeRoute.includes('type: "l2Book"') && wsSmokeRoute.includes('type: "activeAssetCtx"')],
  ["WS smoke proof fields", ["subscriptionsSent", "subscriptionAcksCount", "rawMessagesCount", "perChannelCounts", "perAssetLastTimestamps", "lastRawMessagePreview"].every((field) => wsSmokeRoute.includes(field))],
];

const failed = required.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Data test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Data test passed.");

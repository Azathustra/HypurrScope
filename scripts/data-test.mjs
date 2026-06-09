import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");

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
];

const failed = required.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Data test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Data test passed.");

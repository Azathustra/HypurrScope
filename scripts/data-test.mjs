import fs from "node:fs";

const config = fs.readFileSync("app/lib/market-config.ts", "utf8");
const page = fs.readFileSync("app/page.tsx", "utf8");

const required = [
  ["BTC flow", config.includes("flow5mUsd: 10_000_000")],
  ["ETH flow", config.includes("flow5mUsd: 6_000_000")],
  ["HYPE flow", config.includes("flow5mUsd: 1_500_000")],
  ["Depth plus/minus 10 bps", page.includes("Depth +/-10 bps")],
  ["Funding displayed as percent", page.includes("fundingRaw * 100")],
  ["Context history route", page.includes("/api/hyperliquid/context-history")],
];

const failed = required.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Data test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Data test passed.");

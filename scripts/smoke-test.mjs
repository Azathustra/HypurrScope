import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const layout = fs.readFileSync("app/layout.tsx", "utf8");

const checks = [
  ["Overview title", page.includes("HypurrScope Risk Radar")],
  ["BTC support", page.includes('"BTC"')],
  ["ETH support", page.includes('"ETH"')],
  ["HYPE support", page.includes('"HYPE"')],
  ["Watchlist page", page.includes("Watchlist")],
  ["Alerts tabs", page.includes("Presets") && page.includes("Create your own") && page.includes("My alerts")],
  ["Wallet scanner read-only", page.includes("Read-only") && page.includes("no wallet connect")],
  ["SEO title", layout.includes("BTC ETH HYPE Hyperliquid Risk Radar")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Smoke test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Smoke test passed.");

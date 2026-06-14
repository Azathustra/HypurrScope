import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;
const layout = fs.readFileSync("app/layout.tsx", "utf8");

const checks = [
  ["Risk ticket scanner hero", page.includes("Scanner un setup propre.")],
  ["Trade Builder nav", page.includes("Trade Builder")],
  ["Trade Summary card", page.includes("Trade Summary")],
  ["BTC support", page.includes('"BTC"')],
  ["ETH support", page.includes('"ETH"')],
  ["HYPE support", page.includes('"HYPE"')],
  ["Advanced data page", page.includes("Advanced Data")],
  ["Alerts tabs", page.includes("Presets") && page.includes("Create your own") && page.includes("My alerts")],
  ["Wallet scanner read-only", page.includes("Read-only") && page.includes("public address only")],
  ["SEO title", layout.includes("HypurrScope | Hyperliquid Trade Planner")],
  ["SEO description", layout.includes("Plan BTC, ETH and HYPE Hyperliquid trades from target profit and max total risk")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Smoke test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Smoke test passed.");

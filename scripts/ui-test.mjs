import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;
const css = fs.readFileSync("app/globals.css", "utf8");

const checks = [
  ["Side rail exists", css.includes(".risk-rail")],
  ["Dense watchlist table", css.includes(".watchlist-table")],
  ["Alert tabs styled", css.includes(".alert-tabs")],
  ["Panel note style", css.includes(".panel-note")],
  ["Wallet error state", css.includes(".form-error")],
  ["No Recommended now on alerts", !page.includes("Recommended now")],
  ["Preset alert copy", page.includes("Create preset alert")],
  ["Neutral pre-hydration flow copy", page.includes("Initializing live flow") && page.includes("Preparing WebSocket stream") && !page.includes("Opening Hyperliquid WebSocket") && !page.includes("Connecting to trade stream") && !page.includes("WebSocket trades not streaming")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("UI test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("UI test passed.");

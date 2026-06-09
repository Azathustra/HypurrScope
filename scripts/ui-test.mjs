import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

const checks = [
  ["Side rail exists", css.includes(".risk-rail")],
  ["Dense watchlist table", css.includes(".watchlist-table")],
  ["Alert tabs styled", css.includes(".alert-tabs")],
  ["Wallet error state", css.includes(".form-error")],
  ["No Recommended now on alerts", !page.includes("Recommended now")],
  ["Preset alert copy", page.includes("Create preset alert")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("UI test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("UI test passed.");

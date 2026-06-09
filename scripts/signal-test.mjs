import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;

const checks = [
  ["Signal status type", page.includes('"active" | "near" | "inactive" | "warming_up" | "not_evaluable"')],
  ["No score without data", page.includes("score === null") && page.includes("No score")],
  ["Fresh Long conditions", page.includes("Taker buy ratio") && page.includes("Net buy flow 5m")],
  ["Fresh Short conditions", page.includes("Taker sell ratio") && page.includes("Net sell flow 5m")],
  ["Crowded Long conditions", page.includes("Hourly funding") && page.includes("Long-side taker pressure")],
  ["Crowded Short conditions", page.includes("Hourly funding") && page.includes("Short-side taker pressure")],
  ["HYPE setup coverage", page.includes('apiCoin: "HYPE"') && page.includes("PRESET_KINDS.map")],
  ["Live alert blocked without score", page.includes("if (signal.score === null) return")],
  ["Closest setups does not slice away HYPE", !page.includes(".slice(0, 8)")],
  ["Missing data copy is explicit", !page.includes("No active signal") && page.includes("Not evaluated: waiting")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Signal test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Signal test passed.");

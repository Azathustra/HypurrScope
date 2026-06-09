import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;

const checks = [
  ["Signal status type", page.includes('"active" | "near" | "inactive" | "not_evaluable_data_missing" | "not_evaluable_flow_missing"')],
  ["Split setup scores", page.includes("structureScore") && page.includes("flowScore") && page.includes("finalScore")],
  ["Flow missing status", page.includes("not_evaluable_flow_missing") && page.includes("flowMissing")],
  ["Data missing status", page.includes("not_evaluable_data_missing")],
  ["Real flow aliases", page.includes("takerBuyRatio5m") && page.includes("takerSellRatio5m") && page.includes("netBuyFlow5m") && page.includes("netSellFlow5m")],
  ["Trade side mapping debug", page.includes("Trade side mapping debug") && page.includes("raw B = Bid/buy taker")],
  ["Flow metrics debug", page.includes("Flow metrics debug") && page.includes("buyNotional5m") && page.includes("sellNotional5m")],
  ["Fresh Long conditions", page.includes("Taker buy ratio") && page.includes("Net buy flow 5m")],
  ["Fresh Short conditions", page.includes("Taker sell ratio") && page.includes("Net sell flow 5m")],
  ["Crowded Long conditions", page.includes("Hourly funding") && page.includes("Long-side taker pressure")],
  ["Crowded Short conditions", page.includes("Hourly funding") && page.includes("Short-side taker pressure")],
  ["HYPE setup coverage", page.includes('apiCoin: "HYPE"') && page.includes("PRESET_KINDS.map")],
  ["Live alert blocked without final score", page.includes("if (signal.finalScore === null) return")],
  ["Closest setups does not slice away HYPE", !page.includes(".slice(0, 8)")],
  ["Missing data copy is explicit", !page.includes("No active signal") && page.includes("Not evaluated: waiting")],
  ["Generic No score removed", !page.includes("No score")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Signal test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Signal test passed.");

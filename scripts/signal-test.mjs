import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;

const checks = [
  ["Signal status type", page.includes('"active" | "near" | "inactive" | "not_evaluable_data_missing" | "not_evaluable_flow_missing"')],
  ["Split setup scores", page.includes("structureScore") && page.includes("flowScore") && page.includes("finalScore")],
  ["Final score weighted 60/40", page.includes("Math.round(structureScore * 0.6 + flowScore * 0.4)")],
  ["Flow missing status", page.includes("not_evaluable_flow_missing") && page.includes("flowMissing")],
  ["Data missing status", page.includes("not_evaluable_data_missing")],
  ["Real flow aliases", page.includes("takerBuyRatio5m") && page.includes("takerSellRatio5m") && page.includes("netBuyFlow5m") && page.includes("netSellFlow5m") && page.includes("cvd5m") && page.includes("cvd15m") && page.includes("cvd1h")],
  ["Signal proof selectors", page.includes('data-col="flow-score"') && page.includes('data-col="final-score"') && page.includes('data-testid={`closest-setup-')],
  ["Best active and closest setup summary", page.includes("Best active setup") && page.includes("Closest setup:") && page.includes("summarySignalText")],
  ["Flow inputs visible in setup rows", page.includes("flowInputs") && page.includes('data-col="flow-inputs"') && page.includes("takerBuyRatio5m") && page.includes("netBuyFlow5m") && page.includes("CVD 5m")],
  ["Human-readable setup explanations", page.includes("setupWhy") && page.includes("setupBlocker") && page.includes("Why this ranks here") && page.includes("Main blocker") && page.includes('data-col="why"') && page.includes('data-col="main-blocker"')],
  ["Simple signal layer", page.includes("SimpleWatchCards") && page.includes("simpleReason") && page.includes("simpleRisk") && page.includes("Alert when setup score > 80")],
  ["Signal history recording", page.includes("signalHistoryPayload") && page.includes("setSignalHistory") && page.includes("status === \"active\" || signal.status === \"near\"")],
  ["Flow proof selectors", page.includes('data-testid={`flow-metrics-') && page.includes('data-col="taker-buy-ratio-5m"') && page.includes('data-col="net-flow-5m"') && page.includes('data-col="cvd-5m"')],
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

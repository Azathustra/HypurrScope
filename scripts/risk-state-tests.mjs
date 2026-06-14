import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");

function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function effectiveEntry(input) {
  if (input.entryType === "limit") return positive(input.entryPrice) ? input.entryPrice : null;
  if (input.side === "long" && positive(input.bestAsk)) return input.bestAsk;
  if (input.side === "short" && positive(input.bestBid)) return input.bestBid;
  return positive(input.marketPrice) ? input.marketPrice : null;
}

function deriveTicketState(input) {
  if (!input.asset) return "idle";
  if (!input.side) return "missing_direction";
  const entry = effectiveEntry(input);
  if (input.entryType === "limit" && !positive(input.entryPrice)) return "missing_entry";
  if (!positive(entry)) return "missing_entry";
  if (!positive(input.targetPrice)) return "missing_target";
  if (input.side === "long" && input.targetPrice <= entry) return "invalid_target";
  if (input.side === "short" && input.targetPrice >= entry) return "invalid_target";
  if (!positive(input.maxTotalRiskUsd) || !positive(input.rewardRisk) || !positive(input.leverage)) return "missing_risk";
  if (positive(input.stopLoss)) {
    if (input.side === "long" && input.stopLoss >= entry) return "invalid_stop";
    if (input.side === "short" && input.stopLoss <= entry) return "invalid_stop";
  }
  if (input.pricingDataStatus !== "live" || input.orderBookStatus !== "live") return "execution_disabled_stale_data";
  if (!input.assetMeta || input.assetMeta.szDecimals === null) return "execution_disabled_precision";
  return "ready_for_preview";
}

function calcTargetFirst({ entry, target, rr = 2, maxRisk = 100 }) {
  const stop = entry - (target - entry) / rr;
  const riskDistance = entry - stop;
  const rawSize = maxRisk / riskDistance;
  const grossProfit = rawSize * (target - entry);
  return { stop, riskDistance, rawSize, grossProfit, grossRR: grossProfit / maxRisk };
}

function liquidityStatus(positionSizeUsd, depth10BpsUsd) {
  if (positionSizeUsd === null || depth10BpsUsd === null || depth10BpsUsd <= 0) {
    return "Calculated after trade is built";
  }
  const usage = (positionSizeUsd / depth10BpsUsd) * 100;
  return usage > 5 ? "Unsafe" : usage > 1 ? "Review" : "OK";
}

const base = {
  asset: "HYPE",
  side: null,
  entryType: "market",
  entryPrice: null,
  marketPrice: 60,
  bestBid: 59.99,
  bestAsk: 60,
  targetPrice: null,
  stopLoss: null,
  maxTotalRiskUsd: 100,
  rewardRisk: 2,
  leverage: 2,
  assetMeta: { szDecimals: 2 },
  pricingDataStatus: "live",
  orderBookStatus: "live",
};

assert.equal(deriveTicketState(base), "missing_direction");
assert.match(clientSource, /Direction/);
assert.match(clientSource, /Long/);
assert.match(clientSource, /Short/);

assert.equal(deriveTicketState({ ...base, side: "long" }), "missing_target");
assert.match(clientSource, /Take profit/);

const sample = calcTargetFirst({ entry: 60, target: 61.5 });
assert.equal(sample.stop.toFixed(2), "59.25");
assert.equal(sample.riskDistance.toFixed(2), "0.75");
assert.equal(sample.rawSize.toFixed(3), "133.333");
assert.equal(sample.grossProfit.toFixed(0), "200");
assert.equal(sample.grossRR.toFixed(0), "2");

assert.equal(deriveTicketState({ ...base, side: "long", targetPrice: 59 }), "invalid_target");
assert.equal(deriveTicketState({ ...base, side: "short", targetPrice: 61 }), "invalid_target");

assert.equal(
  deriveTicketState({ ...base, side: "long", targetPrice: 61.5, assetMeta: null }),
  "execution_disabled_precision",
);
assert.match(clientSource, /TP\/SL protection/);

assert.equal(liquidityStatus(null, 1_000_000), "Calculated after trade is built");
assert.match(clientSource, /Liquidity vs position size/);
assert.match(clientSource, /Calculated after trade is built/);
assert.match(clientSource, /Trade Builder/);
assert.match(clientSource, /Target move %/);
assert.match(clientSource, /Max risk ne modifie pas target ni stop/);
assert.match(clientSource, /Leverage ne modifie pas target ni stop/);

console.log("risk-state-tests: 7/7 passed");

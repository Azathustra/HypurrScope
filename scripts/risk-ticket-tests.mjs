import assert from "node:assert/strict";

function roundDown(value, decimals) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}

function calc({ side, mode = "manual", entry, stop, target, maxRisk = 100, rr = 2, szDecimals = 4, feeBps = 0, slipBps = 0 }) {
  if (mode === "target-first") {
    if (side === "long") stop = entry - (target - entry) / rr;
    if (side === "short") stop = entry + (entry - target) / rr;
  }
  const errors = [];
  if (side === "long" && stop >= entry) errors.push("invalid stop");
  if (side === "short" && stop <= entry) errors.push("invalid stop");
  const riskDistance = Math.abs(entry - stop);
  const costPerAsset =
    riskDistance
    + entry * feeBps / 10_000
    + stop * feeBps / 10_000
    + entry * slipBps / 10_000
    + stop * slipBps / 10_000;
  const rawSize = errors.length ? null : maxRisk / costPerAsset;
  const size = rawSize === null ? null : roundDown(rawSize, szDecimals);
  const lossBeforeCosts = size === null ? null : size * riskDistance;
  const totalLoss = size === null ? null : lossBeforeCosts + size * entry * feeBps / 10_000 + size * stop * feeBps / 10_000 + size * entry * slipBps / 10_000 + size * stop * slipBps / 10_000;
  const grossProfit = size === null ? null : size * Math.abs(target - entry);
  return { stop, riskDistance, rawSize, size, positionUsd: size === null ? null : size * entry, grossProfit, grossRR: grossProfit === null ? null : grossProfit / maxRisk, totalLoss, errors };
}

const longManual = calc({ side: "long", entry: 60, stop: 58.8, target: 62.4, szDecimals: 4 });
assert.equal(longManual.riskDistance.toFixed(1), "1.2");
assert.equal(longManual.rawSize.toFixed(4), "83.3333");
assert.equal(longManual.positionUsd.toFixed(0), "5000");
assert.equal(longManual.grossProfit.toFixed(0), "200");
assert.equal(longManual.grossRR.toFixed(1), "2.0");

const shortManual = calc({ side: "short", entry: 60, stop: 61.2, target: 57.6, szDecimals: 4 });
assert.equal(shortManual.riskDistance.toFixed(1), "1.2");
assert.equal(shortManual.rawSize.toFixed(4), "83.3333");
assert.equal(shortManual.grossProfit.toFixed(0), "200");
assert.equal(shortManual.grossRR.toFixed(1), "2.0");

const targetFirst = calc({ side: "long", mode: "target-first", entry: 60, target: 63, rr: 2, szDecimals: 4 });
assert.equal(targetFirst.stop.toFixed(1), "58.5");
assert.equal(targetFirst.riskDistance.toFixed(1), "1.5");

assert.equal(calc({ side: "long", entry: 60, stop: 61, target: 63 }).errors[0], "invalid stop");
assert.equal(calc({ side: "short", entry: 60, stop: 59, target: 57 }).errors[0], "invalid stop");

const withCosts = calc({ side: "long", entry: 60, stop: 58.8, target: 62.4, szDecimals: 4, feeBps: 4.5, slipBps: 3 });
assert.ok(withCosts.totalLoss <= 100);

const rounded = calc({ side: "long", entry: 60, stop: 58.8, target: 62.4, szDecimals: 2 });
assert.equal(rounded.size, 83.33);

console.log("risk-ticket-tests: 7/7 passed");

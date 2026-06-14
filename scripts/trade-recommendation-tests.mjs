import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "app", "lib", "risk", "buildTradeRecommendation.ts"), "utf8");

assert.match(source, /export function buildTradeRecommendation/);
assert.match(source, /export const MARKET_CONFIG/);

for (const state of ["scanning", "no_setup", "wait", "blocked", "setup_proposed"]) {
  assert.match(source, new RegExp(`"${state}"`), `missing recommendation state ${state}`);
}

for (const expected of [
  "minDepth10BpsUsd: 5_000_000",
  "minDepth10BpsUsd: 2_000_000",
  "minDepth10BpsUsd: 350_000",
  "longMomentum15mThresholdPct: 0.25",
  "longMomentum15mThresholdPct: 0.3",
  "longMomentum15mThresholdPct: 0.6",
  "minOi15mPct: 0.8",
  "minOi15mPct: 1.25",
  "minOi15mPct: 2.5",
]) {
  assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

function targetPrice(entry, side, targetMovePct) {
  return side === "long" ? entry * (1 + targetMovePct / 100) : entry * (1 - targetMovePct / 100);
}

function stopPrice(entry, side, target, desiredRewardRisk) {
  const distance = Math.abs(target - entry) / desiredRewardRisk;
  return side === "long" ? entry - distance : entry + distance;
}

function ticket({ entry, side, targetMovePct, desiredRewardRisk, maxRiskUsd, leverage }) {
  const target = targetPrice(entry, side, targetMovePct);
  const stop = stopPrice(entry, side, target, desiredRewardRisk);
  const riskPerUnit = Math.abs(entry - stop);
  const positionSize = maxRiskUsd / riskPerUnit;
  const liquidation = side === "long" ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage);
  return { target, stop, positionSize, liquidation };
}

const smallRisk = ticket({ entry: 60, side: "long", targetMovePct: 1, desiredRewardRisk: 2, maxRiskUsd: 50, leverage: 2 });
const largeRisk = ticket({ entry: 60, side: "long", targetMovePct: 1, desiredRewardRisk: 2, maxRiskUsd: 100, leverage: 2 });
const highLeverage = ticket({ entry: 60, side: "long", targetMovePct: 1, desiredRewardRisk: 2, maxRiskUsd: 50, leverage: 5 });

assert.equal(smallRisk.target.toFixed(2), "60.60");
assert.equal(smallRisk.stop.toFixed(2), "59.70");
assert.equal(largeRisk.target.toFixed(2), smallRisk.target.toFixed(2), "risk must not change target");
assert.equal(largeRisk.stop.toFixed(2), smallRisk.stop.toFixed(2), "risk must not change stop");
assert.equal((largeRisk.positionSize / smallRisk.positionSize).toFixed(0), "2", "risk only changes size");
assert.equal(highLeverage.target.toFixed(2), smallRisk.target.toFixed(2), "leverage must not change target");
assert.notEqual(highLeverage.liquidation.toFixed(2), smallRisk.liquidation.toFixed(2), "leverage changes liquidation estimate");

const shortTicket = ticket({ entry: 60, side: "short", targetMovePct: 1, desiredRewardRisk: 2, maxRiskUsd: 50, leverage: 2 });
assert.equal(shortTicket.target.toFixed(2), "59.40");
assert.equal(shortTicket.stop.toFixed(2), "60.30");

assert.match(source, /targetMovePct/);
assert.match(source, /maxRiskUsd/);
assert.match(source, /positionSize/);
const targetFormulaBlock = source.slice(source.indexOf("export function beginnerTargetPrice"), source.indexOf("export function beginnerStopPrice"));
assert.match(targetFormulaBlock, /targetMovePct/);
assert.doesNotMatch(targetFormulaBlock, /maxRiskUsd/, "target formula should not use max risk");
const stopFormulaBlock = source.slice(source.indexOf("export function beginnerStopPrice"), source.indexOf("export function buildSuggestedTrade"));
assert.match(stopFormulaBlock, /desiredRewardRisk/);
assert.doesNotMatch(stopFormulaBlock, /maxRiskUsd/, "stop formula should not use max risk");

console.log("trade-recommendation-tests: 12/12 passed");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scoreSource = readFileSync(join(root, "app", "lib", "risk", "buildTradeScore.ts"), "utf8");
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");

function targetPrice(entry, side, movePct) {
  return side === "long" ? entry * (1 + movePct / 100) : entry * (1 - movePct / 100);
}

function stopFromTarget(entry, target, side, rewardRisk) {
  const distance = Math.abs(target - entry) / rewardRisk;
  return side === "long" ? entry - distance : entry + distance;
}

const longTarget = targetPrice(60, "long", 1);
const shortTarget = targetPrice(60, "short", 1);
assert.equal(longTarget.toFixed(2), "60.60");
assert.equal(shortTarget.toFixed(2), "59.40");
assert.notEqual(longTarget.toFixed(2), "90.00");

const longStop = stopFromTarget(60, longTarget, "long", 2);
const shortStop = stopFromTarget(60, shortTarget, "short", 2);
assert.equal(longStop.toFixed(2), "59.70");
assert.equal(shortStop.toFixed(2), "60.30");

assert.match(scoreSource, /export function buildTradeScore/);
assert.match(scoreSource, /cap = withCap\(cap, 15\)/);
assert.match(scoreSource, /cap = withCap\(cap, 30\)/);
assert.match(scoreSource, /cap = withCap\(cap, 10\)/);
assert.match(scoreSource, /cap = withCap\(cap, 75\)/);
assert.match(scoreSource, /flow_unavailable/);
assert.match(scoreSource, /momentum_15m/);
assert.match(scoreSource, /spread_wide/);
assert.match(scoreSource, /preview_with_warning/);
assert.match(scoreSource, /preview_protected_order/);

assert.match(clientSource, /Max risk ne modifie pas target ni stop/);
assert.match(clientSource, /Leverage ne modifie pas target ni stop/);
assert.match(clientSource, /Ce score évalue la structure, le risque, l'exécution et l'alignement marché\. Ce n'est pas une probabilité de réussite\./);

console.log("trade-score-tests: passed");

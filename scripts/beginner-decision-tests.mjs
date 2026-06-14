import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const decisionSource = readFileSync(join(root, "app", "lib", "risk", "buildBeginnerTradeDecision.ts"), "utf8");
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");

for (const verdict of ["no_setup", "blocked", "wait", "risky", "setup_validated"]) {
  assert.match(decisionSource, new RegExp(`"${verdict}"`), `missing verdict ${verdict}`);
}

assert.match(decisionSource, /export function buildBeginnerTradeDecision/);
assert.match(clientSource, /function BeginnerScannerTicket/);
assert.match(clientSource, /function RecommendedOrderPreview/);
assert.match(clientSource, /recommendation\.state === "setup_proposed" && recommendation\.canAcceptSetup && trade/);
assert.match(clientSource, /Accepter ce setup/);
assert.match(clientSource, /Preview d'ordre protege/);

const scannerBlock = clientSource.slice(clientSource.indexOf("function BeginnerScannerTicket"), clientSource.indexOf("function ManualPlanFields"));
assert.doesNotMatch(scannerBlock, /Choose Long or Short/);
assert.doesNotMatch(scannerBlock, /Pick the direction/);
assert.doesNotMatch(scannerBlock, /Set your target price/);

assert.match(decisionSource, /Liquidation must stay safely beyond the stop/);
assert.match(decisionSource, /Estimated loss at stop must stay within user max risk/);
assert.match(decisionSource, /Flow should confirm or stay neutral before beginner validation/);
assert.match(decisionSource, /Position should use <= 5% of near-book depth/);
assert.match(decisionSource, /Net reward\/risk should be >=/);

console.log("beginner-decision-tests: 10/10 passed");

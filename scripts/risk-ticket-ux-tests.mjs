import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");

function blockBetween(start, end) {
  const from = clientSource.indexOf(start);
  assert.notEqual(from, -1, `missing block start ${start}`);
  const to = clientSource.indexOf(end, from);
  assert.notEqual(to, -1, `missing block end ${end}`);
  return clientSource.slice(from, to);
}

const riskTicketBlock = blockBetween("function RiskTicket", "function AssetCard");
const beginnerControlsBlock = blockBetween("function BeginnerRiskControls", "function BeginnerScannerTicket");
const scannerBlock = blockBetween("function BeginnerScannerTicket", "function ManualPlanFields");
const proBlock = blockBetween("function ProRiskTicket", "function TradeValidationWarnings");

assert.match(riskTicketBlock, /Mode Débutant/);
assert.match(riskTicketBlock, /Mode Pro/);
assert.match(riskTicketBlock, /BeginnerRiskControls/);
assert.match(riskTicketBlock, /BeginnerScannerTicket/);
assert.match(riskTicketBlock, /ManualPlanFields/);
assert.match(riskTicketBlock, /ProRiskTicket/);
assert.match(riskTicketBlock, /selectedMarket: asset\.apiCoin/);

for (const forbidden of [
  /Choose market & direction/i,
  /Pick the direction/i,
  /Set your target price/i,
  /Choose Long or Short/i,
  /Trade Builder/i,
]) {
  assert.doesNotMatch(riskTicketBlock, forbidden);
}

assert.match(beginnerControlsBlock, /Max risk USD/);
assert.match(beginnerControlsBlock, /Target move/);
assert.match(beginnerControlsBlock, /Risk\/reward target/);
assert.match(beginnerControlsBlock, /Leverage/);
assert.match(beginnerControlsBlock, /Entry preference/);
assert.match(beginnerControlsBlock, /Advanced override/);
assert.doesNotMatch(beginnerControlsBlock, /value=\{asset\.apiCoin\}/);

assert.match(scannerBlock, /setup_proposed/);
assert.match(scannerBlock, /Aucun setup proposé|recommendation\.title/);
assert.match(scannerBlock, /Accepter ce setup/);
assert.match(scannerBlock, /RecommendedOrderPreview/);
assert.doesNotMatch(scannerBlock, /Market selector/i);

assert.match(proBlock, /Raw trade ticket/);
assert.match(proBlock, /Trade Plan/);
assert.match(proBlock, /Market Data/);
assert.match(proBlock, /Data Quality/);
assert.doesNotMatch(proBlock, /Accepter ce setup/);
assert.doesNotMatch(proBlock, /Pourquoi ce setup/);
assert.doesNotMatch(proBlock, /Setup proposé/);

console.log("risk-ticket-ux-tests: 10/10 passed");

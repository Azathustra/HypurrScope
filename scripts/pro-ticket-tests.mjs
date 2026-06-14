import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const proSource = readFileSync(join(root, "app", "lib", "risk", "buildProTicketState.ts"), "utf8");
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");

assert.match(proSource, /export function buildProTicketState/);
assert.match(proSource, /type ProTicketState/);
assert.match(proSource, /canPreviewOrder/);
assert.match(proSource, /previewUnavailableReason/);

for (const reason of [
  "Order preview unavailable: invalid stop loss.",
  "Order preview unavailable: pricing data unavailable.",
  "Order preview unavailable: estimated loss exceeds max risk.",
  "Order preview unavailable: TP/SL cannot be attached.",
  "Order preview unavailable: asset precision unavailable.",
]) {
  assert.match(proSource, new RegExp(reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(clientSource, /function ProRiskTicket/);
assert.match(clientSource, /function buildProTicketStateForUi/);

for (const section of ["Trade Plan", "Risk", "Execution", "Market Data", "Data Quality", "Advanced Raw Data"]) {
  assert.match(clientSource, new RegExp(section));
}

const proBlock = clientSource.slice(clientSource.indexOf("function ProRiskTicket"), clientSource.indexOf("function TradeValidationWarnings"));
assert.match(proBlock, /Preview order/);
assert.doesNotMatch(proBlock, /Accepter ce setup/);
assert.doesNotMatch(proBlock, /Setup valide/i);
assert.doesNotMatch(proBlock, /Setup risqu/i);
assert.doesNotMatch(proBlock, /Wait for confirmation/);
assert.doesNotMatch(proBlock, /Reduce size/);
assert.doesNotMatch(proBlock, /Switch to limit/);
assert.doesNotMatch(proBlock, /Score de qualite/i);

assert.match(clientSource, /mode === "pro"[\s\S]*?proTicketState\.canPreviewOrder[\s\S]*?Preview order/);
assert.match(clientSource, /mode !== "pro" && \(ticketComputable/);
assert.match(clientSource, /<ProRiskTicket ticketState=\{proTicketState\} onPreview=\{onPreview\} \/>/);

console.log("pro-ticket-tests: 12/12 passed");

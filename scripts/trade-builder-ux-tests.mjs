import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clientSource = readFileSync(join(root, "app", "hypurrscope-client.tsx"), "utf8");
const scoreSource = readFileSync(join(root, "app", "lib", "risk", "buildTradeScore.ts"), "utf8");
const cssSource = readFileSync(join(root, "app", "globals.css"), "utf8");
const combined = `${clientSource}\n${scoreSource}\n${cssSource}`;

const required = [
  "Trade Builder + Trade Score",
  "Build your trade. HypurrScope scores the risk.",
  "Trade Builder",
  "Trade Score",
  "Données avancées / Expert",
  "Target move %",
  "Risk/reward target",
  "TP/SL protection",
  "Corriger la taille",
  "Baisser le levier",
  "Passer en limit order",
  "Ajouter un stop",
  "Corriger le stop",
  "Corriger le target",
  "Actualiser les donnees",
  "Previsualiser avec avertissement",
  "Previsualiser l'ordre protege",
];

for (const text of required) {
  assert.ok(combined.includes(text), `missing expected text: ${text}`);
}

const forbidden = [
  "Mode Débutant",
  "Mode Pro",
  "Accepter ce setup",
  "Setup proposé",
  "Scanner activé",
  "Me prévenir",
  "Winrate",
  "Win probability",
  "Trade gagnant",
  "Signal sûr",
];

for (const text of forbidden) {
  assert.ok(!combined.includes(text), `forbidden text still present: ${text}`);
}

assert.ok(!clientSource.includes('view === "alerts"'), "alerts page should not be part of the main app view");
assert.ok(!clientSource.includes('view === "wallet"'), "wallet page should not be part of the main app view");

console.log("trade-builder-ux-tests: passed");

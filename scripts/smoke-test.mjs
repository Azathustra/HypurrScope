import fs from "node:fs";

const page = `${fs.readFileSync("app/page.tsx", "utf8")}\n${fs.readFileSync("app/hypurrscope-client.tsx", "utf8")}`;
const layout = fs.readFileSync("app/layout.tsx", "utf8");

const checks = [
  ["Trade score hero", page.includes("Build your trade. HypurrScope scores the risk.")],
  ["Trade Builder nav", page.includes("Trade Builder")],
  ["Trade Score card", page.includes("Trade Score")],
  ["BTC support", page.includes('"BTC"')],
  ["ETH support", page.includes('"ETH"')],
  ["HYPE support", page.includes('"HYPE"')],
  ["Advanced data page", page.includes("Advanced Data")],
  ["Expert data panel", page.includes("Données avancées / Expert")],
  ["Score disclaimer", page.includes("Ce score évalue la structure")],
  ["SEO title", layout.includes("HypurrScope | Hyperliquid Trade Planner")],
  ["SEO description", layout.includes("Plan BTC, ETH and HYPE Hyperliquid trades from target profit and max total risk")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Smoke test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Smoke test passed.");

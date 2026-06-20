import { addDays, formatISO } from "date-fns";
import type { PlanKey } from "@/lib/plans";

export type ResearchPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  assets: string[];
  requiredPlan: PlanKey;
  conviction: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high" | "extreme";
  publishedAt: string;
};

export type AlphaSignal = {
  id: string;
  title: string;
  asset: string;
  ticker: string;
  thesis: string;
  trigger: string;
  invalidation: string;
  timeframe: string;
  conviction: number;
  riskLevel: "low" | "medium" | "high" | "extreme";
  requiredPlan: PlanKey;
  category: string;
  publishedAt: string;
};

export type ModelPortfolio = {
  id: string;
  name: string;
  slug: string;
  description: string;
  initialValue: number;
  currentValue: number;
  btcBenchmarkValue: number;
  riskScore: number;
  requiredPlan: PlanKey;
  launchedAt: string;
  allocations: Array<{
    assetName: string;
    ticker: string;
    assetType: "crypto" | "tradfi" | "cash";
    weight: number;
    value: number;
    performance: number;
  }>;
};

export type CryptoProject = {
  slug: string;
  name: string;
  ticker: string;
  category: string;
  score: number;
  thesis: string;
  risks: string[];
  requiredPlan: PlanKey;
};

const categories = ["Bitcoin", "L1", "DeFi", "AI", "Hyperliquid", "Macro", "TradFi"];
const assets = ["BTC", "ETH", "SOL", "HYPE", "TAO", "LINK", "NVDA", "GOLD"];

export const researchPosts: ResearchPost[] = Array.from({ length: 12 }, (_, index) => {
  const category = categories[index % categories.length];
  const ticker = assets[index % assets.length];
  const requiredPlan: PlanKey = index < 3 ? "free" : index < 8 ? "member" : index < 11 ? "pro" : "desk";

  return {
    id: `post-${index + 1}`,
    title: `${category} : lecture de cycle et niveaux de décision ${index + 1}`,
    slug: `${category.toLowerCase()}-lecture-cycle-${index + 1}`,
    excerpt:
      "Analyse structurée des flux, de la liquidité et des niveaux techniques à surveiller sans promesse de rendement.",
    content: `# ${category} : lecture de cycle\n\nCette note synthétise les éléments observables : flux, momentum, liquidité, valorisation relative et risques.\n\n## Thèse\n\nL'objectif est d'identifier les zones où le couple rendement/risque paraît plus lisible, sans extrapoler une performance future.\n\n## Points de surveillance\n\n- Flux institutionnels et profondeur de marché.\n- Corrélation avec Bitcoin et conditions macro.\n- Invalidation claire si la structure de marché se détériore.\n\nContenu fourni à titre informatif et éducatif. Ne constitue pas un conseil en investissement personnalisé. Les crypto-actifs sont risqués.`,
    category,
    tags: [category, ticker, "research"],
    assets: [ticker],
    requiredPlan,
    conviction: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
    riskLevel: index % 4 === 0 ? "high" : index % 4 === 1 ? "medium" : index % 4 === 2 ? "low" : "extreme",
    publishedAt: formatISO(addDays(new Date("2026-06-20"), -index))
  };
});

export const alphaSignals: AlphaSignal[] = Array.from({ length: 10 }, (_, index) => ({
  id: `signal-${index + 1}`,
  title: `Signal ${assets[index % assets.length]} : setup surveillé`,
  asset: assets[index % assets.length],
  ticker: assets[index % assets.length],
  thesis:
    "Le signal combine momentum, niveau de liquidité et flux observables. Il doit être confirmé par le comportement du marché.",
  trigger: "Clôture journalière au-dessus du niveau de confirmation avec volume supérieur à la moyenne.",
  invalidation: "Retour sous le support clé ou dégradation brutale de la liquidité.",
  timeframe: index % 2 === 0 ? "2-6 semaines" : "1-3 mois",
  conviction: 55 + index * 4,
  riskLevel: index % 4 === 0 ? "high" : index % 4 === 1 ? "medium" : index % 4 === 2 ? "low" : "extreme",
  requiredPlan: index < 2 ? "free" : index < 7 ? "member" : "pro",
  category: categories[index % categories.length],
  publishedAt: formatISO(addDays(new Date("2026-06-20"), -index))
}));

export const portfolios: ModelPortfolio[] = [
  {
    id: "portfolio-1",
    name: "Insider Portfolio",
    slug: "insider-portfolio",
    description: "Allocation multi-actifs crypto, TradFi et cash conçue pour comparer la performance à Bitcoin.",
    initialValue: 50000,
    currentValue: 183000,
    btcBenchmarkValue: 48400,
    riskScore: 50,
    requiredPlan: "member",
    launchedAt: "2024-10-30",
    allocations: [
      { assetName: "Bitcoin", ticker: "BTC", assetType: "crypto", weight: 30, value: 54900, performance: 74 },
      { assetName: "Hyperliquid", ticker: "HYPE", assetType: "crypto", weight: 24, value: 43920, performance: 142 },
      { assetName: "Gold Futures", ticker: "GOLD", assetType: "tradfi", weight: 15, value: 27450, performance: 29 },
      { assetName: "S&P 500", ticker: "SPX", assetType: "tradfi", weight: 13, value: 23790, performance: 18 },
      { assetName: "NVIDIA", ticker: "NVDA", assetType: "tradfi", weight: 12, value: 21960, performance: 63 },
      { assetName: "Cash", ticker: "USD", assetType: "cash", weight: 6, value: 10980, performance: 0 }
    ]
  },
  {
    id: "portfolio-2",
    name: "High Conviction Crypto",
    slug: "high-conviction-crypto",
    description: "Portefeuille concentré sur les actifs crypto les plus liquides et les narratives fortes.",
    initialValue: 50000,
    currentValue: 129500,
    btcBenchmarkValue: 69200,
    riskScore: 78,
    requiredPlan: "pro",
    launchedAt: "2025-01-15",
    allocations: [
      { assetName: "Bitcoin", ticker: "BTC", assetType: "crypto", weight: 40, value: 51800, performance: 61 },
      { assetName: "Solana", ticker: "SOL", assetType: "crypto", weight: 22, value: 28490, performance: 96 },
      { assetName: "Hyperliquid", ticker: "HYPE", assetType: "crypto", weight: 20, value: 25900, performance: 138 },
      { assetName: "Bittensor", ticker: "TAO", assetType: "crypto", weight: 12, value: 15540, performance: 44 },
      { assetName: "Cash", ticker: "USD", assetType: "cash", weight: 6, value: 7770, performance: 0 }
    ]
  },
  {
    id: "portfolio-3",
    name: "Defensive Crypto",
    slug: "defensive-crypto",
    description: "Allocation plus prudente avec cash, BTC et couvertures macro.",
    initialValue: 50000,
    currentValue: 78200,
    btcBenchmarkValue: 69100,
    riskScore: 34,
    requiredPlan: "member",
    launchedAt: "2025-02-01",
    allocations: [
      { assetName: "Bitcoin", ticker: "BTC", assetType: "crypto", weight: 42, value: 32844, performance: 44 },
      { assetName: "Ethereum", ticker: "ETH", assetType: "crypto", weight: 16, value: 12512, performance: 18 },
      { assetName: "Gold Futures", ticker: "GOLD", assetType: "tradfi", weight: 22, value: 17204, performance: 21 },
      { assetName: "Cash", ticker: "USD", assetType: "cash", weight: 20, value: 15640, performance: 0 }
    ]
  },
  {
    id: "portfolio-4",
    name: "Hyperliquid Ecosystem",
    slug: "hyperliquid-ecosystem",
    description: "Exposition à l'écosystème Hyperliquid et aux infrastructures liées aux marchés perpétuels.",
    initialValue: 50000,
    currentValue: 116400,
    btcBenchmarkValue: 64200,
    riskScore: 86,
    requiredPlan: "desk",
    launchedAt: "2025-03-10",
    allocations: [
      { assetName: "Hyperliquid", ticker: "HYPE", assetType: "crypto", weight: 48, value: 55872, performance: 156 },
      { assetName: "Bitcoin", ticker: "BTC", assetType: "crypto", weight: 20, value: 23280, performance: 42 },
      { assetName: "Solana", ticker: "SOL", assetType: "crypto", weight: 12, value: 13968, performance: 74 },
      { assetName: "Cash", ticker: "USD", assetType: "cash", weight: 20, value: 23280, performance: 0 }
    ]
  }
];

export const portfolioTransactions = Array.from({ length: 30 }, (_, index) => ({
  id: `tx-${index + 1}`,
  portfolioSlug: portfolios[index % portfolios.length].slug,
  assetName: assets[index % assets.length],
  ticker: assets[index % assets.length],
  action: ["buy", "sell", "rebalance", "add_cash"][index % 4],
  value: 1500 + index * 420,
  note: "Transaction mockée pour illustrer l'historique d'allocation.",
  executedAt: formatISO(addDays(new Date("2026-01-01"), index * 5))
}));

export const performancePoints = Array.from({ length: 200 }, (_, index) => ({
  date: formatISO(addDays(new Date("2025-01-01"), index), { representation: "date" }),
  portfolioValue: 50000 + Math.round(index * 430 + Math.sin(index / 8) * 4200),
  btcBenchmarkValue: 50000 + Math.round(index * 210 + Math.sin(index / 10) * 5200)
}));

export const reports = Array.from({ length: 8 }, (_, index) => ({
  id: `report-${index + 1}`,
  title: `Rapport mensuel Insider Crypto #${index + 1}`,
  slug: `rapport-mensuel-${index + 1}`,
  excerpt: "Rapport long sur liquidité, cycles crypto, risques et allocations modèles.",
  requiredPlan: index < 2 ? "member" : index < 6 ? "pro" : "desk",
  publishedAt: formatISO(addDays(new Date("2026-06-01"), -index * 30))
}));

export const projects: CryptoProject[] = [
  ["Bitcoin", "BTC", "Store of value", 92],
  ["Ethereum", "ETH", "Smart contracts", 84],
  ["Solana", "SOL", "L1 haute performance", 86],
  ["Hyperliquid", "HYPE", "Perp DEX", 90],
  ["Bittensor", "TAO", "AI crypto", 77],
  ["Chainlink", "LINK", "Oracles", 79],
  ["BNB", "BNB", "Exchange ecosystem", 70],
  ["XRP", "XRP", "Paiements", 61]
].map(([name, ticker, category, score], index) => ({
  slug: String(name).toLowerCase().replaceAll(" ", "-"),
  name: String(name),
  ticker: String(ticker),
  category: String(category),
  score: Number(score),
  thesis: "Fiche projet synthétique avec thèse, données de marché, catalyseurs et risques clés.",
  risks: ["Risque réglementaire", "Compression de liquidité", "Volatilité élevée"],
  requiredPlan: index < 2 ? "free" : index < 6 ? "member" : "pro"
}));

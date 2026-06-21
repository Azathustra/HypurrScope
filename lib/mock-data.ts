export type AllocationType = "Crypto" | "TradFi" | "Cash";

export type Allocation = {
  name: string;
  ticker: string;
  type: AllocationType;
  value: number;
  performance: number;
  weight: number;
  color: string;
};

export type Transaction = {
  date: string;
  action: string;
  asset: string;
  amount: string;
  note: string;
};

export type FeedPost = {
  id: number;
  title: string;
  asset: string;
  date: string;
  tag: string;
  summary: string;
  conviction: "Faible" | "Moyenne" | "Forte" | "Très forte";
};

export const portfolioSummary = {
  name: "Crypto Hold-Up Portfolio",
  riskScore: 50,
  assets: 5,
  initialInvestment: "$50K",
  launchDate: "30 oct. 2024",
  currentValue: "$183K",
  totalReturn: "+266.03%",
  annualizedReturn: "+120.78%",
  vsBitcoin: "+278.39%"
};

export const allocations: Allocation[] = [
  {
    name: "Bitcoin",
    ticker: "BTC",
    type: "Crypto",
    value: 55449,
    performance: 74.2,
    weight: 30.3,
    color: "#F7931A"
  },
  {
    name: "Hyperliquid",
    ticker: "HYPE",
    type: "Crypto",
    value: 43371,
    performance: 142.8,
    weight: 23.7,
    color: "#59D8FF"
  },
  {
    name: "Gold Futures",
    ticker: "GOLD",
    type: "TradFi",
    value: 27184,
    performance: 29.4,
    weight: 14.9,
    color: "#D7B45B"
  },
  {
    name: "S&P 500",
    ticker: "^GSPC",
    type: "TradFi",
    value: 24156,
    performance: 18.7,
    weight: 13.2,
    color: "#6FA8FF"
  },
  {
    name: "NVIDIA",
    ticker: "NVDA",
    type: "TradFi",
    value: 21718,
    performance: 63.5,
    weight: 11.9,
    color: "#76B900"
  },
  {
    name: "Dollar",
    ticker: "USD",
    type: "Cash",
    value: 11122,
    performance: 0,
    weight: 6,
    color: "#A7B0C0"
  }
];

export const transactions: Transaction[] = [
  {
    date: "30 oct. 2024",
    action: "Buy",
    asset: "BTC",
    amount: "$18,000",
    note: "Base liquide pour capter le beta crypto."
  },
  {
    date: "12 nov. 2024",
    action: "Buy",
    asset: "HYPE",
    amount: "$10,500",
    note: "Entrée sur revenus protocole et traction DEX."
  },
  {
    date: "03 janv. 2025",
    action: "Buy",
    asset: "GOLD",
    amount: "$7,500",
    note: "Couverture macro contre volatilité USD."
  },
  {
    date: "18 mars 2025",
    action: "Rebalance",
    asset: "NVDA",
    amount: "$4,800",
    note: "Réduction tactique après expansion des multiples."
  },
  {
    date: "02 mai 2025",
    action: "Add Cash",
    asset: "USD",
    amount: "$5,000",
    note: "Réserve pour drawdown et opportunités."
  }
];

export const performanceHistory = [
  { month: "Oct. 24", portfolio: 50000, bitcoin: 50000 },
  { month: "Nov. 24", portfolio: 64200, bitcoin: 61200 },
  { month: "Déc. 24", portfolio: 77100, bitcoin: 68400 },
  { month: "Janv. 25", portfolio: 84200, bitcoin: 73100 },
  { month: "Févr. 25", portfolio: 92800, bitcoin: 70200 },
  { month: "Mars 25", portfolio: 101400, bitcoin: 66400 },
  { month: "Avr. 25", portfolio: 119200, bitcoin: 70800 },
  { month: "Mai 25", portfolio: 137800, bitcoin: 75800 },
  { month: "Juin 25", portfolio: 149900, bitcoin: 79400 },
  { month: "Juil. 25", portfolio: 162600, bitcoin: 82100 },
  { month: "Août 25", portfolio: 171300, bitcoin: 80200 },
  { month: "Sept. 25", portfolio: 183000, bitcoin: 48400 }
];

export const cryptoRows = [
  { name: "Bitcoin", ticker: "BTC", price: "$104,840", day: 1.8, week: 5.4, cap: "$2.08T", score: 92 },
  { name: "Ethereum", ticker: "ETH", price: "$3,740", day: -0.7, week: 2.2, cap: "$451B", score: 81 },
  { name: "Solana", ticker: "SOL", price: "$187.32", day: 3.1, week: 9.8, cap: "$91B", score: 84 },
  { name: "Hyperliquid", ticker: "HYPE", price: "$39.80", day: 4.6, week: 18.2, cap: "$13.2B", score: 89 },
  { name: "Bittensor", ticker: "TAO", price: "$481.10", day: -2.4, week: 6.1, cap: "$3.6B", score: 76 },
  { name: "Chainlink", ticker: "LINK", price: "$22.41", day: 0.9, week: 4.7, cap: "$14.3B", score: 78 },
  { name: "BNB", ticker: "BNB", price: "$702.50", day: 1.2, week: 3.1, cap: "$102B", score: 72 },
  { name: "XRP", ticker: "XRP", price: "$2.28", day: -1.6, week: -3.4, cap: "$131B", score: 61 }
];

export const hyperliquidStats = [
  { label: "Prix HYPE", value: "$39.80", delta: "+4.6%" },
  { label: "Volume 24h", value: "$8.4B", delta: "+18%" },
  { label: "Open interest", value: "$6.1B", delta: "+9%" },
  { label: "Funding moyen", value: "0.014%", delta: "neutre" },
  { label: "Revenus annualisés", value: "$1.18B", delta: "+31%" },
  { label: "Buybacks estimés", value: "$612M", delta: "+24%" }
];

export const hyperliquidChart = [
  { day: "Lun", volume: 4.9, oi: 4.8 },
  { day: "Mar", volume: 5.8, oi: 5.1 },
  { day: "Mer", volume: 5.4, oi: 5.2 },
  { day: "Jeu", volume: 6.7, oi: 5.6 },
  { day: "Ven", volume: 7.2, oi: 5.8 },
  { day: "Sam", volume: 6.4, oi: 5.9 },
  { day: "Dim", volume: 8.4, oi: 6.1 }
];

export const feedPosts: FeedPost[] = [
  {
    id: 1,
    title: "Les frais perpétuels reviennent vers les plus hauts du cycle",
    asset: "HYPE",
    date: "20 juin 2026",
    tag: "Hyperliquid",
    summary: "Les volumes se concentrent sur les paires BTC, ETH et SOL avec une hausse simultanée des revenus protocole.",
    conviction: "Très forte"
  },
  {
    id: 2,
    title: "Compression de volatilité sur Bitcoin avant décision macro",
    asset: "BTC",
    date: "19 juin 2026",
    tag: "Bitcoin",
    summary: "Les desks options paient moins de gamma court terme, ce qui ouvre un setup asymétrique en cas de surprise.",
    conviction: "Forte"
  },
  {
    id: 3,
    title: "Rotation AI crypto : TAO redevient l'actif le plus surveillé",
    asset: "TAO",
    date: "18 juin 2026",
    tag: "AI",
    summary: "La liquidité revient sur les sous-réseaux productifs, mais les valorisations restent dispersées.",
    conviction: "Moyenne"
  },
  {
    id: 4,
    title: "TradFi absorbe les flux ETF pendant que le spot reste calme",
    asset: "SPX",
    date: "17 juin 2026",
    tag: "TradFi",
    summary: "Le signal de corrélation actions/crypto reste constructif tant que le dollar ne repart pas violemment.",
    conviction: "Moyenne"
  }
];

export const latestSignals = [
  { asset: "BTC", signal: "Accumulation ETF", impact: "Élevé", date: "20 juin" },
  { asset: "HYPE", signal: "Revenus protocole en accélération", impact: "Élevé", date: "20 juin" },
  { asset: "NVDA", signal: "Repricing IA côté TradFi", impact: "Moyen", date: "19 juin" },
  { asset: "GOLD", signal: "Couverture macro active", impact: "Moyen", date: "18 juin" }
];

export const researchResults = [
  {
    title: "Bitcoin : liquidité, ETF et convexité macro",
    type: "Note premium",
    date: "20 juin 2026",
    excerpt: "Lecture croisée des flux ETF, carnets spot et volatilité implicite."
  },
  {
    title: "Hyperliquid : modèle de revenus et dynamique buyback",
    type: "Dossier protocole",
    date: "18 juin 2026",
    excerpt: "Analyse du flywheel volume, frais, rachats et risques de compression."
  },
  {
    title: "Portefeuille modèle : rééquilibrage post rally",
    type: "Allocation",
    date: "14 juin 2026",
    excerpt: "Pourquoi conserver du cash et de l'or malgré le momentum crypto."
  },
  {
    title: "AI coins : distinguer usage réel et narratif",
    type: "Research",
    date: "11 juin 2026",
    excerpt: "Cadre de scoring pour TAO, compute markets et agents autonomes."
  }
];

export const formationTracks = [
  {
    title: "Crypto Foundations",
    level: "Débutant",
    duration: "4 modules",
    description: "Comprendre Bitcoin, Ethereum, wallets, stablecoins, cycles de marché et sécurité opérationnelle.",
    lessons: ["Wallets & self-custody", "Lire un cycle crypto", "Bases on-chain", "Gestion du risque"]
  },
  {
    title: "Portfolio & Risk",
    level: "Intermédiaire",
    duration: "6 modules",
    description: "Construire une allocation crypto/TradFi, définir des tailles de position et piloter les rééquilibrages.",
    lessons: ["Allocation modèle", "Cash management", "Drawdowns", "Performance vs BTC"]
  },
  {
    title: "Alpha On-chain",
    level: "Avancé",
    duration: "5 modules",
    description: "Transformer les flux, revenus protocole, volumes DEX et données de wallets en signaux exploitables.",
    lessons: ["Flux et revenus", "DEX & perpétuels", "Wallet tracking", "Signal scoring"]
  }
];

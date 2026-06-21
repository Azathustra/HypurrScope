import { addDays, formatISO } from "date-fns";

export type Room = {
  slug: string;
  name: string;
  description: string;
  access: "free" | "member" | "pro";
  members: number;
};

export type MemberProfile = {
  username: string;
  displayName: string;
  role: string;
  bio: string;
  badges: string[];
};

export type CommunityPost = {
  id: string;
  room: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  publishedAt: string;
  comments: number;
};

export const rooms: Room[] = [
  {
    slug: "market-desk",
    name: "Market desk",
    description: "Flux court terme, niveaux importants, risk-off/risk-on et debats macro.",
    access: "member",
    members: 728
  },
  {
    slug: "bitcoin-ethereum",
    name: "Bitcoin & Ethereum",
    description: "ETF, treasuries, on-chain, liquidite et cycles BTC/ETH.",
    access: "free",
    members: 1194
  },
  {
    slug: "altcoins-narratives",
    name: "Altcoins narratives",
    description: "Narratifs L1, DeFi, AI, infra et rotation de capital.",
    access: "member",
    members: 532
  },
  {
    slug: "portfolio-lab",
    name: "Portfolio lab",
    description: "Allocation, sizing, rebalancing, watchlists et gestion du risque.",
    access: "pro",
    members: 318
  }
];

export const members: MemberProfile[] = [
  {
    username: "satoshi-desk",
    displayName: "Satoshi Desk",
    role: "Research lead",
    bio: "Suit Bitcoin, liquidite globale, ETF et cycles de marche.",
    badges: ["Admin", "BTC", "Macro"]
  },
  {
    username: "defi-scout",
    displayName: "DeFi Scout",
    role: "Analyste DeFi",
    bio: "Cartographie les protocoles, revenus, risques smart contract et catalyseurs.",
    badges: ["DeFi", "Risk"]
  },
  {
    username: "macro-pulse",
    displayName: "Macro Pulse",
    role: "Strategie macro",
    bio: "Regarde taux, dollar, actions, liquidite et correlations crypto.",
    badges: ["Macro", "TradFi"]
  },
  {
    username: "portfolio-lab",
    displayName: "Portfolio Lab",
    role: "Allocation",
    bio: "Travaille les portefeuilles modeles, le sizing et les alertes.",
    badges: ["Portfolio", "Pro"]
  },
  {
    username: "academy",
    displayName: "Academy",
    role: "Formation",
    bio: "Produit les parcours pedagogiques et les exercices pratiques.",
    badges: ["Formation"]
  }
];

export const communityPosts: CommunityPost[] = Array.from({ length: 10 }, (_, index) => {
  const room = rooms[index % rooms.length];
  const author = members[index % members.length];

  return {
    id: `post-${index + 1}`,
    room: room.name,
    title: `${room.name} : point de marche ${index + 1}`,
    excerpt: "Synthese courte avec contexte, niveaux a surveiller et question ouverte pour la communaute.",
    body:
      "Cette note est un exemple de contenu communautaire. En production, elle sera stockee dans Supabase avec commentaires, reactions, moderation et droits d'acces par abonnement.",
    author: author.username,
    publishedAt: formatISO(addDays(new Date("2026-06-21"), -index)),
    comments: 8 + index * 3
  };
});

export const watchlists = [
  {
    id: "watchlist-btc-beta",
    name: "BTC beta",
    description: "Actifs sensibles a Bitcoin, ETF, mineurs et tresoreries.",
    assets: ["BTC", "MSTR", "COIN", "IBIT", "MARA", "RIOT"]
  },
  {
    id: "watchlist-ai-crypto",
    name: "AI crypto",
    description: "Narratif IA crypto avec niveaux et risques.",
    assets: ["TAO", "RENDER", "FET", "NVDA", "GOOGL"]
  },
  {
    id: "watchlist-defensive",
    name: "Defensive",
    description: "Suivi risque global, cash proxies, or et Bitcoin.",
    assets: ["BTC", "ETH", "GLD", "TLT", "UUP"]
  }
];

export const alerts = [
  { id: "alert-btc-70k", asset: "BTC", condition: "Prix au-dessus de 70 000 USD", status: "active" },
  { id: "alert-eth-flows", asset: "ETH", condition: "Flux ETF positifs trois seances", status: "paused" },
  { id: "alert-nvda-risk", asset: "NVDA", condition: "Cloture sous moyenne 50 jours", status: "active" }
];

export const notifications = [
  { id: "notif-1", title: "Nouvelle note research", body: "Le point BTC/ETH est disponible.", unread: true },
  { id: "notif-2", title: "Alerte portefeuille", body: "Un niveau de rebalancing a ete touche.", unread: true },
  { id: "notif-3", title: "Formation", body: "Le module risk management est pret.", unread: false }
];

export const formationPrograms = [
  {
    slug: "bases-cycle-crypto",
    title: "Bases du cycle crypto",
    level: "Debutant",
    lessons: ["Cycles et liquidite", "Volatilite", "Regles de survie"]
  },
  {
    slug: "portfolio-risk",
    title: "Portfolio & risk",
    level: "Intermediaire",
    lessons: ["Sizing", "Rebalancing", "Journal de decision"]
  },
  {
    slug: "research-operator",
    title: "Research operator",
    level: "Avance",
    lessons: ["Theses", "Invalidations", "Execution"]
  }
];

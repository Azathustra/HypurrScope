export type MarketRow = {
  name: string;
  ticker: string;
  price: string;
  day: number;
  week: number;
  cap: string;
  score: number;
};

export const cryptoFallbackRows: MarketRow[] = [
  { name: "Bitcoin", ticker: "BTC", price: "$104,840", day: 1.8, week: 5.4, cap: "$2.08T", score: 92 },
  { name: "Ethereum", ticker: "ETH", price: "$3,740", day: -0.7, week: 2.2, cap: "$451B", score: 81 },
  { name: "Solana", ticker: "SOL", price: "$187.32", day: 3.1, week: 9.8, cap: "$91B", score: 84 },
  { name: "Hyperliquid", ticker: "HYPE", price: "$66.00", day: 4.6, week: 18.2, cap: "$21.9B", score: 89 },
  { name: "Bittensor", ticker: "TAO", price: "$481.10", day: -2.4, week: 6.1, cap: "$3.6B", score: 76 },
  { name: "Chainlink", ticker: "LINK", price: "$22.41", day: 0.9, week: 4.7, cap: "$14.3B", score: 78 },
  { name: "BNB", ticker: "BNB", price: "$702.50", day: 1.2, week: 3.1, cap: "$102B", score: 72 },
  { name: "XRP", ticker: "XRP", price: "$2.28", day: -1.6, week: -3.4, cap: "$131B", score: 61 }
];

export const tradfiFallbackRows: MarketRow[] = [
  { name: "S&P 500 ETF", ticker: "SPY", price: "$640.12", day: 0.4, week: 1.8, cap: "$690B", score: 82 },
  { name: "Nasdaq 100 ETF", ticker: "QQQ", price: "$575.30", day: 0.6, week: 2.4, cap: "$345B", score: 84 },
  { name: "Gold ETF", ticker: "GLD", price: "$318.44", day: -0.2, week: 0.9, cap: "$92B", score: 77 },
  { name: "NVIDIA", ticker: "NVDA", price: "$181.20", day: 1.1, week: 4.3, cap: "$4.45T", score: 88 },
  { name: "Apple", ticker: "AAPL", price: "$212.40", day: -0.3, week: 1.1, cap: "$3.15T", score: 74 },
  { name: "Tesla", ticker: "TSLA", price: "$345.70", day: 2.2, week: 6.7, cap: "$1.10T", score: 71 }
];

export function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

export function formatCompactUsd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

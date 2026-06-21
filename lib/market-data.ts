export type MarketRow = {
  rank?: number;
  name: string;
  ticker: string;
  logoUrl?: string;
  price: string;
  priceValue?: number;
  day: number;
  week: number;
  month?: number;
  cap: string;
  capValue?: number;
  score: number;
  sparkline?: number[];
};

export const cryptoFallbackRows: MarketRow[] = [
  { rank: 1, name: "Bitcoin", ticker: "BTC", logoUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png", price: "$104,840", day: 1.8, week: 5.4, month: 8.2, cap: "$2.08T", score: 92, sparkline: [96, 98, 101, 99, 103, 105, 104] },
  { rank: 2, name: "Ethereum", ticker: "ETH", logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", price: "$3,740", day: -0.7, week: 2.2, month: 4.1, cap: "$451B", score: 81, sparkline: [92, 94, 95, 93, 96, 97, 95] },
  { rank: 3, name: "Solana", ticker: "SOL", logoUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png", price: "$187.32", day: 3.1, week: 9.8, month: 12.4, cap: "$91B", score: 84, sparkline: [70, 74, 78, 81, 86, 90, 94] },
  { rank: 4, name: "Hyperliquid", ticker: "HYPE", logoUrl: "https://assets.coingecko.com/coins/images/50882/small/hyperliquid.jpg", price: "$66.00", day: 4.6, week: 18.2, month: 22.1, cap: "$21.9B", score: 89, sparkline: [44, 47, 51, 58, 61, 64, 66] },
  { rank: 5, name: "Bittensor", ticker: "TAO", logoUrl: "https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg", price: "$481.10", day: -2.4, week: 6.1, month: -3.3, cap: "$3.6B", score: 76, sparkline: [500, 492, 488, 494, 486, 478, 481] },
  { rank: 6, name: "Chainlink", ticker: "LINK", logoUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png", price: "$22.41", day: 0.9, week: 4.7, month: 6.6, cap: "$14.3B", score: 78, sparkline: [20, 20.4, 21, 21.6, 22.1, 21.9, 22.4] },
  { rank: 7, name: "BNB", ticker: "BNB", logoUrl: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", price: "$702.50", day: 1.2, week: 3.1, month: 2.7, cap: "$102B", score: 72, sparkline: [680, 688, 692, 697, 701, 699, 702] },
  { rank: 8, name: "XRP", ticker: "XRP", logoUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png", price: "$2.28", day: -1.6, week: -3.4, month: -5.1, cap: "$131B", score: 61, sparkline: [2.42, 2.39, 2.36, 2.31, 2.34, 2.29, 2.28] }
];

export const tradfiFallbackRows: MarketRow[] = [
  { rank: 1, name: "S&P 500 ETF", ticker: "SPY", price: "$640.12", day: 0.4, week: 1.8, month: 4.9, cap: "$690B", score: 82, sparkline: [620, 625, 628, 632, 636, 638, 640] },
  { rank: 2, name: "Nasdaq 100 ETF", ticker: "QQQ", price: "$575.30", day: 0.6, week: 2.4, month: 6.8, cap: "$345B", score: 84, sparkline: [540, 548, 553, 562, 570, 573, 575] },
  { rank: 3, name: "Gold ETF", ticker: "GLD", price: "$318.44", day: -0.2, week: 0.9, month: 2.1, cap: "$92B", score: 77, sparkline: [311, 314, 316, 319, 317, 318, 318] },
  { rank: 4, name: "NVIDIA", ticker: "NVDA", price: "$181.20", day: 1.1, week: 4.3, month: 10.2, cap: "$4.45T", score: 88, sparkline: [160, 164, 169, 172, 176, 179, 181] },
  { rank: 5, name: "Apple", ticker: "AAPL", price: "$212.40", day: -0.3, week: 1.1, month: 3.2, cap: "$3.15T", score: 74, sparkline: [205, 207, 209, 211, 213, 212, 212] },
  { rank: 6, name: "Tesla", ticker: "TSLA", price: "$345.70", day: 2.2, week: 6.7, month: 14.8, cap: "$1.10T", score: 71, sparkline: [302, 310, 318, 329, 335, 341, 345] }
];

export function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";

  const decimals = value >= 1 ? 2 : 6;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1 ? 2 : 0,
    maximumFractionDigits: decimals
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

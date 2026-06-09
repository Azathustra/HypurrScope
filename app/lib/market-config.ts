type MarketApiCoin = "BTC" | "ETH" | "HYPE";

type MarketAssetConfig = {
  apiCoin: MarketApiCoin;
  displayName: string;
  shortName: string;
  bucket: string;
  thresholds: {
    largeTradeUsd: number;
    flow5mUsd: number;
    oi15mPct: number;
    oi4hPct: number;
    price15mPct: number;
    fundingPct: number;
    minDepthUsd: number;
  };
};

export const MARKET_ASSET_CONFIG: MarketAssetConfig[] = [
  {
    apiCoin: "BTC",
    displayName: "BTC",
    shortName: "BTC",
    bucket: "Major",
    thresholds: {
      largeTradeUsd: 1_000_000,
      flow5mUsd: 10_000_000,
      oi15mPct: 0.8,
      oi4hPct: 3,
      price15mPct: 0.25,
      fundingPct: 0.006,
      minDepthUsd: 5_000_000,
    },
  },
  {
    apiCoin: "ETH",
    displayName: "ETH",
    shortName: "ETH",
    bucket: "Large cap",
    thresholds: {
      largeTradeUsd: 500_000,
      flow5mUsd: 6_000_000,
      oi15mPct: 1.25,
      oi4hPct: 4.5,
      price15mPct: 0.3,
      fundingPct: 0.008,
      minDepthUsd: 2_000_000,
    },
  },
  {
    apiCoin: "HYPE",
    displayName: "HYPE",
    shortName: "HYPE",
    bucket: "High beta",
    thresholds: {
      largeTradeUsd: 100_000,
      flow5mUsd: 1_500_000,
      oi15mPct: 2.5,
      oi4hPct: 8,
      price15mPct: 0.6,
      fundingPct: 0.015,
      minDepthUsd: 350_000,
    },
  },
];

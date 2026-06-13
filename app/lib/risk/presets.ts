export type RiskAssetPreset = {
  asset: "BTC" | "ETH" | "HYPE";
  defaultRewardRisk: number;
  defaultStopDistancePct: number;
  minDepth10BpsUsd: number;
  maxSpreadBps: number;
  maxSlippageBps: number;
  defaultLeverage: number;
  fallbackSzDecimals: number;
  fallbackPriceDecimals: number;
};

export const RISK_ASSET_PRESETS: Record<"BTC" | "ETH" | "HYPE", RiskAssetPreset> = {
  BTC: {
    asset: "BTC",
    defaultRewardRisk: 2.0,
    defaultStopDistancePct: 0.006,
    minDepth10BpsUsd: 5_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 3,
    defaultLeverage: 3,
    fallbackSzDecimals: 5,
    fallbackPriceDecimals: 0,
  },
  ETH: {
    asset: "ETH",
    defaultRewardRisk: 2.0,
    defaultStopDistancePct: 0.008,
    minDepth10BpsUsd: 2_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 4,
    defaultLeverage: 3,
    fallbackSzDecimals: 4,
    fallbackPriceDecimals: 1,
  },
  HYPE: {
    asset: "HYPE",
    defaultRewardRisk: 2.0,
    defaultStopDistancePct: 0.02,
    minDepth10BpsUsd: 350_000,
    maxSpreadBps: 6,
    maxSlippageBps: 8,
    defaultLeverage: 3,
    fallbackSzDecimals: 2,
    fallbackPriceDecimals: 3,
  },
};

export function riskPresetFor(asset: string): RiskAssetPreset {
  return RISK_ASSET_PRESETS[(asset as "BTC" | "ETH" | "HYPE")] || RISK_ASSET_PRESETS.HYPE;
}

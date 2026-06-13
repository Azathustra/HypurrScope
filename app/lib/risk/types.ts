export type TicketMode = "target-first" | "manual";
export type EntryType = "market" | "limit";
export type Side = "long" | "short";
export type ExecutionMode =
  | "simulation"
  | "preview_only"
  | "wallet_required"
  | "builder_approval_required"
  | "executable"
  | "disabled_stale_pricing"
  | "disabled_invalid_ticket";
export type DataStatus = "live" | "stale" | "unavailable";
export type CheckStatus = "ok" | "neutral" | "warning" | "danger" | "unavailable";

export type TradeWarning = {
  code: string;
  message: string;
  status: CheckStatus;
};

export type TradeError = {
  code: string;
  message: string;
};

export type AssetPrecision = {
  priceDecimals?: number | null;
  szDecimals?: number | null;
};

export type RiskCostConfig = {
  entryFeeBps: number;
  stopExitFeeBps: number;
  targetExitFeeBps: number;
  entrySlippageBps: number;
  stopSlippageBps: number;
  targetSlippageBps: number;
  builderFeeEntryBps: number;
  builderFeeExitBps: number;
};

export type MarketExecutionContext = {
  markPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  oraclePrice: number | null;
  pricingStatus: DataStatus;
  orderBookStatus: DataStatus;
  precision: AssetPrecision | null;
};

export type RiskTicketInput = {
  asset: string;
  side: Side | null;
  ticketMode: TicketMode;
  entryType: EntryType;
  entryPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  maxTotalRiskUsd: number | null;
  desiredRewardRisk: number;
  leverage: number;
  marginMode: "isolated" | "cross";
  accountEquityUsd: number | null;
};

export type RiskTicketOutput = {
  effectiveEntryPrice: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
  rewardDistance: number | null;
  riskDistance: number | null;
  positionSizeAssetRaw: number | null;
  positionSizeAssetRounded: number | null;
  positionSizeUsd: number | null;
  estimatedGrossProfitUsd: number | null;
  estimatedNetProfitUsd: number | null;
  estimatedLossBeforeCostsUsd: number | null;
  estimatedTotalLossAtStopUsd: number | null;
  estimatedEntryFeesUsd: number | null;
  estimatedExitFeesAtStopUsd: number | null;
  estimatedExitFeesAtTargetUsd: number | null;
  estimatedEntrySlippageUsd: number | null;
  estimatedStopSlippageUsd: number | null;
  estimatedTargetSlippageUsd: number | null;
  estimatedBuilderFeeEntryUsd: number | null;
  estimatedBuilderFeeExitUsd: number | null;
  rewardRiskGross: number | null;
  rewardRiskNet: number | null;
  estimatedLiquidationPrice: number | null;
  liquidationDistancePct: number | null;
  requiredMarginUsd: number | null;
  executionMode: ExecutionMode;
  precisionAvailable: boolean;
  warnings: TradeWarning[];
  errors: TradeError[];
};

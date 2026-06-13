import { riskPresetFor } from "./presets";
import type { MarketExecutionContext, RiskCostConfig, RiskTicketInput, RiskTicketOutput, Side, TradeError, TradeWarning } from "./types";

const DEFAULT_COSTS: RiskCostConfig = {
  entryFeeBps: 4.5,
  stopExitFeeBps: 4.5,
  targetExitFeeBps: 4.5,
  entrySlippageBps: 0,
  stopSlippageBps: 0,
  targetSlippageBps: 0,
  builderFeeEntryBps: 0,
  builderFeeExitBps: 0,
};

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function roundDown(value: number, decimals: number) {
  const factor = 10 ** Math.max(0, decimals);
  return Math.floor(value * factor) / factor;
}

export function roundPrice(value: number, decimals: number) {
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(value * factor) / factor;
}

function sideSign(side: Side) {
  return side === "long" ? 1 : -1;
}

function estimateLiquidation(input: RiskTicketInput, entry: number | null) {
  if (!input.side || !isPositive(entry) || !isPositive(input.leverage)) return null;
  const buffer = 1 / input.leverage;
  return input.side === "long" ? entry * (1 - buffer) : entry * (1 + buffer);
}

function liquidationDistancePct(input: RiskTicketInput, entry: number | null, stop: number | null, liq: number | null) {
  if (!input.side || !isPositive(entry) || !isPositive(stop) || !isPositive(liq)) return null;
  if (input.side === "long") return ((stop - liq) / entry) * 100;
  return ((liq - stop) / entry) * 100;
}

function marketEntryPrice(input: RiskTicketInput, context: MarketExecutionContext, costs: RiskCostConfig, warnings: TradeWarning[]) {
  if (input.entryType === "limit") return input.entryPrice;
  if (!input.side) return null;

  if (input.side === "long" && isPositive(context.bestAsk)) {
    return context.bestAsk * (1 + costs.entrySlippageBps / 10_000);
  }
  if (input.side === "short" && isPositive(context.bestBid)) {
    return context.bestBid * (1 - costs.entrySlippageBps / 10_000);
  }

  if (isPositive(context.markPrice)) {
    warnings.push({
      code: "ORDER_BOOK_UNAVAILABLE",
      status: "warning",
      message: "Order book connecting - mark price is used for simulation only.",
    });
    return context.markPrice;
  }

  return null;
}

function deriveStop(input: RiskTicketInput, entry: number | null, target: number | null, errors: TradeError[]) {
  if (input.ticketMode === "manual") return input.stopLoss;
  if (!input.side || !isPositive(entry) || !isPositive(target) || !isPositive(input.desiredRewardRisk)) return null;

  if (input.side === "long") {
    const rewardDistance = target - entry;
    if (rewardDistance <= 0) {
      errors.push({ code: "INVALID_TARGET", message: "For a long, target must be above entry." });
      return null;
    }
    return entry - rewardDistance / input.desiredRewardRisk;
  }

  const rewardDistance = entry - target;
  if (rewardDistance <= 0) {
    errors.push({ code: "INVALID_TARGET", message: "For a short, target must be below entry." });
    return null;
  }
  return entry + rewardDistance / input.desiredRewardRisk;
}

function validateDirection(input: RiskTicketInput, entry: number | null, stop: number | null, target: number | null, errors: TradeError[]) {
  if (!input.side) errors.push({ code: "SIDE_REQUIRED", message: "Choose Long or Short before previewing the ticket." });
  if (!isPositive(entry)) errors.push({ code: "ENTRY_REQUIRED", message: "Entry price is unavailable." });
  if (!isPositive(stop)) errors.push({ code: "STOP_REQUIRED", message: "Stop loss is unavailable." });
  if (!isPositive(target)) errors.push({ code: "TARGET_REQUIRED", message: "Target price is unavailable." });
  if (!isPositive(input.maxTotalRiskUsd)) errors.push({ code: "RISK_REQUIRED", message: "Max total risk must be greater than 0." });
  if (!isPositive(input.leverage)) errors.push({ code: "LEVERAGE_REQUIRED", message: "Leverage must be greater than 0." });
  if (!input.side || !isPositive(entry) || !isPositive(stop) || !isPositive(target)) return;

  if (input.side === "long" && stop >= entry) errors.push({ code: "INVALID_STOP", message: "For a long, stop loss must be below entry." });
  if (input.side === "long" && target <= entry) errors.push({ code: "INVALID_TARGET", message: "For a long, target must be above entry." });
  if (input.side === "short" && stop <= entry) errors.push({ code: "INVALID_STOP", message: "For a short, stop loss must be above entry." });
  if (input.side === "short" && target >= entry) errors.push({ code: "INVALID_TARGET", message: "For a short, target must be below entry." });
}

function costsForSize(size: number, entry: number, stop: number, target: number, costs: RiskCostConfig) {
  return {
    estimatedEntryFeesUsd: size * entry * costs.entryFeeBps / 10_000,
    estimatedExitFeesAtStopUsd: size * stop * costs.stopExitFeeBps / 10_000,
    estimatedExitFeesAtTargetUsd: size * target * costs.targetExitFeeBps / 10_000,
    estimatedEntrySlippageUsd: size * entry * costs.entrySlippageBps / 10_000,
    estimatedStopSlippageUsd: size * stop * costs.stopSlippageBps / 10_000,
    estimatedTargetSlippageUsd: size * target * costs.targetSlippageBps / 10_000,
    estimatedBuilderFeeEntryUsd: size * entry * costs.builderFeeEntryBps / 10_000,
    estimatedBuilderFeeExitUsd: size * stop * costs.builderFeeExitBps / 10_000,
  };
}

export function calculateRiskTicket(
  input: RiskTicketInput,
  context: MarketExecutionContext,
  costConfig: Partial<RiskCostConfig> = {},
): RiskTicketOutput {
  const costs = { ...DEFAULT_COSTS, ...costConfig };
  const preset = riskPresetFor(input.asset);
  const warnings: TradeWarning[] = [];
  const errors: TradeError[] = [];
  const precision = context.precision || {};
  const szDecimals = precision.szDecimals ?? preset.fallbackSzDecimals;
  const priceDecimals = precision.priceDecimals ?? preset.fallbackPriceDecimals;
  const precisionAvailable = precision.szDecimals !== null && precision.szDecimals !== undefined;

  if (!precisionAvailable) {
    warnings.push({
      code: "PRECISION_UNAVAILABLE",
      status: "warning",
      message: "Asset precision unavailable - execution disabled.",
    });
  }
  if (context.pricingStatus !== "live") {
    warnings.push({
      code: "PRICING_NOT_LIVE",
      status: context.pricingStatus === "stale" ? "warning" : "danger",
      message: context.pricingStatus === "stale" ? "Market data updating - execution disabled." : "Market data connecting - simulation only.",
    });
  }
  if (input.marginMode === "cross") {
    warnings.push({
      code: "CROSS_MARGIN",
      status: "warning",
      message: "Cross margin liquidation can change with other positions, funding and account equity.",
    });
  }

  const entryRaw = marketEntryPrice(input, context, costs, warnings);
  const effectiveEntryPrice = isPositive(entryRaw) ? roundPrice(entryRaw, priceDecimals) : null;
  const targetPrice = isPositive(input.targetPrice) ? roundPrice(input.targetPrice, priceDecimals) : null;
  const stopLossRaw = deriveStop(input, effectiveEntryPrice, targetPrice, errors);
  const stopLoss = isPositive(stopLossRaw) ? roundPrice(stopLossRaw, priceDecimals) : null;

  validateDirection(input, effectiveEntryPrice, stopLoss, targetPrice, errors);

  const rewardDistance = input.side && isPositive(effectiveEntryPrice) && isPositive(targetPrice)
    ? Math.abs(targetPrice - effectiveEntryPrice)
    : null;
  const riskDistance = input.side && isPositive(effectiveEntryPrice) && isPositive(stopLoss)
    ? Math.abs(effectiveEntryPrice - stopLoss)
    : null;

  let positionSizeAssetRaw: number | null = null;
  let positionSizeAssetRounded: number | null = null;
  let positionSizeUsd: number | null = null;
  let estimatedLossBeforeCostsUsd: number | null = null;
  let estimatedTotalLossAtStopUsd: number | null = null;
  let estimatedGrossProfitUsd: number | null = null;
  let estimatedNetProfitUsd: number | null = null;
  let rewardRiskGross: number | null = null;
  let rewardRiskNet: number | null = null;
  let costRows = costsForSize(0, 0, 0, 0, costs);

  if (errors.length === 0 && isPositive(input.maxTotalRiskUsd) && isPositive(effectiveEntryPrice) && isPositive(stopLoss) && isPositive(targetPrice) && isPositive(riskDistance)) {
    const costPerAssetAtStop =
      riskDistance
      + effectiveEntryPrice * costs.entryFeeBps / 10_000
      + stopLoss * costs.stopExitFeeBps / 10_000
      + effectiveEntryPrice * costs.entrySlippageBps / 10_000
      + stopLoss * costs.stopSlippageBps / 10_000
      + effectiveEntryPrice * costs.builderFeeEntryBps / 10_000
      + stopLoss * costs.builderFeeExitBps / 10_000;

    positionSizeAssetRaw = input.maxTotalRiskUsd / costPerAssetAtStop;
    let rounded = precisionAvailable ? roundDown(positionSizeAssetRaw, szDecimals) : positionSizeAssetRaw;
    costRows = costsForSize(rounded, effectiveEntryPrice, stopLoss, targetPrice, costs);
    estimatedLossBeforeCostsUsd = rounded * riskDistance;
    estimatedTotalLossAtStopUsd =
      estimatedLossBeforeCostsUsd
      + costRows.estimatedEntryFeesUsd
      + costRows.estimatedExitFeesAtStopUsd
      + costRows.estimatedEntrySlippageUsd
      + costRows.estimatedStopSlippageUsd
      + costRows.estimatedBuilderFeeEntryUsd
      + costRows.estimatedBuilderFeeExitUsd;

    while (estimatedTotalLossAtStopUsd > input.maxTotalRiskUsd && rounded > 0) {
      rounded = precisionAvailable ? roundDown(rounded - 1 / (10 ** szDecimals), szDecimals) : rounded * 0.999999;
      costRows = costsForSize(rounded, effectiveEntryPrice, stopLoss, targetPrice, costs);
      estimatedLossBeforeCostsUsd = rounded * riskDistance;
      estimatedTotalLossAtStopUsd =
        estimatedLossBeforeCostsUsd
        + costRows.estimatedEntryFeesUsd
        + costRows.estimatedExitFeesAtStopUsd
        + costRows.estimatedEntrySlippageUsd
        + costRows.estimatedStopSlippageUsd
        + costRows.estimatedBuilderFeeEntryUsd
        + costRows.estimatedBuilderFeeExitUsd;
    }

    positionSizeAssetRounded = rounded;
    positionSizeUsd = rounded * effectiveEntryPrice;
    estimatedGrossProfitUsd = rounded * Math.abs(targetPrice - effectiveEntryPrice);
    estimatedNetProfitUsd =
      estimatedGrossProfitUsd
      - costRows.estimatedEntryFeesUsd
      - costRows.estimatedExitFeesAtTargetUsd
      - costRows.estimatedEntrySlippageUsd
      - costRows.estimatedTargetSlippageUsd
      - costRows.estimatedBuilderFeeEntryUsd
      - costRows.estimatedBuilderFeeExitUsd;
    rewardRiskGross = estimatedGrossProfitUsd / input.maxTotalRiskUsd;
    rewardRiskNet = estimatedTotalLossAtStopUsd > 0 ? estimatedNetProfitUsd / estimatedTotalLossAtStopUsd : null;
  }

  const estimatedLiquidationPrice = estimateLiquidation(input, effectiveEntryPrice);
  const liqDistancePct = liquidationDistancePct(input, effectiveEntryPrice, stopLoss, estimatedLiquidationPrice);
  if (liqDistancePct !== null && liqDistancePct < 0.5) {
    warnings.push({
      code: "LIQ_TOO_CLOSE",
      status: "danger",
      message: "Estimated liquidation is too close to, or beyond, the stop loss.",
    });
  }

  const requiredMarginUsd = positionSizeUsd !== null && isPositive(input.leverage) ? positionSizeUsd / input.leverage : null;
  let executionMode: RiskTicketOutput["executionMode"] = "preview_only";
  if (!input.side) executionMode = "disabled_invalid_ticket";
  else if (errors.length) executionMode = "disabled_invalid_ticket";
  else if (context.pricingStatus !== "live") executionMode = "disabled_stale_pricing";
  else executionMode = "preview_only";

  return {
    effectiveEntryPrice,
    stopLoss,
    targetPrice,
    rewardDistance,
    riskDistance,
    positionSizeAssetRaw,
    positionSizeAssetRounded,
    positionSizeUsd,
    estimatedGrossProfitUsd,
    estimatedNetProfitUsd,
    estimatedLossBeforeCostsUsd,
    estimatedTotalLossAtStopUsd,
    estimatedEntryFeesUsd: costRows.estimatedEntryFeesUsd,
    estimatedExitFeesAtStopUsd: costRows.estimatedExitFeesAtStopUsd,
    estimatedExitFeesAtTargetUsd: costRows.estimatedExitFeesAtTargetUsd,
    estimatedEntrySlippageUsd: costRows.estimatedEntrySlippageUsd,
    estimatedStopSlippageUsd: costRows.estimatedStopSlippageUsd,
    estimatedTargetSlippageUsd: costRows.estimatedTargetSlippageUsd,
    estimatedBuilderFeeEntryUsd: costRows.estimatedBuilderFeeEntryUsd,
    estimatedBuilderFeeExitUsd: costRows.estimatedBuilderFeeExitUsd,
    rewardRiskGross,
    rewardRiskNet,
    estimatedLiquidationPrice,
    liquidationDistancePct: liqDistancePct,
    requiredMarginUsd,
    executionMode,
    precisionAvailable,
    warnings,
    errors,
  };
}

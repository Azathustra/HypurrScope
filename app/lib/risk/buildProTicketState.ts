export type ProTicketValue = string | number | null;

export type ProTicketRawData = {
  tradePlan: Record<string, ProTicketValue>;
  risk: Record<string, ProTicketValue>;
  execution: Record<string, ProTicketValue>;
  market: Record<string, ProTicketValue>;
  dataQuality: Record<string, ProTicketValue>;
  advancedRawData: Record<string, ProTicketValue>;
};

export type ProTicketChecks = {
  marketSelected: boolean;
  side: "long" | "short" | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  maxRisk: number | null;
  estimatedLossAtStop: number | null;
  liquidationPrice: number | null;
  pricingAvailable: boolean;
  orderBookAvailable: boolean;
  assetPrecisionAvailable: boolean;
  tpSlAvailable: boolean;
  positionSize: number | null;
};

export type ProTicketStateInput = {
  rawData: ProTicketRawData;
  checks: ProTicketChecks;
};

export type ProTicketState = {
  rawData: ProTicketRawData;
  canPreviewOrder: boolean;
  previewUnavailableReason: string | null;
};

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function liquidationBeforeStop(checks: ProTicketChecks) {
  if (!checks.side || !isPositive(checks.stop) || !isPositive(checks.liquidationPrice)) return false;
  if (checks.side === "long") return checks.liquidationPrice >= checks.stop;
  return checks.liquidationPrice <= checks.stop;
}

export function buildProTicketState(data: ProTicketStateInput): ProTicketState {
  const checks = data.checks;
  let previewUnavailableReason: string | null = null;

  if (!checks.marketSelected) {
    previewUnavailableReason = "Order preview unavailable: no market selected.";
  } else if (!checks.side) {
    previewUnavailableReason = "Order preview unavailable: no side selected.";
  } else if (!isPositive(checks.entry)) {
    previewUnavailableReason = "Order preview unavailable: no valid entry.";
  } else if (!isPositive(checks.stop)) {
    previewUnavailableReason = "Order preview unavailable: no valid stop loss.";
  } else if (!isPositive(checks.target)) {
    previewUnavailableReason = "Order preview unavailable: no valid target.";
  } else if (checks.side === "long" && checks.stop >= checks.entry) {
    previewUnavailableReason = "Order preview unavailable: invalid stop loss.";
  } else if (checks.side === "short" && checks.stop <= checks.entry) {
    previewUnavailableReason = "Order preview unavailable: invalid stop loss.";
  } else if (checks.side === "long" && checks.target <= checks.entry) {
    previewUnavailableReason = "Order preview unavailable: invalid target.";
  } else if (checks.side === "short" && checks.target >= checks.entry) {
    previewUnavailableReason = "Order preview unavailable: invalid target.";
  } else if (!checks.pricingAvailable) {
    previewUnavailableReason = "Order preview unavailable: pricing data unavailable.";
  } else if (!checks.orderBookAvailable) {
    previewUnavailableReason = "Order preview unavailable: order book unavailable.";
  } else if (!checks.assetPrecisionAvailable) {
    previewUnavailableReason = "Order preview unavailable: asset precision unavailable.";
  } else if (!checks.tpSlAvailable) {
    previewUnavailableReason = "Order preview unavailable: TP/SL cannot be attached.";
  } else if (!isPositive(checks.positionSize)) {
    previewUnavailableReason = "Order preview unavailable: position size invalid.";
  } else if (isPositive(checks.estimatedLossAtStop) && isPositive(checks.maxRisk) && checks.estimatedLossAtStop > checks.maxRisk) {
    previewUnavailableReason = "Order preview unavailable: estimated loss exceeds max risk.";
  } else if (liquidationBeforeStop(checks)) {
    previewUnavailableReason = "Order preview unavailable: liquidation before stop.";
  }

  return {
    rawData: data.rawData,
    canPreviewOrder: previewUnavailableReason === null,
    previewUnavailableReason,
  };
}

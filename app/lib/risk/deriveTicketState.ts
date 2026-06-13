import type { DataStatus, EntryType, Side } from "./types";

export type TicketState =
  | "idle"
  | "missing_direction"
  | "missing_entry"
  | "missing_target"
  | "missing_risk"
  | "invalid_target"
  | "invalid_stop"
  | "computable"
  | "execution_disabled_precision"
  | "execution_disabled_stale_data"
  | "ready_for_preview"
  | "ready_for_execution";

export type TicketStateAssetMeta = {
  szDecimals: number | null;
} | null;

export type DeriveTicketStateInput = {
  side: Side | null;
  asset: string;
  entryType: EntryType;
  entryPrice: number | null;
  marketPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  targetPrice: number | null;
  stopLoss?: number | null;
  maxTotalRiskUsd: number | null;
  rewardRisk: number | null;
  leverage: number | null;
  assetMeta: TicketStateAssetMeta;
  pricingDataStatus: DataStatus;
  orderBookStatus: DataStatus;
  executionEnabled: boolean;
  builderEnabled: boolean;
  builderApproved: boolean;
};

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function effectiveEntryForTicketState(input: DeriveTicketStateInput) {
  if (input.entryType === "limit") return positive(input.entryPrice) ? input.entryPrice : null;
  if (input.side === "long" && positive(input.bestAsk)) return input.bestAsk;
  if (input.side === "short" && positive(input.bestBid)) return input.bestBid;
  return positive(input.marketPrice) ? input.marketPrice : null;
}

export function deriveTicketState(input: DeriveTicketStateInput): TicketState {
  if (!input.asset) return "idle";
  if (!input.side) return "missing_direction";

  const entry = effectiveEntryForTicketState(input);
  if (input.entryType === "limit" && !positive(input.entryPrice)) return "missing_entry";
  if (!positive(entry)) return "missing_entry";
  if (!positive(input.targetPrice)) return "missing_target";

  if (input.side === "long" && input.targetPrice <= entry) return "invalid_target";
  if (input.side === "short" && input.targetPrice >= entry) return "invalid_target";

  if (!positive(input.maxTotalRiskUsd)) return "missing_risk";
  if (!positive(input.rewardRisk)) return "missing_risk";
  if (!positive(input.leverage)) return "missing_risk";

  if (input.stopLoss !== undefined && positive(input.stopLoss)) {
    if (input.side === "long" && input.stopLoss >= entry) return "invalid_stop";
    if (input.side === "short" && input.stopLoss <= entry) return "invalid_stop";
  }

  if (input.pricingDataStatus !== "live" || input.orderBookStatus !== "live") return "execution_disabled_stale_data";
  if (!input.assetMeta || input.assetMeta.szDecimals === null || input.assetMeta.szDecimals === undefined) return "execution_disabled_precision";
  if (input.executionEnabled && (!input.builderEnabled || input.builderApproved)) return "ready_for_execution";
  return "ready_for_preview";
}

export function isTicketComputable(state: TicketState) {
  return [
    "computable",
    "execution_disabled_precision",
    "execution_disabled_stale_data",
    "ready_for_preview",
    "ready_for_execution",
  ].includes(state);
}

export function ticketStateNextAction(state: TicketState) {
  switch (state) {
    case "missing_direction":
      return "Choose Long or Short";
    case "missing_entry":
      return "Set entry price";
    case "missing_target":
    case "invalid_target":
      return "Set target price";
    case "missing_risk":
      return "Set max risk";
    case "invalid_stop":
      return "Fix stop price";
    default:
      return "Preview trade";
  }
}

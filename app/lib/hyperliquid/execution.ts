import type { DataStatus } from "../risk/types";

export type PrimaryActionInput = {
  sideSelected: boolean;
  ticketValid: boolean;
  pricingDataStatus: DataStatus;
  orderBookAvailable: boolean;
  walletConnected: boolean;
  builderEnabled: boolean;
  builderConfigValid: boolean;
  builderApproved: boolean;
  realExecutionEnabled: boolean;
  executionInProgress: boolean;
};

export type PrimaryAction =
  | "choose_side"
  | "fix_ticket"
  | "refresh_data"
  | "preview"
  | "copy_ticket"
  | "approve_builder"
  | "execute"
  | "submitting";

export function derivePrimaryAction(input: PrimaryActionInput): { label: string; disabled: boolean; reason: string; action: PrimaryAction; secondary?: string } {
  if (!input.sideSelected) return { label: "Choose Long or Short", disabled: true, reason: "Trade direction is required.", action: "choose_side" };
  if (!input.ticketValid) return { label: "Fix trade plan", disabled: true, reason: "Some trade plan fields need attention.", action: "fix_ticket" };
  if (input.pricingDataStatus !== "live") return { label: "Refresh market data", disabled: true, reason: "Fresh pricing is required before real execution.", action: "refresh_data" };
  if (!input.walletConnected) return { label: "Preview trade", disabled: false, reason: "Preview only. Connect wallet later if execution is enabled.", action: "preview" };
  if (!input.realExecutionEnabled) return { label: "Copy trade plan", disabled: false, reason: "Real execution is disabled by feature flag.", action: "copy_ticket", secondary: "Open on Hyperliquid" };
  if (input.builderEnabled && !input.builderConfigValid) return { label: "Fix execution settings", disabled: true, reason: "Builder routing config is invalid.", action: "fix_ticket" };
  if (input.builderEnabled && !input.builderApproved) return { label: "Approve builder fee", disabled: false, reason: "Builder fee approval is required before execution.", action: "approve_builder" };
  if (input.executionInProgress) return { label: "Submitting...", disabled: true, reason: "Order submission in progress.", action: "submitting" };
  return { label: "Execute on Hyperliquid", disabled: false, reason: "Ticket is valid and execution is enabled.", action: "execute" };
}

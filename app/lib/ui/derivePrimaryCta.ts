import type { TicketState } from "../risk/deriveTicketState";

export type PrimaryCtaAction =
  | "none"
  | "preview"
  | "copy"
  | "approve_builder"
  | "execute";

export type DerivePrimaryCtaInput = {
  ticketState: TicketState;
  sideSelected: boolean;
  targetPresent: boolean;
  maxTotalRiskPresent: boolean;
  ticketInvalid: boolean;
  realExecutionEnabled: boolean;
  walletConnected: boolean;
  builderEnabled: boolean;
  builderApproved: boolean;
};

export type PrimaryCta = {
  label: string;
  disabled: boolean;
  action: PrimaryCtaAction;
};

export function derivePrimaryCta(input: DerivePrimaryCtaInput): PrimaryCta {
  if (!input.sideSelected || input.ticketState === "missing_direction") {
    return { label: "Choose Long or Short", disabled: true, action: "none" };
  }
  if (!input.targetPresent || input.ticketState === "missing_target") {
    return { label: "Set target price", disabled: true, action: "none" };
  }
  if (!input.maxTotalRiskPresent || input.ticketState === "missing_risk") {
    return { label: "Set max risk", disabled: true, action: "none" };
  }
  if (input.ticketInvalid || input.ticketState === "invalid_target" || input.ticketState === "invalid_stop" || input.ticketState === "missing_entry") {
    return { label: "Fix trade plan", disabled: true, action: "none" };
  }
  if (input.realExecutionEnabled && input.builderEnabled && !input.builderApproved) {
    return { label: "Approve builder fee", disabled: false, action: "approve_builder" };
  }
  if (input.realExecutionEnabled && input.walletConnected) {
    return { label: "Execute on Hyperliquid", disabled: false, action: "execute" };
  }
  if (input.realExecutionEnabled && !input.walletConnected) {
    return { label: "Preview trade", disabled: false, action: "preview" };
  }
  return { label: "Copy trade plan", disabled: false, action: "copy" };
}

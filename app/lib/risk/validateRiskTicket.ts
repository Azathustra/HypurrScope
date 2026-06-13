import type { RiskTicketInput, RiskTicketOutput, TradeError, TradeWarning } from "./types";

export function validateRiskTicketInput(input: RiskTicketInput): TradeError[] {
  const errors: TradeError[] = [];
  if (!input.side) errors.push({ code: "SIDE_REQUIRED", message: "Choose Long or Short before previewing the ticket." });
  if (!input.asset) errors.push({ code: "ASSET_REQUIRED", message: "Choose a market." });
  if (!input.maxTotalRiskUsd || input.maxTotalRiskUsd <= 0) errors.push({ code: "RISK_REQUIRED", message: "Max total risk must be greater than 0." });
  if (!input.leverage || input.leverage <= 0) errors.push({ code: "LEVERAGE_REQUIRED", message: "Leverage must be greater than 0." });
  if (input.entryType === "limit" && (!input.entryPrice || input.entryPrice <= 0)) errors.push({ code: "ENTRY_REQUIRED", message: "Limit entry price is required." });
  if (!input.targetPrice || input.targetPrice <= 0) errors.push({ code: "TARGET_REQUIRED", message: "Target price is required." });
  if (input.ticketMode === "manual" && (!input.stopLoss || input.stopLoss <= 0)) errors.push({ code: "STOP_REQUIRED", message: "Stop loss is required in manual mode." });
  return errors;
}

export function criticalWarnings(output: RiskTicketOutput): TradeWarning[] {
  return output.warnings.filter((warning) => warning.status === "danger" || warning.status === "warning");
}

export function isTicketExecutable(output: RiskTicketOutput) {
  return output.errors.length === 0 && output.executionMode === "executable" && criticalWarnings(output).every((warning) => warning.status !== "danger");
}

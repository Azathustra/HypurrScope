import type { RiskTicketInput, RiskTicketOutput } from "./types";

function usd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 2 : 4 })}`;
}

export function formatRiskTicket(input: RiskTicketInput, output: RiskTicketOutput) {
  const side = input.side ? input.side.toUpperCase() : "NO SIDE";
  return [
    "HypurrScope Risk Ticket",
    `Asset: ${input.asset}`,
    `Side: ${side}`,
    `Mode: ${input.ticketMode}`,
    `Entry type: ${input.entryType}`,
    `Effective entry: ${usd(output.effectiveEntryPrice)}`,
    `Stop loss: ${usd(output.stopLoss)}`,
    `Target: ${usd(output.targetPrice)}`,
    `Max total risk: ${usd(input.maxTotalRiskUsd)}`,
    `Estimated total loss at stop: ${usd(output.estimatedTotalLossAtStopUsd)}`,
    `Position size USD: ${usd(output.positionSizeUsd)}`,
    `Position size asset: ${output.positionSizeAssetRounded ?? "Unavailable"}`,
    `Gross R/R: ${output.rewardRiskGross === null ? "Unavailable" : output.rewardRiskGross.toFixed(2)}`,
    `Net R/R: ${output.rewardRiskNet === null ? "Unavailable" : output.rewardRiskNet.toFixed(2)}`,
    `Estimated liquidation: ${usd(output.estimatedLiquidationPrice)}`,
    "TP/SL trigger on mark price. Market TP/SL may slip. Verify TP/SL on Hyperliquid before confirming.",
  ].join("\n");
}

export type BeginnerVerdict =
  | "no_setup"
  | "blocked"
  | "wait"
  | "risky"
  | "setup_validated";

export type BeginnerReason = {
  id: string;
  label: string;
  value: string;
  rule: string;
  status: "ok" | "warning" | "danger" | "missing";
};

export type SuggestedSetup = {
  market: string;
  side: "long" | "short";
  entry: number;
  stop: number;
  target: number;
  positionSize: number;
  maxRisk: number;
  estimatedLoss: number;
  estimatedProfit: number;
  netRewardRisk: number;
  liquidationPrice: number | null;
  fees: number;
  slippage: number;
};

export type BeginnerPrimaryButton =
  | "choose_market"
  | "refresh_data"
  | "fix_levels"
  | "auto_fix_size"
  | "lower_leverage"
  | "wait_for_confirmation"
  | "set_alert"
  | "reduce_size"
  | "switch_to_limit"
  | "accept_setup"
  | null;

export type BeginnerTradeDecision = {
  verdict: BeginnerVerdict;
  setup: SuggestedSetup | null;
  title: string;
  summary: string;
  reasons: BeginnerReason[];
  primaryButton: BeginnerPrimaryButton;
  canAcceptSetup: boolean;
  canPreviewOrder: boolean;
};

export type BeginnerTradeDecisionInput = {
  market: string | null;
  side: "long" | "short" | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  positionSize: number | null;
  positionSizeUsd: number | null;
  maxRisk: number | null;
  estimatedLoss: number | null;
  estimatedProfit: number | null;
  netRewardRisk: number | null;
  liquidationPrice: number | null;
  fees: number | null;
  slippageBps: number | null;
  spreadBps: number | null;
  orderBookDepthUsd: number | null;
  leverage: number | null;
  marginMode: string;
  fundingPct: number | null;
  openInterestUsd: number | null;
  volume24hUsd: number | null;
  price15mPct: number | null;
  price1hPct: number | null;
  cvd5m: number | null;
  netFlow5m: number | null;
  dataFresh: boolean;
  assetPrecisionAvailable: boolean;
  tpSlAvailable: boolean;
  orderType: "market" | "limit";
  maxSpreadBps: number;
  maxSlippageBps: number;
  minDepthUsd: number;
  minNetRewardRisk: number;
};

const NO_SETUP_SUMMARY = "Aucun setup propose pour le moment. Les donnees necessaires ne sont pas suffisantes.";
const BLOCKED_SUMMARY = "Setup bloque. Ce trade ne peut pas etre prepare de maniere securisee.";
const WAIT_SUMMARY = "Aucun setup propose maintenant. Le trade est calculable, mais la confirmation marche est insuffisante.";
const RISKY_SUMMARY = "Setup non propose. Les conditions d'execution ou de risque ne sont pas assez propres pour le mode Debutant.";
const VALIDATED_SUMMARY = "Setup valide. Les conditions de risque, d'execution et de marche sont alignees.";

function isPositive(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatNumber(value: number | null, suffix = "") {
  if (!Number.isFinite(value as number)) return "missing";
  const numberValue = value as number;
  if (Math.abs(numberValue) >= 1000) return `${numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  return `${numberValue.toFixed(4).replace(/\.?0+$/, "")}${suffix}`;
}

function reason(id: string, label: string, value: string, rule: string, status: BeginnerReason["status"]): BeginnerReason {
  return { id, label, value, rule, status };
}

function tradeDirectionOk(input: BeginnerTradeDecisionInput) {
  if (!input.side || !isPositive(input.entry) || !isPositive(input.stop) || !isPositive(input.target)) return false;
  if (input.side === "long") return input.stop < input.entry && input.target > input.entry;
  return input.stop > input.entry && input.target < input.entry;
}

function liquidationBeyondStop(input: BeginnerTradeDecisionInput) {
  if (!input.side || !isPositive(input.entry) || !isPositive(input.stop) || !isPositive(input.liquidationPrice)) return false;
  const riskDistance = Math.abs(input.entry - input.stop);
  if (riskDistance <= 0) return false;
  const buffer = input.side === "long" ? input.stop - input.liquidationPrice : input.liquidationPrice - input.stop;
  return buffer / riskDistance > 0.35;
}

function marketConfirmation(input: BeginnerTradeDecisionInput) {
  const reasons: BeginnerReason[] = [];
  let supportive = true;
  let missing = false;

  if (input.price15mPct === null || input.price1hPct === null) {
    missing = true;
    reasons.push(reason("momentum_missing", "Momentum", "missing", "15m and 1h momentum should be readable.", "missing"));
  } else if (input.side === "long") {
    const ok = input.price15mPct > -0.5 && input.price1hPct > -1;
    supportive = supportive && ok;
    reasons.push(reason("momentum", "Momentum", `${formatNumber(input.price15mPct, "%")} 15m / ${formatNumber(input.price1hPct, "%")} 1h`, "Long setup should not fight strong downside momentum.", ok ? "ok" : "warning"));
  } else if (input.side === "short") {
    const ok = input.price15mPct < 0.5 && input.price1hPct < 1;
    supportive = supportive && ok;
    reasons.push(reason("momentum", "Momentum", `${formatNumber(input.price15mPct, "%")} 15m / ${formatNumber(input.price1hPct, "%")} 1h`, "Short setup should not fight strong upside momentum.", ok ? "ok" : "warning"));
  }

  if (input.cvd5m === null || input.netFlow5m === null) {
    missing = true;
    reasons.push(reason("flow_missing", "Flow / CVD", "collecting", "Flow should confirm or stay neutral before beginner validation.", "missing"));
  } else if (input.side === "long") {
    const ok = input.cvd5m >= 0 && input.netFlow5m >= 0;
    supportive = supportive && ok;
    reasons.push(reason("flow", "Flow / CVD", `${formatNumber(input.netFlow5m)} net / CVD ${formatNumber(input.cvd5m)}`, "Long setup needs neutral-positive buyer pressure.", ok ? "ok" : "warning"));
  } else if (input.side === "short") {
    const ok = input.cvd5m <= 0 && input.netFlow5m <= 0;
    supportive = supportive && ok;
    reasons.push(reason("flow", "Flow / CVD", `${formatNumber(input.netFlow5m)} net / CVD ${formatNumber(input.cvd5m)}`, "Short setup needs neutral-negative seller pressure.", ok ? "ok" : "warning"));
  }

  if (input.fundingPct !== null && input.side === "long" && input.fundingPct > 0.03) {
    supportive = false;
    reasons.push(reason("funding_against_long", "Funding", `${formatNumber(input.fundingPct, "%")}`, "Funding should not be extreme against long entries.", "warning"));
  }
  if (input.fundingPct !== null && input.side === "short" && input.fundingPct < -0.03) {
    supportive = false;
    reasons.push(reason("funding_against_short", "Funding", `${formatNumber(input.fundingPct, "%")}`, "Funding should not be extreme against short entries.", "warning"));
  }

  return { supportive, missing, reasons };
}

function topReasons(reasons: BeginnerReason[], limit: number) {
  const score = { danger: 0, missing: 1, warning: 2, ok: 3 };
  return [...reasons].sort((a, b) => score[a.status] - score[b.status]).slice(0, limit);
}

export function buildBeginnerTradeDecision(input: BeginnerTradeDecisionInput): BeginnerTradeDecision {
  const reasons: BeginnerReason[] = [];
  const noSetupReasons: BeginnerReason[] = [];
  const blockedReasons: BeginnerReason[] = [];
  const riskyReasons: BeginnerReason[] = [];

  if (!input.market) noSetupReasons.push(reason("market_missing", "Market", "missing", "Choose BTC, ETH or HYPE.", "missing"));
  if (!input.side) noSetupReasons.push(reason("side_missing", "Direction", "missing", "Choose Long or Short before proposing a setup.", "missing"));
  if (!isPositive(input.entry)) noSetupReasons.push(reason("entry_missing", "Entry", "missing", "Live entry price is required.", "missing"));
  if (!input.dataFresh) noSetupReasons.push(reason("data_stale", "Data freshness", "stale", "Market data must be fresh.", "missing"));
  if (input.spreadBps === null || input.orderBookDepthUsd === null) noSetupReasons.push(reason("book_missing", "Order book", "missing", "Spread and depth must be available.", "missing"));
  if (!input.assetPrecisionAvailable) noSetupReasons.push(reason("precision_missing", "Asset precision", "missing", "Asset precision is required before beginner validation.", "missing"));

  if (noSetupReasons.length) {
    return {
      verdict: "no_setup",
      setup: null,
      title: "Aucun setup",
      summary: NO_SETUP_SUMMARY,
      reasons: topReasons(noSetupReasons, 5),
      primaryButton: input.market ? "refresh_data" : "choose_market",
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  if (!isPositive(input.stop)) blockedReasons.push(reason("stop_missing", "Stop loss", "missing", "A protected setup needs a stop loss.", "danger"));
  if (!isPositive(input.target)) blockedReasons.push(reason("target_missing", "Take profit", "missing", "A protected setup needs a take profit.", "danger"));
  if (!tradeDirectionOk(input)) blockedReasons.push(reason("invalid_levels", "Levels", "invalid", "Stop and target must be on the correct side of entry.", "danger"));
  if (!isPositive(input.maxRisk)) blockedReasons.push(reason("risk_missing", "Max risk", "missing", "Set the maximum loss you accept.", "danger"));
  if (!isPositive(input.positionSize)) blockedReasons.push(reason("size_missing", "Position size", "invalid", "Position size must be valid.", "danger"));
  if (!input.tpSlAvailable) blockedReasons.push(reason("tpsl_missing", "TP/SL", "not attachable", "Beginner mode requires stop loss and take profit protection.", "danger"));
  if (isPositive(input.estimatedLoss) && isPositive(input.maxRisk) && input.estimatedLoss > input.maxRisk * 1.005) {
    blockedReasons.push(reason("loss_above_risk", "Loss at stop", formatNumber(input.estimatedLoss), `Must stay <= ${formatNumber(input.maxRisk)} max risk.`, "danger"));
  }
  if (!liquidationBeyondStop(input)) {
    blockedReasons.push(reason("liquidation_too_close", "Liquidation", formatNumber(input.liquidationPrice), "Liquidation must stay safely beyond the stop.", "danger"));
  }
  if (input.slippageBps !== null && input.slippageBps > input.maxSlippageBps * 1.5) {
    blockedReasons.push(reason("slippage_blocking", "Slippage", `${formatNumber(input.slippageBps)} bps`, `Must stay below ${formatNumber(input.maxSlippageBps * 1.5)} bps.`, "danger"));
  }

  if (blockedReasons.length) {
    const button =
      blockedReasons.some((row) => row.id.includes("liquidation")) ? "lower_leverage" :
      blockedReasons.some((row) => row.id.includes("risk") || row.id.includes("size")) ? "auto_fix_size" :
      "fix_levels";
    return {
      verdict: "blocked",
      setup: null,
      title: "Setup bloque",
      summary: BLOCKED_SUMMARY,
      reasons: topReasons(blockedReasons, 3),
      primaryButton: button,
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  reasons.push(reason("risk_limit", "Risk within limit", `${formatNumber(input.estimatedLoss)} / ${formatNumber(input.maxRisk)}`, "Estimated loss at stop must stay within user max risk.", "ok"));
  reasons.push(reason("liquidation_safe", "Liquidation", formatNumber(input.liquidationPrice), "Liquidation is beyond the stop with buffer.", "ok"));

  const liquidityUsagePct = isPositive(input.positionSizeUsd) && isPositive(input.orderBookDepthUsd)
    ? (input.positionSizeUsd / input.orderBookDepthUsd) * 100
    : null;
  if (liquidityUsagePct === null || liquidityUsagePct > 5) {
    riskyReasons.push(reason("liquidity_thin", "Liquidity", liquidityUsagePct === null ? "missing" : `${formatNumber(liquidityUsagePct, "%")} of +/-10 bps depth`, "Position should use <= 5% of near-book depth.", liquidityUsagePct === null ? "missing" : "warning"));
  } else {
    reasons.push(reason("liquidity_ok", "Liquidity", `${formatNumber(liquidityUsagePct, "%")} of +/-10 bps depth`, "Liquidity is enough for this position size.", "ok"));
  }

  if (input.spreadBps !== null && input.spreadBps > input.maxSpreadBps) {
    riskyReasons.push(reason("spread_wide", "Spread", `${formatNumber(input.spreadBps)} bps`, `Spread should stay <= ${formatNumber(input.maxSpreadBps)} bps.`, "warning"));
  } else {
    reasons.push(reason("spread_ok", "Spread", `${formatNumber(input.spreadBps)} bps`, "Spread is acceptable.", "ok"));
  }

  if (input.slippageBps !== null && input.slippageBps > input.maxSlippageBps) {
    riskyReasons.push(reason("slippage_elevated", "Slippage", `${formatNumber(input.slippageBps)} bps`, `Slippage should stay <= ${formatNumber(input.maxSlippageBps)} bps.`, "warning"));
  }

  if (input.netRewardRisk === null || input.netRewardRisk < input.minNetRewardRisk) {
    riskyReasons.push(reason("rr_too_low", "Net reward/risk", input.netRewardRisk === null ? "missing" : formatNumber(input.netRewardRisk), `Net reward/risk should be >= ${formatNumber(input.minNetRewardRisk)}.`, input.netRewardRisk === null ? "missing" : "warning"));
  } else {
    reasons.push(reason("rr_ok", "Net reward/risk", formatNumber(input.netRewardRisk), "Net reward/risk is above beginner minimum.", "ok"));
  }

  if (input.fees !== null && input.estimatedProfit !== null && input.estimatedProfit > 0 && input.fees / input.estimatedProfit > 0.2) {
    riskyReasons.push(reason("fees_high", "Fees", `${formatNumber(input.fees)} fees`, "Fees should not consume too much expected profit.", "warning"));
  }

  if (riskyReasons.length) {
    const button = riskyReasons.some((row) => row.id.includes("liquidity")) ? "reduce_size" : input.orderType === "market" ? "switch_to_limit" : "reduce_size";
    return {
      verdict: "risky",
      setup: null,
      title: "Setup risque",
      summary: RISKY_SUMMARY,
      reasons: topReasons([...riskyReasons, ...reasons], 5),
      primaryButton: button,
      canAcceptSetup: false,
      canPreviewOrder: true,
    };
  }

  const confirmation = marketConfirmation(input);
  if (confirmation.missing || !confirmation.supportive) {
    return {
      verdict: "wait",
      setup: null,
      title: "Attendre confirmation",
      summary: WAIT_SUMMARY,
      reasons: topReasons([...confirmation.reasons, ...reasons], 5),
      primaryButton: confirmation.missing ? "wait_for_confirmation" : "set_alert",
      canAcceptSetup: false,
      canPreviewOrder: true,
    };
  }

  const setup: SuggestedSetup = {
    market: input.market as string,
    side: input.side as "long" | "short",
    entry: input.entry as number,
    stop: input.stop as number,
    target: input.target as number,
    positionSize: input.positionSize as number,
    maxRisk: input.maxRisk as number,
    estimatedLoss: input.estimatedLoss as number,
    estimatedProfit: input.estimatedProfit as number,
    netRewardRisk: input.netRewardRisk as number,
    liquidationPrice: input.liquidationPrice,
    fees: input.fees ?? 0,
    slippage: input.slippageBps ?? 0,
  };

  return {
    verdict: "setup_validated",
    setup,
    title: "Setup valide",
    summary: VALIDATED_SUMMARY,
    reasons: topReasons([...reasons, ...confirmation.reasons], 5),
    primaryButton: "accept_setup",
    canAcceptSetup: true,
    canPreviewOrder: true,
  };
}

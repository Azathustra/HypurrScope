export type MarketSymbol = "BTC" | "ETH" | "HYPE";
export type Side = "long" | "short";

export type CandidateStatus =
  | "not_evaluable"
  | "weak"
  | "potential"
  | "confirmed"
  | "blocked";

export type RecommendationState =
  | "scanning"
  | "no_setup"
  | "wait"
  | "blocked"
  | "setup_proposed";

export type MetricReason = {
  id: string;
  group: "direction" | "flow" | "liquidity" | "execution" | "risk" | "data";
  label: string;
  current: string;
  required: string;
  impact: string;
  status: "pass" | "fail" | "missing" | "warning";
};

export type TradeCandidate = {
  side: Side;
  status: CandidateStatus;
  score: number;
  reasons: MetricReason[];
  blockers: MetricReason[];
};

export type SuggestedTrade = {
  market: MarketSymbol;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  positionSize: number;
  maxRiskUsd: number;
  estimatedLoss: number;
  estimatedProfit: number;
  netRewardRisk: number;
  leverage: number;
  marginMode: "isolated" | "cross";
  liquidationPrice: number | null;
  fees: number;
  slippage: number;
  orderType: "limit" | "market";
};

export type TradeRecommendationResult = {
  state: RecommendationState;
  selectedMarket: MarketSymbol;
  longCandidate: TradeCandidate;
  shortCandidate: TradeCandidate;
  recommendation: SuggestedTrade | null;
  title: string;
  summary: string;
  visibleReasons: MetricReason[];
  canAcceptSetup: boolean;
  canPreviewOrder: boolean;
};

export type EntryPreference = "safer-limit" | "market-if-strong-liquidity";

export type TradeRecommendationInput = {
  selectedMarket: MarketSymbol | null;
  price: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  price15mPct: number | null;
  price1hPct: number | null;
  oi15mPct: number | null;
  fundingPct: number | null;
  spreadBps: number | null;
  depth10BpsUsd: number | null;
  depth25BpsUsd: number | null;
  volume24hUsd: number | null;
  takerBuyRatio5m: number | null;
  takerSellRatio5m: number | null;
  netBuyFlow5m: number | null;
  netSellFlow5m: number | null;
  cvd5m: number | null;
  cvd15m: number | null;
  dataFresh: boolean;
  pricingAvailable: boolean;
  orderBookAvailable: boolean;
  assetPrecisionAvailable: boolean;
  tpSlAvailable: boolean;
  maxRiskUsd: number | null;
  targetMovePct: number | null;
  desiredRewardRisk: number | null;
  leverage: number | null;
  marginMode: "isolated" | "cross";
  entryPreference: EntryPreference;
};

export const MARKET_CONFIG: Record<MarketSymbol, {
  minDepth10BpsUsd: number;
  maxSpreadBps: number;
  maxSlippageBps: number;
  longMomentum15mThresholdPct: number;
  shortMomentum15mThresholdPct: number;
  minOi15mPct: number;
  maxBeginnerTargetMovePct: number;
  defaultTargetMovesPct: number[];
  liquidationBufferPct: number;
  minNetRewardRisk: number;
}> = {
  BTC: {
    minDepth10BpsUsd: 5_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 5,
    longMomentum15mThresholdPct: 0.25,
    shortMomentum15mThresholdPct: -0.25,
    minOi15mPct: 0.8,
    maxBeginnerTargetMovePct: 2.0,
    defaultTargetMovesPct: [0.15, 0.3, 0.6, 1.0],
    liquidationBufferPct: 0.3,
    minNetRewardRisk: 1.0,
  },
  ETH: {
    minDepth10BpsUsd: 2_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 5,
    longMomentum15mThresholdPct: 0.3,
    shortMomentum15mThresholdPct: -0.3,
    minOi15mPct: 1.25,
    maxBeginnerTargetMovePct: 3.0,
    defaultTargetMovesPct: [0.2, 0.4, 0.8, 1.5],
    liquidationBufferPct: 0.4,
    minNetRewardRisk: 1.0,
  },
  HYPE: {
    minDepth10BpsUsd: 350_000,
    maxSpreadBps: 4,
    maxSlippageBps: 8,
    longMomentum15mThresholdPct: 0.6,
    shortMomentum15mThresholdPct: -0.6,
    minOi15mPct: 2.5,
    maxBeginnerTargetMovePct: 4.0,
    defaultTargetMovesPct: [0.25, 0.5, 1.0, 2.0],
    liquidationBufferPct: 0.75,
    minNetRewardRisk: 1.0,
  },
};

const TAKER_FEE_BPS = 4.5;

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositive(value: number | null | undefined): value is number {
  return isNumber(value) && value > 0;
}

function usd(value: number | null | undefined) {
  if (!isNumber(value)) return "unavailable";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function pct(value: number | null | undefined, digits = 2) {
  if (!isNumber(value)) return "unavailable";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function reason(
  id: string,
  group: MetricReason["group"],
  label: string,
  current: string,
  required: string,
  impact: string,
  status: MetricReason["status"],
): MetricReason {
  return { id, group, label, current, required, impact, status };
}

function scoreReason(pass: boolean | null, score: number, reasons: MetricReason[], item: MetricReason) {
  reasons.push(item);
  return pass ? score : 0;
}

function candidateStatus(score: number, blockers: MetricReason[], missingFlow: boolean): CandidateStatus {
  if (blockers.length) return "blocked";
  if (missingFlow) return "not_evaluable";
  if (score >= 75) return "confirmed";
  if (score >= 55) return "potential";
  return "weak";
}

function scoreCandidate(input: TradeRecommendationInput, side: Side): TradeCandidate {
  const market = input.selectedMarket || "HYPE";
  const config = MARKET_CONFIG[market];
  const reasons: MetricReason[] = [];
  const blockers = sharedBlockers(input);
  let score = 0;

  const momentum15 =
    side === "long"
      ? isNumber(input.price15mPct) ? input.price15mPct >= config.longMomentum15mThresholdPct : null
      : isNumber(input.price15mPct) ? input.price15mPct <= config.shortMomentum15mThresholdPct : null;
  score += scoreReason(momentum15, 20, reasons, reason(
    `${side}-momentum-15m`,
    "direction",
    "15m momentum",
    pct(input.price15mPct),
    side === "long" ? `> ${pct(config.longMomentum15mThresholdPct)}` : `< ${pct(config.shortMomentum15mThresholdPct)}`,
    side === "long" ? "Le momentum court terme doit soutenir un Long." : "Le momentum court terme doit soutenir un Short.",
    momentum15 === null ? "missing" : momentum15 ? "pass" : "fail",
  ));

  const momentum1h =
    side === "long"
      ? isNumber(input.price1hPct) ? input.price1hPct > config.shortMomentum15mThresholdPct : null
      : isNumber(input.price1hPct) ? input.price1hPct < config.longMomentum15mThresholdPct : null;
  score += scoreReason(momentum1h, 10, reasons, reason(
    `${side}-momentum-1h`,
    "direction",
    "1h momentum",
    pct(input.price1hPct),
    side === "long" ? "not strongly negative" : "not strongly positive",
    "La tendance 1h ne doit pas contredire fortement la direction.",
    momentum1h === null ? "missing" : momentum1h ? "pass" : "warning",
  ));

  const oiOk = isNumber(input.oi15mPct) ? input.oi15mPct >= config.minOi15mPct : null;
  score += scoreReason(oiOk, 15, reasons, reason(
    `${side}-oi`,
    "direction",
    "OI 15m",
    pct(input.oi15mPct),
    `>= ${pct(config.minOi15mPct)}`,
    "L'open interest doit confirmer que du levier entre sur le marché.",
    oiOk === null ? "missing" : oiOk ? "pass" : "fail",
  ));

  const ratioOk =
    side === "long"
      ? isNumber(input.takerBuyRatio5m) && isNumber(input.takerSellRatio5m) ? input.takerBuyRatio5m > input.takerSellRatio5m && input.takerBuyRatio5m > 55 : null
      : isNumber(input.takerBuyRatio5m) && isNumber(input.takerSellRatio5m) ? input.takerSellRatio5m > input.takerBuyRatio5m && input.takerSellRatio5m > 55 : null;
  score += scoreReason(ratioOk, 15, reasons, reason(
    `${side}-taker-ratio`,
    "flow",
    side === "long" ? "Taker buy ratio" : "Taker sell ratio",
    side === "long" ? pct(input.takerBuyRatio5m, 1) : pct(input.takerSellRatio5m, 1),
    side === "long" ? "buy ratio > sell ratio and > 55%" : "sell ratio > buy ratio and > 55%",
    "Le flow doit confirmer la direction.",
    ratioOk === null ? "missing" : ratioOk ? "pass" : "fail",
  ));

  const netFlowOk =
    side === "long"
      ? isNumber(input.netBuyFlow5m) ? input.netBuyFlow5m > 0 : null
      : isNumber(input.netSellFlow5m) ? input.netSellFlow5m > 0 : null;
  score += scoreReason(netFlowOk, 10, reasons, reason(
    `${side}-net-flow`,
    "flow",
    side === "long" ? "Net buy flow 5m" : "Net sell flow 5m",
    side === "long" ? usd(input.netBuyFlow5m) : usd(input.netSellFlow5m),
    "> $0",
    "Le flux net doit aller dans le sens du setup.",
    netFlowOk === null ? "missing" : netFlowOk ? "pass" : "fail",
  ));

  const cvdOk =
    side === "long"
      ? isNumber(input.cvd5m) && isNumber(input.cvd15m) ? input.cvd5m > 0 && input.cvd15m >= 0 : null
      : isNumber(input.cvd5m) && isNumber(input.cvd15m) ? input.cvd5m < 0 && input.cvd15m <= 0 : null;
  score += scoreReason(cvdOk, 15, reasons, reason(
    `${side}-cvd`,
    "flow",
    "CVD 5m / 15m",
    `${usd(input.cvd5m)} / ${usd(input.cvd15m)}`,
    side === "long" ? "positive / non-negative" : "negative / non-positive",
    "Le CVD doit montrer une pression agressive alignée.",
    cvdOk === null ? "missing" : cvdOk ? "pass" : "fail",
  ));

  const fundingOk =
    side === "long"
      ? isNumber(input.fundingPct) ? input.fundingPct < 0.02 : null
      : isNumber(input.fundingPct) ? input.fundingPct > -0.02 : null;
  score += scoreReason(fundingOk, 5, reasons, reason(
    `${side}-funding`,
    "risk",
    "Funding",
    pct(input.fundingPct, 4),
    side === "long" ? "< +0.0200%" : "> -0.0200%",
    "Le funding ne doit pas être extrême contre la direction.",
    fundingOk === null ? "missing" : fundingOk ? "pass" : "warning",
  ));

  const liquidityOk = isNumber(input.depth10BpsUsd) ? input.depth10BpsUsd >= config.minDepth10BpsUsd : null;
  const spreadOk = isNumber(input.spreadBps) ? input.spreadBps <= config.maxSpreadBps : null;
  score += scoreReason(liquidityOk && spreadOk, 10, reasons, reason(
    `${side}-execution`,
    "liquidity",
    "Liquidity and spread",
    `Depth ${usd(input.depth10BpsUsd)} / spread ${isNumber(input.spreadBps) ? `${input.spreadBps.toFixed(2)} bps` : "unavailable"}`,
    `depth >= ${usd(config.minDepth10BpsUsd)} and spread <= ${config.maxSpreadBps} bps`,
    "La liquidité et le spread doivent permettre une exécution propre.",
    liquidityOk === null || spreadOk === null ? "missing" : liquidityOk && spreadOk ? "pass" : "fail",
  ));

  const missingFlow = [ratioOk, netFlowOk, cvdOk].some((value) => value === null);
  return {
    side,
    status: candidateStatus(score, blockers, missingFlow),
    score,
    reasons,
    blockers,
  };
}

function sharedBlockers(input: TradeRecommendationInput) {
  const market = input.selectedMarket;
  if (!market) {
    return [reason("market-missing", "data", "Market", "unavailable", "BTC, ETH or HYPE selected", "Aucun marché n'est sélectionné.", "missing")];
  }
  const config = MARKET_CONFIG[market];
  const blockers: MetricReason[] = [];

  if (!input.pricingAvailable || !isPositive(input.price)) {
    blockers.push(reason("price-missing", "data", "Price data", "unavailable", "fresh price available", "Les données de prix sont absentes.", "missing"));
  }
  if (!input.dataFresh) {
    blockers.push(reason("data-stale", "data", "Data freshness", "stale", "fresh", "Les données ne sont pas assez fraîches.", "fail"));
  }
  if (!input.orderBookAvailable) {
    blockers.push(reason("book-missing", "data", "Order book", "unavailable", "available", "Le carnet d'ordres est indisponible.", "missing"));
  }
  if (!input.assetPrecisionAvailable) {
    blockers.push(reason("precision-missing", "data", "Asset precision", "unavailable", "available", "La précision de l'actif est indisponible.", "missing"));
  }
  if (!input.tpSlAvailable) {
    blockers.push(reason("tpsl-missing", "risk", "TP/SL", "unavailable", "attachable", "TP/SL ne peut pas être attaché.", "missing"));
  }
  if (isNumber(input.spreadBps) && input.spreadBps > config.maxSpreadBps) {
    blockers.push(reason("spread-wide", "execution", "Spread", `${input.spreadBps.toFixed(2)} bps`, `<= ${config.maxSpreadBps} bps`, "Le spread est trop large.", "fail"));
  }
  if (isNumber(input.depth10BpsUsd) && input.depth10BpsUsd < config.minDepth10BpsUsd) {
    blockers.push(reason("depth-low", "liquidity", `${market} liquidity`, `Depth +/-10 bps = ${usd(input.depth10BpsUsd)}`, `>= ${usd(config.minDepth10BpsUsd)}`, "La liquidité est trop faible pour proposer un setup débutant.", "fail"));
  }
  const slippageBps = estimateSlippageBps(input);
  if (isNumber(slippageBps) && slippageBps > config.maxSlippageBps) {
    blockers.push(reason("slippage-high", "execution", "Estimated slippage", `${slippageBps.toFixed(2)} bps`, `<= ${config.maxSlippageBps} bps`, "Le slippage estimé est trop élevé.", "fail"));
  }
  if (isNumber(input.targetMovePct) && input.targetMovePct > config.maxBeginnerTargetMovePct) {
    blockers.push(reason("target-move-too-large", "risk", "Target move", pct(input.targetMovePct), `<= ${pct(config.maxBeginnerTargetMovePct)}`, "Le mouvement cible est trop large pour le mode Débutant.", "fail"));
  }

  return blockers;
}

function estimateSlippageBps(input: TradeRecommendationInput) {
  if (!isNumber(input.spreadBps)) return null;
  return Math.max(0.1, input.spreadBps / 2);
}

export function beginnerTargetPrice(entry: number, side: Side, targetMovePct: number) {
  return side === "long" ? entry * (1 + targetMovePct / 100) : entry * (1 - targetMovePct / 100);
}

export function beginnerStopPrice(entry: number, target: number, side: Side, desiredRewardRisk: number) {
  const targetDistance = Math.abs(target - entry);
  const stopDistance = targetDistance / desiredRewardRisk;
  return side === "long" ? entry - stopDistance : entry + stopDistance;
}

function liquidationPrice(entry: number, side: Side, leverage: number) {
  if (side === "long") return Math.max(0, entry * (1 - 1 / leverage + 0.005));
  return entry * (1 + 1 / leverage - 0.005);
}

function liquidationHasBuffer(entry: number, stop: number, liquidation: number, side: Side, market: MarketSymbol) {
  const buffer = entry * MARKET_CONFIG[market].liquidationBufferPct / 100;
  if (side === "long") return stop - liquidation >= buffer;
  return liquidation - stop >= buffer;
}

export function buildSuggestedTrade(input: TradeRecommendationInput, side: Side): SuggestedTrade | null {
  const market = input.selectedMarket;
  if (!market || !isPositive(input.price) || !isPositive(input.maxRiskUsd) || !isPositive(input.targetMovePct) || !isPositive(input.desiredRewardRisk) || !isPositive(input.leverage)) return null;
  const entry =
    side === "long"
      ? isPositive(input.bestAsk) ? input.bestAsk : input.price
      : isPositive(input.bestBid) ? input.bestBid : input.price;
  const target = beginnerTargetPrice(entry, side, input.targetMovePct);
  const stop = beginnerStopPrice(entry, target, side, input.desiredRewardRisk);
  const slippageBps = estimateSlippageBps(input) ?? MARKET_CONFIG[market].maxSlippageBps;
  const riskPerUnit = Math.abs(entry - stop);
  const entryFeePerUnit = entry * TAKER_FEE_BPS / 10_000;
  const stopFeePerUnit = stop * TAKER_FEE_BPS / 10_000;
  const entrySlipPerUnit = entry * slippageBps / 10_000;
  const stopSlipPerUnit = stop * slippageBps / 10_000;
  const totalRiskPerUnit = riskPerUnit + entryFeePerUnit + stopFeePerUnit + entrySlipPerUnit + stopSlipPerUnit;
  if (!isPositive(totalRiskPerUnit)) return null;

  let positionSize = input.maxRiskUsd / totalRiskPerUnit;
  let fees = positionSize * (entryFeePerUnit + stopFeePerUnit);
  let slippage = positionSize * (entrySlipPerUnit + stopSlipPerUnit);
  let estimatedLoss = positionSize * riskPerUnit + fees + slippage;
  while (estimatedLoss > input.maxRiskUsd && positionSize > 0) {
    positionSize *= 0.999;
    fees = positionSize * (entryFeePerUnit + stopFeePerUnit);
    slippage = positionSize * (entrySlipPerUnit + stopSlipPerUnit);
    estimatedLoss = positionSize * riskPerUnit + fees + slippage;
  }
  if (!isPositive(positionSize) || estimatedLoss > input.maxRiskUsd) return null;

  const targetFeePerUnit = target * TAKER_FEE_BPS / 10_000;
  const targetSlipPerUnit = target * slippageBps / 10_000;
  const estimatedProfit = positionSize * Math.abs(target - entry) - positionSize * (entryFeePerUnit + targetFeePerUnit + entrySlipPerUnit + targetSlipPerUnit);
  const netRewardRisk = estimatedLoss > 0 ? estimatedProfit / estimatedLoss : 0;
  const liq = liquidationPrice(entry, side, input.leverage);
  const orderType: SuggestedTrade["orderType"] = input.entryPreference === "market-if-strong-liquidity" && input.depth10BpsUsd !== null && input.depth10BpsUsd >= MARKET_CONFIG[market].minDepth10BpsUsd * 2 ? "market" : "limit";

  return {
    market,
    side,
    entry,
    stop,
    target,
    positionSize,
    maxRiskUsd: input.maxRiskUsd,
    estimatedLoss,
    estimatedProfit,
    netRewardRisk,
    leverage: input.leverage,
    marginMode: input.marginMode,
    liquidationPrice: liq,
    fees,
    slippage,
    orderType,
  };
}

function tradeBlockers(input: TradeRecommendationInput, trade: SuggestedTrade | null) {
  const market = input.selectedMarket;
  if (!market || !trade) return [reason("trade-missing", "risk", "Trade plan", "unavailable", "computed", "Le plan ne peut pas être calculé.", "missing")];
  const blockers: MetricReason[] = [];
  if (trade.side === "long" && !(trade.stop < trade.entry && trade.entry < trade.target)) {
    blockers.push(reason("long-structure", "risk", "Price structure", "invalid", "stop < entry < target", "La structure des prix est invalide.", "fail"));
  }
  if (trade.side === "short" && !(trade.target < trade.entry && trade.entry < trade.stop)) {
    blockers.push(reason("short-structure", "risk", "Price structure", "invalid", "target < entry < stop", "La structure des prix est invalide.", "fail"));
  }
  if (trade.estimatedLoss > trade.maxRiskUsd) {
    blockers.push(reason("loss-above-risk", "risk", "Estimated loss", usd(trade.estimatedLoss), `<= ${usd(trade.maxRiskUsd)}`, "La perte estimée dépasse le risque maximum.", "fail"));
  }
  if (trade.liquidationPrice !== null && !liquidationHasBuffer(trade.entry, trade.stop, trade.liquidationPrice, trade.side, market)) {
    blockers.push(reason("liq-too-close", "risk", "Liquidation", usd(trade.liquidationPrice), "safely beyond stop", "Liquidation too close to stop.", "fail"));
  }
  if (trade.netRewardRisk < MARKET_CONFIG[market].minNetRewardRisk) {
    blockers.push(reason("net-rr-low", "risk", "Net reward/risk", `${trade.netRewardRisk.toFixed(2)}R`, `>= ${MARKET_CONFIG[market].minNetRewardRisk.toFixed(2)}R`, "Le reward/risk net est trop faible après coûts.", "fail"));
  }
  return blockers;
}

function visibleFrom(candidates: TradeCandidate[], extra: MetricReason[] = []) {
  const rows = extra.concat(...candidates.map((candidate) => candidate.blockers.concat(candidate.reasons)));
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return row.status !== "pass";
  }).slice(0, 5);
}

export function buildTradeRecommendation(input: TradeRecommendationInput): TradeRecommendationResult {
  const selectedMarket = input.selectedMarket || "HYPE";
  const longCandidate = scoreCandidate({ ...input, selectedMarket }, "long");
  const shortCandidate = scoreCandidate({ ...input, selectedMarket }, "short");
  const shared = sharedBlockers({ ...input, selectedMarket });
  const longTrade = buildSuggestedTrade({ ...input, selectedMarket }, "long");
  const shortTrade = buildSuggestedTrade({ ...input, selectedMarket }, "short");
  const best = longCandidate.score >= shortCandidate.score ? longCandidate : shortCandidate;
  const other = best.side === "long" ? shortCandidate : longCandidate;
  const trade = best.side === "long" ? longTrade : shortTrade;
  const executionBlockers = tradeBlockers({ ...input, selectedMarket }, trade);
  const clearEdge = best.score - other.score >= 15;
  const bestConfirmed = best.score >= 75;
  const flowMissing = best.reasons.some((row) => row.group === "flow" && row.status === "missing");

  if (!input.pricingAvailable || !isPositive(input.price)) {
    return {
      state: "scanning",
      selectedMarket,
      longCandidate,
      shortCandidate,
      recommendation: null,
      title: "Analyse du marché en cours.",
      summary: "HypurrScope attend les données nécessaires avant de proposer un setup.",
      visibleReasons: visibleFrom([longCandidate, shortCandidate], shared),
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  if (shared.length || executionBlockers.length) {
    return {
      state: "blocked",
      selectedMarket,
      longCandidate,
      shortCandidate,
      recommendation: null,
      title: "Setup bloqué.",
      summary: "Ce trade ne peut pas être proposé de manière sécurisée.",
      visibleReasons: visibleFrom([best, other], shared.concat(executionBlockers)),
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  if (flowMissing || best.status === "not_evaluable") {
    return {
      state: best.score >= 45 ? "wait" : "no_setup",
      selectedMarket,
      longCandidate,
      shortCandidate,
      recommendation: null,
      title: best.score >= 45 ? "Signal potentiel détecté, mais pas encore confirmé." : "Aucun setup proposé maintenant.",
      summary: best.score >= 45 ? "HypurrScope attend plus de confirmation avant de proposer ce setup." : "Les données actuelles ne donnent pas un signal Long ou Short assez propre pour le mode Débutant.",
      visibleReasons: visibleFrom([best, other], [reason("flow-unavailable", "flow", "Flow", "CVD unavailable", "Flow available and aligned with direction", "Flow data unavailable — direction is not confirmed yet.", "missing")]),
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  if (!bestConfirmed || !clearEdge) {
    return {
      state: best.score >= 55 ? "wait" : "no_setup",
      selectedMarket,
      longCandidate,
      shortCandidate,
      recommendation: null,
      title: best.score >= 55 ? "Signal potentiel détecté, mais pas encore confirmé." : "Aucun setup proposé maintenant.",
      summary: best.score >= 55 ? "HypurrScope attend plus de confirmation avant de proposer ce setup." : "Les données actuelles ne donnent pas un signal Long ou Short assez propre pour le mode Débutant.",
      visibleReasons: visibleFrom([best, other], !clearEdge ? [reason("direction-edge", "direction", "Directional edge", `${best.score} vs ${other.score}`, "best side ahead by at least 15 points", "L'écart Long/Short n'est pas assez clair.", "warning")] : []),
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  if (!trade) {
    return {
      state: "blocked",
      selectedMarket,
      longCandidate,
      shortCandidate,
      recommendation: null,
      title: "Setup bloqué.",
      summary: "Ce trade ne peut pas être proposé de manière sécurisée.",
      visibleReasons: visibleFrom([best, other], executionBlockers),
      canAcceptSetup: false,
      canPreviewOrder: false,
    };
  }

  return {
    state: "setup_proposed",
    selectedMarket,
    longCandidate,
    shortCandidate,
    recommendation: trade,
    title: "Setup proposé.",
    summary: "Les données de direction, de risque et d'exécution sont alignées.",
    visibleReasons: best.reasons.filter((row) => row.status === "pass").slice(0, 5),
    canAcceptSetup: true,
    canPreviewOrder: true,
  };
}

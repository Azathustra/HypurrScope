export type TradeScoreAsset = "BTC" | "ETH" | "HYPE";
export type TradeScoreSide = "long" | "short";

export type ScoreSection = {
  score: number;
  maxScore: number;
  reasons: ScoreReason[];
};

export type ScoreReason = {
  id: string;
  group: "risk" | "execution" | "market" | "data";
  metric: string;
  current: string;
  rule: string;
  impact: string;
  action: string;
  severity: "positive" | "info" | "warning" | "danger" | "blocker";
};

export type ScoreAction = {
  id:
    | "fix_stop"
    | "fix_target"
    | "auto_fix_size"
    | "lower_leverage"
    | "switch_to_limit"
    | "attach_tpsl"
    | "refresh_data"
    | "preview_protected_order"
    | "preview_with_warning";
  label: string;
  enabled: boolean;
};

export type TradeScoreResult = {
  score: number;
  label:
    | "very_dangerous"
    | "low_quality"
    | "medium_quality"
    | "acceptable"
    | "clean_structure";
  summary: string;
  breakdown: {
    riskStructure: ScoreSection;
    executionQuality: ScoreSection;
    marketAlignment: ScoreSection;
    dataQuality: ScoreSection;
  };
  reasons: ScoreReason[];
  hardBlockers: ScoreReason[];
  softWarnings: ScoreReason[];
  actions: ScoreAction[];
  canPreviewProtectedOrder: boolean;
};

export type TradeScoreInput = {
  asset: TradeScoreAsset;
  side: TradeScoreSide | null;
  entryType: "market" | "limit";
  orderType: "safer-limit" | "market";
  entry: number | null;
  stop: number | null;
  target: number | null;
  maxRiskUsd: number | null;
  leverage: number | null;
  marginMode: "isolated" | "cross";
  positionSizeUsd: number | null;
  positionSizeAsset: number | null;
  estimatedLossUsd: number | null;
  estimatedProfitUsd: number | null;
  netRewardRisk: number | null;
  feesUsd: number | null;
  slippageBps: number | null;
  liquidationPrice: number | null;
  liquidationDistancePct: number | null;
  requiredMarginUsd: number | null;
  pricingAvailable: boolean;
  orderBookAvailable: boolean;
  flowAvailable: boolean;
  assetPrecisionAvailable: boolean;
  tpSlAvailable: boolean;
  priceFresh: boolean;
  orderBookFresh: boolean;
  flowFresh: boolean;
  sourceReady: boolean;
  spreadBps: number | null;
  depth10BpsUsd: number | null;
  depth25BpsUsd: number | null;
  volume24hUsd: number | null;
  price15mPct: number | null;
  price1hPct: number | null;
  oi15mPct: number | null;
  oi4hPct: number | null;
  fundingPct: number | null;
  takerBuyRatio5m: number | null;
  takerSellRatio5m: number | null;
  netBuyFlow5m: number | null;
  netSellFlow5m: number | null;
  cvd5m: number | null;
  cvd15m: number | null;
};

const ASSET_RULES: Record<TradeScoreAsset, {
  minDepth10BpsUsd: number;
  minDepth25BpsUsd: number;
  maxSpreadBps: number;
  maxSlippageBps: number;
  minVolume24hUsd: number;
  minOi15mPct: number;
  minOi4hPct: number;
  momentum15mPct: number;
  maxFundingAbsPct: number;
  liquidationBufferPct: number;
}> = {
  BTC: {
    minDepth10BpsUsd: 5_000_000,
    minDepth25BpsUsd: 8_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 3,
    minVolume24hUsd: 25_000_000,
    minOi15mPct: 0.8,
    minOi4hPct: 3,
    momentum15mPct: 0.25,
    maxFundingAbsPct: 0.015,
    liquidationBufferPct: 0.3,
  },
  ETH: {
    minDepth10BpsUsd: 2_000_000,
    minDepth25BpsUsd: 4_000_000,
    maxSpreadBps: 4,
    maxSlippageBps: 4,
    minVolume24hUsd: 25_000_000,
    minOi15mPct: 1.25,
    minOi4hPct: 4.5,
    momentum15mPct: 0.3,
    maxFundingAbsPct: 0.018,
    liquidationBufferPct: 0.4,
  },
  HYPE: {
    minDepth10BpsUsd: 350_000,
    minDepth25BpsUsd: 700_000,
    maxSpreadBps: 6,
    maxSlippageBps: 8,
    minVolume24hUsd: 25_000_000,
    minOi15mPct: 2.5,
    minOi4hPct: 8,
    momentum15mPct: 0.6,
    maxFundingAbsPct: 0.025,
    liquidationBufferPct: 0.75,
  },
};

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositive(value: number | null | undefined): value is number {
  return isNumber(value) && value > 0;
}

function usd(value: number | null | undefined) {
  if (!isNumber(value)) return "indisponible";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function pct(value: number | null | undefined, digits = 2) {
  if (!isNumber(value)) return "indisponible";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function bps(value: number | null | undefined) {
  if (!isNumber(value)) return "indisponible";
  return `${value.toFixed(2)} bps`;
}

function reason(
  id: ScoreReason["id"],
  group: ScoreReason["group"],
  metric: string,
  current: string,
  rule: string,
  impact: string,
  action: string,
  severity: ScoreReason["severity"],
): ScoreReason {
  return { id, group, metric, current, rule, impact, action, severity };
}

function section(maxScore: number): ScoreSection {
  return { score: 0, maxScore, reasons: [] };
}

function add(sectionScore: ScoreSection, points: number, item: ScoreReason, pass: boolean) {
  if (pass) sectionScore.score += points;
  sectionScore.reasons.push(item);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreLabel(score: number): TradeScoreResult["label"] {
  if (score <= 24) return "very_dangerous";
  if (score <= 49) return "low_quality";
  if (score <= 64) return "medium_quality";
  if (score <= 79) return "acceptable";
  return "clean_structure";
}

function summaryFor(score: number, hardBlockers: ScoreReason[]) {
  if (hardBlockers.length) {
    return "Le trade ne peut pas etre previsualise comme ordre protege tant que les blocages ne sont pas corriges.";
  }
  if (score >= 80) return "Le trade est bien structure selon les donnees disponibles.";
  if (score >= 50) return "Le trade est calculable, mais certaines conditions reduisent sa qualite.";
  return "Le trade presente plusieurs faiblesses importantes.";
}

function targetSupportsSide(side: TradeScoreSide | null, entry: number | null, target: number | null) {
  if (!side || !isPositive(entry) || !isPositive(target)) return false;
  return side === "long" ? target > entry : target < entry;
}

function stopSupportsSide(side: TradeScoreSide | null, entry: number | null, stop: number | null) {
  if (!side || !isPositive(entry) || !isPositive(stop)) return false;
  return side === "long" ? stop < entry : stop > entry;
}

function momentumPass(side: TradeScoreSide | null, value: number | null, threshold: number) {
  if (!side || !isNumber(value)) return null;
  return side === "long" ? value >= threshold : value <= -threshold;
}

function directionFlowPass(side: TradeScoreSide | null, buy: number | null, sell: number | null) {
  if (!side || !isNumber(buy) || !isNumber(sell)) return null;
  return side === "long" ? buy >= sell : sell >= buy;
}

function signedFlowPass(side: TradeScoreSide | null, netBuy: number | null, netSell: number | null) {
  if (!side) return null;
  if (side === "long") return isNumber(netBuy) ? netBuy > 0 : null;
  return isNumber(netSell) ? netSell > 0 : null;
}

function cvdPass(side: TradeScoreSide | null, value: number | null) {
  if (!side || !isNumber(value)) return null;
  return side === "long" ? value >= 0 : value <= 0;
}

function withCap(current: number, cap: number) {
  return Math.min(current, cap);
}

function uniqueActions(actions: ScoreAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

function actionForReason(item: ScoreReason): ScoreAction | null {
  if (item.id === "stop_missing") return { id: "fix_stop", label: "Ajouter un stop", enabled: true };
  if (item.id === "stop_invalid") return { id: "fix_stop", label: "Corriger le stop", enabled: true };
  if (item.id === "target_missing" || item.id === "target_invalid") return { id: "fix_target", label: "Corriger le target", enabled: true };
  if (item.id === "loss_over_risk" || item.id === "position_invalid") return { id: "auto_fix_size", label: "Corriger la taille", enabled: true };
  if (item.id === "liquidation_before_stop" || item.id === "liquidation_too_close") return { id: "lower_leverage", label: "Baisser le levier", enabled: true };
  if (item.id === "spread_wide" || item.id === "slippage_high") return { id: "switch_to_limit", label: "Passer en limit order", enabled: true };
  if (item.id === "tpsl_unavailable") return { id: "attach_tpsl", label: "Attacher TP/SL", enabled: false };
  if (item.id === "pricing_unavailable" || item.id === "orderbook_unavailable" || item.id === "data_stale") return { id: "refresh_data", label: "Actualiser les donnees", enabled: true };
  return null;
}

export function tradeBuilderTargetPrice(entry: number, side: TradeScoreSide, targetMovePct: number) {
  return side === "long" ? entry * (1 + targetMovePct / 100) : entry * (1 - targetMovePct / 100);
}

export function tradeBuilderStopFromTarget(entry: number, target: number, side: TradeScoreSide, desiredRewardRisk: number) {
  const distance = Math.abs(target - entry) / desiredRewardRisk;
  return side === "long" ? entry - distance : entry + distance;
}

export function buildTradeScore(input: TradeScoreInput): TradeScoreResult {
  const rules = ASSET_RULES[input.asset];
  const riskStructure = section(40);
  const executionQuality = section(25);
  const marketAlignment = section(25);
  const dataQuality = section(10);
  const hardBlockers: ScoreReason[] = [];
  const softWarnings: ScoreReason[] = [];
  let cap = 100;

  const stopPresent = isPositive(input.stop);
  const stopValid = stopSupportsSide(input.side, input.entry, input.stop);
  if (!stopPresent) {
    const item = reason("stop_missing", "risk", "Stop loss", "absent", "obligatoire", "aucun risque maximal clair sans stop", "ajouter un stop", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 15);
  } else if (!stopValid) {
    const item = reason("stop_invalid", "risk", "Stop loss", input.stop ? usd(input.stop) : "indisponible", "du bon cote de l'entry", "le stop ne protege pas ce sens de trade", "corriger le stop", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 20);
  } else {
    add(riskStructure, 7, reason("stop_valid", "risk", "Stop loss", usd(input.stop), "du bon cote de l'entry", "le risque est defini", "aucun changement necessaire", "positive"), true);
  }

  const targetPresent = isPositive(input.target);
  const targetValid = targetSupportsSide(input.side, input.entry, input.target);
  if (!targetPresent || !targetValid) {
    const item = reason(targetPresent ? "target_invalid" : "target_missing", "risk", "Take profit", targetPresent ? usd(input.target) : "absent", "du bon cote de l'entry", "le reward attendu n'est pas correctement defini", "corriger le target", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, targetPresent ? 25 : 25);
  } else {
    add(riskStructure, 7, reason("target_valid", "risk", "Take profit", usd(input.target), "du bon cote de l'entry", "le reward est defini", "aucun changement necessaire", "positive"), true);
  }

  const lossOk = isPositive(input.estimatedLossUsd) && isPositive(input.maxRiskUsd) && input.estimatedLossUsd <= input.maxRiskUsd;
  if (isPositive(input.maxRiskUsd) && isPositive(input.estimatedLossUsd) && input.estimatedLossUsd > input.maxRiskUsd) {
    const item = reason("loss_over_risk", "risk", "Estimated loss", usd(input.estimatedLossUsd), `<= ${usd(input.maxRiskUsd)}`, "la perte estimee depasse le risque maximal", "corriger la taille", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 30);
  } else {
    add(riskStructure, 7, reason("loss_within_risk", "risk", "Estimated loss", usd(input.estimatedLossUsd), `<= ${usd(input.maxRiskUsd)}`, lossOk ? "la perte estimee respecte le risque maximal" : "la perte estimee sera disponible quand le ticket sera complet", lossOk ? "aucun changement necessaire" : "completer le ticket", lossOk ? "positive" : "warning"), lossOk);
    if (!lossOk) softWarnings.push(riskStructure.reasons[riskStructure.reasons.length - 1]);
  }

  const liqDistance = input.liquidationDistancePct;
  if (isNumber(liqDistance) && liqDistance < 0) {
    const item = reason("liquidation_before_stop", "risk", "Liquidation distance", `${liqDistance.toFixed(2)}%`, `>= ${rules.liquidationBufferPct.toFixed(2)}%`, "la liquidation arrive avant le stop", "baisser le levier", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 10);
  } else if (isNumber(liqDistance) && liqDistance < rules.liquidationBufferPct) {
    const item = reason("liquidation_too_close", "risk", "Liquidation distance", `${liqDistance.toFixed(2)}% derriere le stop`, `minimum ${rules.liquidationBufferPct.toFixed(2)}%`, "la liquidation est trop proche du stop", "baisser le levier ou reduire la taille", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 35);
  } else {
    const ok = isNumber(liqDistance);
    add(riskStructure, 8, reason("liquidation_buffer_ok", "risk", "Liquidation distance", ok ? `${liqDistance.toFixed(2)}%` : "indisponible", `>= ${rules.liquidationBufferPct.toFixed(2)}%`, ok ? "la liquidation reste derriere le stop avec buffer" : "distance de liquidation non calculable", ok ? "aucun changement necessaire" : "verifier entry, stop et leverage", ok ? "positive" : "warning"), ok);
  }

  const rrOk = isNumber(input.netRewardRisk) && input.netRewardRisk >= 1;
  add(riskStructure, 5, reason("net_rr", "risk", "Net reward/risk", isNumber(input.netRewardRisk) ? `${input.netRewardRisk.toFixed(2)}R` : "indisponible", ">= 1.00R", rrOk ? "le reward net couvre le risque" : "le reward/risk net est faible", rrOk ? "aucun changement necessaire" : "ameliorer target ou stop", rrOk ? "positive" : "warning"), rrOk);
  if (!rrOk) softWarnings.push(riskStructure.reasons[riskStructure.reasons.length - 1]);

  const feesOk = isNumber(input.feesUsd);
  add(riskStructure, 3, reason("fees_included", "risk", "Fees", usd(input.feesUsd), "incluses dans le calcul", feesOk ? "les couts sont integres au plan" : "les couts seront calcules quand le ticket sera complet", "aucun changement necessaire", feesOk ? "positive" : "info"), feesOk);

  if (!input.tpSlAvailable) {
    const item = reason("tpsl_unavailable", "risk", "TP/SL protection", "indisponible", "attachable", "la preview protegee ne peut pas attacher stop et target", "attacher TP/SL", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 30);
  } else {
    add(riskStructure, 3, reason("tpsl_available", "risk", "TP/SL protection", "attachable", "attachable", "stop et target peuvent etre prepares en preview", "aucun changement necessaire", "positive"), true);
  }

  if (!input.pricingAvailable) {
    const item = reason("pricing_unavailable", "data", "Pricing data", "indisponible", "live", "prix indisponible pour noter le trade", "actualiser les donnees", "blocker");
    dataQuality.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 20);
  }
  if (!input.assetPrecisionAvailable) {
    const item = reason("precision_unavailable", "data", "Asset precision", "indisponible", "disponible", "precision asset manquante pour calculer une preview fiable", "actualiser les donnees", "blocker");
    dataQuality.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 20);
  }
  if (!input.orderBookAvailable) {
    const item = reason("orderbook_unavailable", "execution", "Order book", "indisponible", "live", "le carnet est necessaire pour evaluer spread, depth et slippage", "actualiser les donnees", "blocker");
    executionQuality.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 45);
  }
  if (!isPositive(input.positionSizeAsset) || !isPositive(input.positionSizeUsd)) {
    const item = reason("position_invalid", "risk", "Position size", "indisponible", "> 0", "la taille de position n'est pas calculable", "corriger la taille", "blocker");
    riskStructure.reasons.push(item);
    hardBlockers.push(item);
    cap = withCap(cap, 30);
  }

  const spreadOk = isNumber(input.spreadBps) && input.spreadBps <= rules.maxSpreadBps;
  const spreadItem = reason("spread_wide", "execution", "Spread", bps(input.spreadBps), `<= ${rules.maxSpreadBps} bps`, spreadOk ? "le cout d'entree est acceptable" : "le spread augmente le cout d'entree", spreadOk ? "aucun changement necessaire" : "passer en limit order", spreadOk ? "positive" : "warning");
  add(executionQuality, 5, spreadItem, spreadOk);
  if (!spreadOk) {
    softWarnings.push(spreadItem);
    cap = withCap(cap, 70);
  }

  const depth10Ok = isNumber(input.depth10BpsUsd) && input.depth10BpsUsd >= rules.minDepth10BpsUsd;
  const depth10Item = reason("liquidity_thin", "execution", "Depth +/-10 bps", usd(input.depth10BpsUsd), `>= ${usd(rules.minDepth10BpsUsd)}`, depth10Ok ? "la profondeur proche est suffisante" : "la liquidite proche est fine", depth10Ok ? "aucun changement necessaire" : "reduire la taille ou utiliser limit", depth10Ok ? "positive" : "warning");
  add(executionQuality, 6, depth10Item, depth10Ok);
  if (!depth10Ok) {
    softWarnings.push(depth10Item);
    cap = withCap(cap, 65);
  }

  const depth25Ok = isNumber(input.depth25BpsUsd) && input.depth25BpsUsd >= rules.minDepth25BpsUsd;
  add(executionQuality, 4, reason("depth25", "execution", "Depth +/-25 bps", usd(input.depth25BpsUsd), `>= ${usd(rules.minDepth25BpsUsd)}`, depth25Ok ? "la profondeur elargie est correcte" : "la profondeur elargie est faible", depth25Ok ? "aucun changement necessaire" : "reduire la taille", depth25Ok ? "positive" : "warning"), depth25Ok);

  const slippageOk = isNumber(input.slippageBps) && input.slippageBps <= rules.maxSlippageBps;
  const slipItem = reason("slippage_high", "execution", "Estimated slippage", bps(input.slippageBps), `<= ${rules.maxSlippageBps} bps`, slippageOk ? "le slippage estime est acceptable" : "le slippage estime reduit la qualite", slippageOk ? "aucun changement necessaire" : "passer en limit order", slippageOk ? "positive" : "warning");
  add(executionQuality, 4, slipItem, slippageOk);
  if (!slippageOk) softWarnings.push(slipItem);

  const orderTypeOk = input.orderType === "safer-limit" || spreadOk;
  add(executionQuality, 3, reason("order_type", "execution", "Order type", input.orderType === "safer-limit" ? "Safer limit" : "Market", "adapte au spread", orderTypeOk ? "le type d'ordre est coherent" : "market order est plus fragile avec spread eleve", orderTypeOk ? "aucun changement necessaire" : "passer en limit order", orderTypeOk ? "positive" : "warning"), orderTypeOk);

  const volumeOk = isNumber(input.volume24hUsd) && input.volume24hUsd >= rules.minVolume24hUsd;
  add(executionQuality, 3, reason("volume", "execution", "24h volume", usd(input.volume24hUsd), `>= ${usd(rules.minVolume24hUsd)}`, volumeOk ? "le marche est suffisamment actif" : "le volume est faible", volumeOk ? "aucun changement necessaire" : "reduire la taille", volumeOk ? "positive" : "warning"), volumeOk);

  const m15 = momentumPass(input.side, input.price15mPct, rules.momentum15mPct);
  const m15Item = reason("momentum_15m", "market", "15m momentum", pct(input.price15mPct), input.side === "short" ? `<= -${rules.momentum15mPct.toFixed(2)}%` : `>= +${rules.momentum15mPct.toFixed(2)}%`, m15 ? "le momentum soutient la direction" : "le momentum ne confirme pas la direction", m15 ? "aucun changement necessaire" : "attendre ou reduire la confiance", m15 ? "positive" : "warning");
  add(marketAlignment, 4, m15Item, Boolean(m15));
  if (m15 === false) {
    softWarnings.push(m15Item);
    cap = withCap(cap, 60);
  }

  const m1h = momentumPass(input.side, input.price1hPct, rules.momentum15mPct / 2);
  add(marketAlignment, 4, reason("momentum_1h", "market", "1h momentum", pct(input.price1hPct), "doit soutenir ou rester neutre", m1h ? "la tendance 1h soutient le plan" : "la tendance 1h est faible ou opposee", m1h ? "aucun changement necessaire" : "attendre une meilleure confirmation", m1h ? "positive" : "warning"), Boolean(m1h));

  const oiOk = isNumber(input.oi15mPct) && Math.abs(input.oi15mPct) >= rules.minOi15mPct;
  add(marketAlignment, 4, reason("oi_support", "market", "OI change 15m", pct(input.oi15mPct), `>= ${rules.minOi15mPct.toFixed(2)}% en amplitude`, oiOk ? "l'open interest donne du contexte" : "l'OI ne soutient pas fortement le plan", oiOk ? "aucun changement necessaire" : "attendre confirmation OI", oiOk ? "positive" : "warning"), oiOk);

  const fundingOk = isNumber(input.fundingPct) && Math.abs(input.fundingPct) <= rules.maxFundingAbsPct;
  add(marketAlignment, 3, reason("funding", "market", "Funding", pct(input.fundingPct, 4), `abs <= ${rules.maxFundingAbsPct.toFixed(4)}%`, fundingOk ? "le funding n'est pas extreme" : "le funding rend le trade plus cher ou crowded", fundingOk ? "aucun changement necessaire" : "reduire la confiance", fundingOk ? "positive" : "warning"), fundingOk);

  const ratioOk = directionFlowPass(input.side, input.takerBuyRatio5m, input.takerSellRatio5m);
  add(marketAlignment, 4, reason("taker_ratio", "market", "Taker buy/sell ratio", `${pct(input.takerBuyRatio5m, 1)} / ${pct(input.takerSellRatio5m, 1)}`, "doit soutenir la direction", ratioOk ? "le taker flow soutient la direction" : "le taker flow ne confirme pas", ratioOk ? "aucun changement necessaire" : "attendre ou reduire la confiance", ratioOk ? "positive" : "warning"), Boolean(ratioOk));

  const netFlowOk = signedFlowPass(input.side, input.netBuyFlow5m, input.netSellFlow5m);
  add(marketAlignment, 3, reason("net_flow", "market", "Net flow 5m", input.side === "short" ? usd(input.netSellFlow5m) : usd(input.netBuyFlow5m), "doit soutenir la direction", netFlowOk ? "le flux net soutient le plan" : "le flux net ne confirme pas", netFlowOk ? "aucun changement necessaire" : "attendre confirmation flow", netFlowOk ? "positive" : "warning"), Boolean(netFlowOk));

  const cvdOk = cvdPass(input.side, input.cvd5m);
  const cvdItem = reason("cvd", "market", "CVD 5m / 15m", `${usd(input.cvd5m)} / ${usd(input.cvd15m)}`, "doit soutenir la direction", cvdOk ? "le CVD soutient la direction" : "le CVD est contre ou indisponible", cvdOk ? "aucun changement necessaire" : "attendre ou reduire la confiance", cvdOk ? "positive" : "warning");
  add(marketAlignment, 3, cvdItem, Boolean(cvdOk));
  if (cvdOk === false) softWarnings.push(cvdItem);

  const flowUnavailable = !input.flowAvailable || !isNumber(input.takerBuyRatio5m) || !isNumber(input.takerSellRatio5m);
  if (flowUnavailable) {
    const item = reason("flow_unavailable", "market", "Flow data", "indisponible", "streaming", "le score marche est moins complet sans flow", "attendre le flux live", "warning");
    softWarnings.push(item);
    marketAlignment.reasons.push(item);
    cap = withCap(cap, 75);
  }

  add(dataQuality, 2, reason("price_fresh", "data", "Price freshness", input.priceFresh ? "live" : "stale", "live", input.priceFresh ? "prix frais" : "prix a actualiser", input.priceFresh ? "aucun changement necessaire" : "actualiser les donnees", input.priceFresh ? "positive" : "warning"), input.priceFresh);
  add(dataQuality, 2, reason("book_fresh", "data", "Order book freshness", input.orderBookFresh ? "live" : "stale", "live", input.orderBookFresh ? "carnet frais" : "carnet a actualiser", input.orderBookFresh ? "aucun changement necessaire" : "actualiser les donnees", input.orderBookFresh ? "positive" : "warning"), input.orderBookFresh);
  add(dataQuality, 2, reason("flow_fresh", "data", "Flow freshness", input.flowFresh ? "live" : "stale", "live", input.flowFresh ? "flow frais" : "flow encore incomplet", input.flowFresh ? "aucun changement necessaire" : "attendre le stream", input.flowFresh ? "positive" : "warning"), input.flowFresh);
  add(dataQuality, 2, reason("precision_data", "data", "Asset precision", input.assetPrecisionAvailable ? "disponible" : "indisponible", "disponible", input.assetPrecisionAvailable ? "precision exploitable" : "precision absente", input.assetPrecisionAvailable ? "aucun changement necessaire" : "actualiser les donnees", input.assetPrecisionAvailable ? "positive" : "blocker"), input.assetPrecisionAvailable);
  add(dataQuality, 2, reason("source_status", "data", "Source status", input.sourceReady ? "ready" : "not ready", "ready", input.sourceReady ? "source Hyperliquid prete" : "source encore indisponible", input.sourceReady ? "aucun changement necessaire" : "actualiser les donnees", input.sourceReady ? "positive" : "warning"), input.sourceReady);

  let score = riskStructure.score + executionQuality.score + marketAlignment.score + dataQuality.score;
  score = clampScore(withCap(score, cap));
  const allReasons = [
    ...riskStructure.reasons,
    ...executionQuality.reasons,
    ...marketAlignment.reasons,
    ...dataQuality.reasons,
  ];
  const blockers = hardBlockers;
  const warnings = softWarnings.filter((item) => !blockers.some((blocker) => blocker.id === item.id));
  const canPreviewProtectedOrder = blockers.length === 0;
  const blockerActions = blockers.map(actionForReason).filter((action): action is ScoreAction => Boolean(action));
  const warningActions = warnings.map(actionForReason).filter((action): action is ScoreAction => Boolean(action));
  const previewActions: ScoreAction[] = [];
  if (canPreviewProtectedOrder && score >= 65) {
    previewActions.push({ id: "preview_protected_order", label: "Previsualiser l'ordre protege", enabled: true });
  }
  if (canPreviewProtectedOrder && score < 65) {
    previewActions.push({ id: "preview_with_warning", label: "Previsualiser avec avertissement", enabled: true });
  }
  const actions = uniqueActions([...blockerActions, ...warningActions, ...previewActions]);

  const rankedReasons = allReasons
    .filter((item) => item.severity !== "positive" || allReasons.filter((reasonItem) => reasonItem.severity !== "positive").length < 3)
    .sort((a, b) => {
      const weight = { blocker: 5, danger: 4, warning: 3, info: 2, positive: 1 };
      return weight[b.severity] - weight[a.severity];
    });

  return {
    score,
    label: scoreLabel(score),
    summary: summaryFor(score, blockers),
    breakdown: { riskStructure, executionQuality, marketAlignment, dataQuality },
    reasons: rankedReasons.slice(0, 6),
    hardBlockers: blockers,
    softWarnings: warnings,
    actions,
    canPreviewProtectedOrder,
  };
}

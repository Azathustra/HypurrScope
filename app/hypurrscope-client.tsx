"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildBeginnerTradeDecision, type BeginnerPrimaryButton, type BeginnerReason, type BeginnerTradeDecision } from "./lib/risk/buildBeginnerTradeDecision";
import { buildProTicketState, type ProTicketRawData, type ProTicketState } from "./lib/risk/buildProTicketState";
import { calculateRiskTicket as calculateRiskTicketCore } from "./lib/risk/calculateRiskTicket";
import { riskPresetFor } from "./lib/risk/presets";
import { getBuilderConfig } from "./lib/hyperliquid/builderCode";
import { getHyperliquidConfig } from "./lib/hyperliquid/config";
import { assetMetaFor, type PerpAssetMeta } from "./lib/hyperliquid/assetMeta";
import { fetchPerpMeta } from "./lib/hyperliquid/fetchPerpMeta";
import { roundPriceForPerp } from "./lib/hyperliquid/rounding";
import { deriveTicketState, isTicketComputable, ticketStateNextAction, type TicketState } from "./lib/risk/deriveTicketState";
import { derivePrimaryCta } from "./lib/ui/derivePrimaryCta";
import type { DataStatus, EntryType as CoreEntryType, RiskTicketInput, Side as CoreSide } from "./lib/risk/types";

type ApiCoin = "BTC" | "ETH" | "HYPE";
type View = "overview" | "watchlist" | "asset" | "flow" | "alerts" | "wallet";
type ConnectionState = "loading" | "live" | "stale" | "failed";
type AssetDataStatus = "ready" | "loading" | "stale" | "error";
type SignalKind = "Fresh Long" | "Fresh Short" | "Crowded Long" | "Crowded Short";
type ChartMode = "price" | "oi" | "cvd" | "funding";
type ChartInterval = "1m" | "5m" | "15m" | "1h";
type AlertFilter = "All" | ApiCoin | "Enabled" | "Disabled";
type FlowFilter = "All" | ApiCoin | "Large trades" | "Taker bursts";
type AlertDestination = "Browser" | "Telegram" | "Webhook";
type TriggerMode = "all" | "any";
type AlertTab = "presets" | "builder" | "saved";
type FlowStatus = "connecting" | "collecting" | "streaming" | "stale" | "reconnecting" | "error";
type WebSocketStatus = "connecting" | "connected" | "streaming" | "stale" | "reconnecting" | "error";
type WsChannel = "allMids" | "trades" | "l2Book" | "candle" | "activeAssetCtx";
type SignalStatus = "active" | "near" | "inactive" | "not_evaluable_data_missing" | "not_evaluable_flow_missing";

type AssetConfig = {
  apiCoin: ApiCoin;
  displayName: string;
  shortName: string;
  bucket: string;
  thresholds: {
    largeTradeUsd: number;
    flow5mUsd: number;
    oi15mPct: number;
    oi4hPct: number;
    price15mPct: number;
    fundingPct: number;
    minDepthUsd: number;
  };
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeUsd: number;
};

type Trade = {
  id: string;
  time: number;
  rawSide: string;
  side: "Buy" | "Sell";
  price: number;
  size: number;
  notionalUsd: number;
};

type BookLevel = {
  price: number;
  size: number;
  usd: number;
};

type Book = {
  bids: BookLevel[];
  asks: BookLevel[];
  bestBid: number;
  bestAsk: number;
  spreadBps: number | null;
  depth10Bps: number | null;
  depth25Bps: number | null;
  depth50Bps: number | null;
};

type MarketCtx = {
  price: number | null;
  prevPrice: number | null;
  midPx: number | null;
  fundingPct: number | null;
  premium: number | null;
  openInterestRaw: number | null;
  oiUsd: number | null;
  volume24hUsd: number | null;
  oraclePx: number | null;
};

type OiPoint = {
  time: number;
  oiUsd: number;
};

type FundingPoint = {
  time: number;
  fundingPct: number;
};

type ChartPoint = {
  time: number;
  value: number;
};

type ChartDataset =
  | {
      kind: "candles";
      label: string;
      valueLabel: string;
      points: Candle[];
      min: number;
      max: number;
      latest: number | null;
      emptyReason: string;
    }
  | {
      kind: "line";
      label: string;
      valueLabel: string;
      points: ChartPoint[];
      min: number;
      max: number;
      latest: number | null;
      emptyReason: string;
    };

type LogicalRange = {
  from: number;
  to: number;
};

type ValueRange = {
  min: number;
  max: number;
};

type ChartDragState = {
  area: "plot" | "xAxis" | "yAxis";
  startX: number;
  startY: number;
  startRange: LogicalRange;
  startYRange: ValueRange;
};

type FreshnessMap = Partial<Record<"meta" | "candles" | "book" | "trades" | "ws", number>>;

type AssetState = {
  market: MarketCtx;
  candles: Candle[];
  book: Book | null;
  trades: Trade[];
  oiHistory: OiPoint[];
  fundingHistory: FundingPoint[];
  freshness: FreshnessMap;
  sourceUpdatedAt: number | null;
  sourceUpdatedAtIso: string | null;
  missingFields: string[];
  dataError: string | null;
  candleError: string | null;
  bookError: string | null;
  backendOi: OiHistoryResponse | null;
  requestFailed: boolean;
};

type InitialAssetStateMap = Partial<Record<ApiCoin, Partial<AssetState>>>;

type HlMarketAsset = {
  apiCoin: ApiCoin;
  markPx: number | null;
  midPx: number | null;
  oraclePx: number | null;
  fundingRaw: number | null;
  fundingPctHourly: number | null;
  openInterestRaw: number | null;
  openInterestUsdComputed: number | null;
  dayNtlVlm: number | null;
  prevDayPx: number | null;
  missingFields?: string[];
  updatedAt?: string;
};

type HlMarketsResponse = {
  ok: boolean;
  assets?: HlMarketAsset[];
  error?: string;
  updatedAt?: string;
};

type HlCandlesResponse = {
  ok: boolean;
  coin: ApiCoin;
  interval: string;
  candlesCount?: number;
  lastClose?: number | null;
  close15mAgo?: number | null;
  close1hAgo?: number | null;
  priceChange15mPct?: number | null;
  priceChange1hPct?: number | null;
  candles?: unknown[];
  updatedAt?: string;
  error?: string;
};

type HlBookResponse = {
  ok: boolean;
  coin: ApiCoin;
  bestBid?: number | null;
  bestAsk?: number | null;
  mid?: number | null;
  spreadBps?: number | null;
  depth10bpsUsd?: number | null;
  depth25bpsUsd?: number | null;
  updatedAt?: string;
  error?: string;
};

type OiHistoryStatus = "ready" | "warming_up" | "insufficient_history" | "error";

type OiHistoryResponse = {
  ok: boolean;
  asset: ApiCoin;
  currentOiUsd: number | null;
  oiUsd15mAgo: number | null;
  oiUsd1hAgo: number | null;
  oiUsd4hAgo: number | null;
  oiChange15mPct: number | null;
  oiChange1hPct: number | null;
  oiChange4hPct: number | null;
  availableHistoryMinutes: number;
  requiredHistoryMinutes: {
    oi15m: number;
    oi1h: number;
    oi4h: number;
  };
  snapshotCount?: number;
  cadenceStatus?: "healthy" | "healthy_recent_with_historical_gap" | "degraded";
  lastSnapshotAgeSeconds?: number | null;
  averageSnapshotIntervalSecondsLast60m?: number | null;
  averageSnapshotIntervalSecondsLast4h?: number | null;
  expectedSnapshotCountLast60m?: number;
  actualSnapshotCountLast60m?: number;
  missingSnapshotIntervalsLast60m?: number;
  missingSnapshotIntervalsLast4h?: number;
  status: OiHistoryStatus;
  message?: string;
  error?: string;
  updatedAt?: string;
};

type MetricBundle = {
  price15m: number | null;
  price1h: number | null;
  price24h: number | null;
  oi15m: number | null;
  oi1h: number | null;
  oi4h: number | null;
  takerBuy5m: number | null;
  takerSell5m: number | null;
  buyNotional5m: number | null;
  sellNotional5m: number | null;
  takerBuy15m: number | null;
  takerSell15m: number | null;
  takerBuyRatio5m: number | null;
  takerSellRatio5m: number | null;
  netBuyFlow5m: number | null;
  netSellFlow5m: number | null;
  netFlow5m: number | null;
  netFlow15m: number | null;
  buyRatio5m: number | null;
  sellRatio5m: number | null;
  cvd5m: number | null;
  cvd15m: number | null;
  cvd1h: number | null;
  relativeVolume5m: number | null;
  liquidityHealthy: boolean | null;
  spreadBps: number | null;
  depth10Bps: number | null;
  depth25Bps: number | null;
  depth50Bps: number | null;
  fundingDailyPct: number | null;
  fundingAnnualizedPct: number | null;
  fundingAbsExtreme: boolean | null;
  fundingPct: number | null;
};

type SignalReadiness = {
  asset: ApiCoin;
  kind: SignalKind;
  score: number | null;
  structureScore: number | null;
  flowScore: number | null;
  finalScore: number | null;
  status: SignalStatus;
  active: boolean;
  passed: string[];
  missing: string[];
  flowMissing: string[];
  details: string[];
  flowInputs: string[];
  explanation: string;
};

type FlowEvent = {
  id: string;
  time: number;
  asset: ApiCoin;
  event: string;
  eventType: string;
  side: "Buy" | "Sell" | "Mixed" | "-";
  size: string;
  notionalUsd: number | null;
  price: number | null;
  context: string;
  source: "websocket trades";
  status: "live" | "stale";
};

type AlertRule = {
  id: string;
  asset: ApiCoin;
  kind: string;
  alertType: "preset" | "custom" | "live";
  fingerprint: string;
  thresholds: Record<string, number | string>;
  triggerMode: TriggerMode;
  triggerCount: number;
  cooldownSeconds: number;
  createdAt: number;
  updatedAt: number;
  lastTriggeredAt: number | null;
  enabled: boolean;
  destination: AlertDestination;
};

type CustomAlertDraft = {
  direction: SignalKind;
  price15mPct: number;
  oi15mPct: number;
  oi4hPct: number;
  fundingGreaterPct: number;
  fundingLowerPct: number;
  takerBuyRatioPct: number;
  takerSellRatioPct: number;
  netBuyFlow5mUsd: number;
  netSellFlow5mUsd: number;
  largeTradeUsd: number;
  spreadBps: number;
  depthUsd: number;
  triggerMode: TriggerMode;
  triggerCount: number;
  destination: AlertDestination;
  cooldownMinutes: number;
};

type FlowDisplayState = {
  status: FlowStatus;
  minutes: number;
  wsStatus: WebSocketStatus;
  tradeStreamsActive: boolean;
  hypeError: string | null;
  error: string | null;
};

type RiskMode = "beginner" | "pro";
type TicketSide = "Long" | "Short";
type EntryType = "Market" | "Limit";
type MarginMode = "Cross" | "Isolated";

type RiskTicketDraft = {
  side: TicketSide | null;
  ticketMode: "target-first" | "manual";
  entryType: EntryType;
  maxTotalRiskUsd: string;
  desiredRewardRisk: string;
  entryPrice: string;
  stopLoss: string;
  targetPrice: string;
  leverage: string;
  marginMode: MarginMode;
  accountEquityUsd: string;
};

type TicketWarning = {
  level: "info" | "warning" | "critical";
  text: string;
};

type RecentTicket = {
  id: string;
  createdAt: number;
  asset: ApiCoin;
  side: TicketSide;
  potentialProfitUsd: number | null;
  maxTotalRiskUsd: number;
  riskRewardRatio: number | null;
  status: "previewed" | "copied" | "opened" | "executed";
};

type RiskTicketCalc = {
  asset: AssetConfig;
  side: TicketSide | null;
  entryPrice: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
  maxTotalRiskUsd: number | null;
  leverage: number | null;
  desiredRewardRisk: number | null;
  riskPerUnit: number | null;
  rewardDistance: number | null;
  positionSizeAsset: number | null;
  positionSizeAssetRaw: number | null;
  positionSizeUsd: number | null;
  estimatedLossBeforeCostsUsd: number | null;
  estimatedTotalLossAtStopUsd: number | null;
  estimatedGainUsd: number | null;
  estimatedNetProfitUsd: number | null;
  rewardRiskGross: number | null;
  rewardRiskNet: number | null;
  riskRewardRatio: number | null;
  estimatedFees: number | null;
  estimatedEntryFeesUsd: number | null;
  estimatedExitFeesAtStopUsd: number | null;
  estimatedExitFeesAtTargetUsd: number | null;
  estimatedSlippageBps: number | null;
  estimatedEntrySlippageUsd: number | null;
  estimatedStopSlippageUsd: number | null;
  estimatedTargetSlippageUsd: number | null;
  builderFeeUsd: number | null;
  totalEstimatedCostUsd: number | null;
  liquidationPrice: number | null;
  liquidationDistancePct: number | null;
  liquidationSafety: "Safe" | "Medium" | "Dangerous" | "Unavailable";
  stopTriggerNote: string;
  executionStatus: "Simulation only" | "Preview available" | "Execution ready" | "Execution disabled";
  accountEquityUsd: number | null;
  marginMode: MarginMode;
  invalidationReason: string | null;
  confidence: "Ready for preview" | "Simulation only" | "Needs correction";
  warnings: TicketWarning[];
  dataIsLive: boolean;
  executionEnabled: boolean;
};

type MarketSafetyCheck = {
  label: string;
  value: string;
  status: "OK" | "Review" | "Unsafe" | "Unavailable" | "Pending";
  impact: string;
};

type WsSubscription = {
  type: WsChannel;
  coin?: ApiCoin;
  interval?: "1m";
};

type WsSubscriptionDebug = {
  key: string;
  channel: WsChannel;
  asset: ApiCoin | "all";
  acknowledgedAt: number | null;
  lastMessageAt: number | null;
  error: string | null;
};

type WsDebugState = {
  status: WebSocketStatus;
  connectedAt: number | null;
  lastMessageAt: number | null;
  reconnects: number;
  error: string | null;
  rawMessagesCount: number;
  subscriptionAcksCount: number;
  lastRawMessagePreview: string | null;
  lastSubscriptionSent: string | null;
  subscriptions: Record<string, WsSubscriptionDebug>;
};

type WalletPosition = {
  coin: string;
  size: number | null;
  side: "Long" | "Short" | "-";
  entryPx: number | null;
  markPx: number | null;
  positionValue: number | null;
  unrealizedPnl: number | null;
  liquidationPx: number | null;
  leverage: number | null;
  marginUsed: number | null;
};

type WalletResult = {
  accountValue: number | null;
  marginUsed: number | null;
  totalNotional: number | null;
  withdrawable: number | null;
  unrealizedPnl: number | null;
  positions: WalletPosition[];
};

const ASSETS: AssetConfig[] = [
  {
    apiCoin: "BTC",
    displayName: "BTC",
    shortName: "BTC",
    bucket: "Major",
    thresholds: {
      largeTradeUsd: 1_000_000,
      flow5mUsd: 10_000_000,
      oi15mPct: 0.8,
      oi4hPct: 3,
      price15mPct: 0.25,
      fundingPct: 0.006,
      minDepthUsd: 5_000_000,
    },
  },
  {
    apiCoin: "ETH",
    displayName: "ETH",
    shortName: "ETH",
    bucket: "Large cap",
    thresholds: {
      largeTradeUsd: 500_000,
      flow5mUsd: 6_000_000,
      oi15mPct: 1.25,
      oi4hPct: 4.5,
      price15mPct: 0.3,
      fundingPct: 0.008,
      minDepthUsd: 2_000_000,
    },
  },
  {
    apiCoin: "HYPE",
    displayName: "HYPE",
    shortName: "HYPE",
    bucket: "High beta",
    thresholds: {
      largeTradeUsd: 100_000,
      flow5mUsd: 1_500_000,
      oi15mPct: 2.5,
      oi4hPct: 8,
      price15mPct: 0.6,
      fundingPct: 0.015,
      minDepthUsd: 350_000,
    },
  },
];

const ASSET_ORDER = ASSETS.map((asset) => asset.apiCoin);
const ASSET_BY_COIN = Object.fromEntries(ASSETS.map((asset) => [asset.apiCoin, asset])) as Record<ApiCoin, AssetConfig>;
const PRESET_KINDS: SignalKind[] = ["Fresh Long", "Fresh Short", "Crowded Long", "Crowded Short"];
const CHART_INTERVALS: Array<{ key: ChartInterval; label: string; ms: number }> = [
  { key: "1m", label: "1m", ms: 60_000 },
  { key: "5m", label: "5m", ms: 5 * 60_000 },
  { key: "15m", label: "15m", ms: 15 * 60_000 },
  { key: "1h", label: "1h", ms: 60 * 60_000 },
];
const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";
const BUILDER_ADDRESS = process.env.NEXT_PUBLIC_BUILDER_ADDRESS || "";
const BUILDER_FEE_TENTHS_BPS = Number(process.env.NEXT_PUBLIC_BUILDER_FEE_TENTHS_BPS || "0");
const ENABLE_REAL_EXECUTION = process.env.NEXT_PUBLIC_ENABLE_REAL_EXECUTION === "true";
const ENABLE_BUILDER_CODE = process.env.NEXT_PUBLIC_ENABLE_BUILDER_CODE === "true";
const WS_SUBSCRIPTIONS: WsSubscription[] = [
  { type: "allMids" },
  ...ASSET_ORDER.flatMap((coin): WsSubscription[] => [
    { type: "trades", coin },
    { type: "l2Book", coin },
    { type: "candle", coin, interval: "1m" as const },
    { type: "activeAssetCtx", coin },
  ]),
];
const EMPTY_MARKET: MarketCtx = {
  price: null,
  prevPrice: null,
  midPx: null,
  fundingPct: null,
  premium: null,
  openInterestRaw: null,
  oiUsd: null,
  volume24hUsd: null,
  oraclePx: null,
};

function emptyAssetState(): AssetState {
  return {
    market: { ...EMPTY_MARKET },
    candles: [],
    book: null,
    trades: [],
    oiHistory: [],
    fundingHistory: [],
    freshness: {},
    sourceUpdatedAt: null,
    sourceUpdatedAtIso: null,
    missingFields: [],
    dataError: null,
    candleError: null,
    bookError: null,
    backendOi: null,
    requestFailed: false,
  };
}

function initialAssets(): Record<ApiCoin, AssetState> {
  return {
    BTC: emptyAssetState(),
    ETH: emptyAssetState(),
    HYPE: emptyAssetState(),
  };
}

function mergeInitialAssets(seed?: InitialAssetStateMap): Record<ApiCoin, AssetState> {
  const base = initialAssets();
  if (!seed) return base;

  ASSET_ORDER.forEach((coin) => {
    const row = seed[coin];
    if (!row) return;
    base[coin] = {
      ...base[coin],
      ...row,
      market: { ...base[coin].market, ...(row.market || {}) },
      candles: Array.isArray(row.candles) ? row.candles : base[coin].candles,
      book: row.book === undefined ? base[coin].book : row.book,
      trades: Array.isArray(row.trades) ? row.trades : base[coin].trades,
      oiHistory: Array.isArray(row.oiHistory) ? row.oiHistory : base[coin].oiHistory,
      fundingHistory: Array.isArray(row.fundingHistory) ? row.fundingHistory : base[coin].fundingHistory,
      freshness: { ...base[coin].freshness, ...(row.freshness || {}) },
      missingFields: Array.isArray(row.missingFields) ? row.missingFields : base[coin].missingFields,
      backendOi: row.backendOi === undefined ? base[coin].backendOi : row.backendOi,
    } as AssetState;
  });

  return base;
}

function initialRestDataReady(seed?: InitialAssetStateMap) {
  if (!seed) return false;
  return ASSET_ORDER.every((coin) => {
    const row = seed[coin];
    return Boolean(
      Number.isFinite(row?.market?.price as number) &&
      Number.isFinite(row?.market?.fundingPct as number) &&
      Number.isFinite(row?.market?.oiUsd as number) &&
      Number.isFinite(row?.market?.volume24hUsd as number) &&
      Array.isArray(row?.candles) &&
      row.candles.length >= 2 &&
      Number.isFinite(row?.book?.spreadBps as number) &&
      Number.isFinite(row?.book?.depth10Bps as number),
    );
  });
}

function initialLastUpdate(seed?: InitialAssetStateMap) {
  if (!seed) return undefined;
  const timestamps = ASSET_ORDER
    .map((coin) => seed[coin]?.sourceUpdatedAt || seed[coin]?.freshness?.meta || null)
    .filter((value): value is number => Number.isFinite(value as number));
  return timestamps.length ? Math.max(...timestamps) : undefined;
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function subscriptionKey(subscription: WsSubscription) {
  const coin = subscription.coin ? `:${subscription.coin}` : "";
  const interval = subscription.interval ? `:${subscription.interval}` : "";
  return `${subscription.type}${coin}${interval}`;
}

function subscriptionFromMessage(data: any): WsSubscription | null {
  const raw = data?.subscription || data?.data?.subscription || data?.data;
  const type = raw?.type;
  if (!["allMids", "trades", "l2Book", "candle", "activeAssetCtx"].includes(type)) return null;
  const coin = ASSET_ORDER.includes(raw?.coin) ? raw.coin as ApiCoin : undefined;
  return {
    type,
    coin,
    interval: raw?.interval === "1m" ? "1m" : undefined,
  } as WsSubscription;
}

function messageAsset(data: any): ApiCoin | null {
  const row = Array.isArray(data) ? data[0] : data;
  const coin = row?.coin || row?.s || row?.asset || row?.coinName || row?.ctx?.coin || row?.ctx?.s || row?.candle?.s || row?.candle?.coin;
  return ASSET_ORDER.includes(coin) ? coin : null;
}

function subscriptionFromLiveMessage(channel: string, data: any, message: any): WsSubscription | null {
  if (channel === "allMids") return { type: "allMids" };
  if (channel === "trades") {
    const rows = Array.isArray(data) ? data : Array.isArray(data?.trades) ? data.trades : [data];
    const coin = messageAsset(rows) || messageAsset(data) || message?.subscription?.coin;
    return ASSET_ORDER.includes(coin) ? { type: "trades", coin } : null;
  }
  if (channel === "l2Book") {
    const coin = messageAsset(data) || message?.subscription?.coin;
    return ASSET_ORDER.includes(coin) ? { type: "l2Book", coin } : null;
  }
  if (channel === "candle") {
    const coin = messageAsset(data) || message?.subscription?.coin;
    return ASSET_ORDER.includes(coin) ? { type: "candle", coin, interval: "1m" } : null;
  }
  if (channel === "activeAssetCtx") {
    const coin = messageAsset(data) || message?.subscription?.coin;
    return ASSET_ORDER.includes(coin) ? { type: "activeAssetCtx", coin } : null;
  }
  return null;
}

function createWsDebugState(status: WebSocketStatus, previous?: WsDebugState): WsDebugState {
  const subscriptions = Object.fromEntries(WS_SUBSCRIPTIONS.map((subscription) => {
    const key = subscriptionKey(subscription);
    const old = previous?.subscriptions[key];
    return [key, {
      key,
      channel: subscription.type,
      asset: subscription.coin || "all",
      acknowledgedAt: old?.acknowledgedAt ?? null,
      lastMessageAt: old?.lastMessageAt ?? null,
      error: old?.error ?? null,
    } satisfies WsSubscriptionDebug];
  })) as Record<string, WsSubscriptionDebug>;

  return {
    status,
    connectedAt: previous?.connectedAt ?? null,
    lastMessageAt: previous?.lastMessageAt ?? null,
    reconnects: previous?.reconnects ?? 0,
    error: previous?.error ?? null,
    rawMessagesCount: previous?.rawMessagesCount ?? 0,
    subscriptionAcksCount: previous?.subscriptionAcksCount ?? 0,
    lastRawMessagePreview: previous?.lastRawMessagePreview ?? null,
    lastSubscriptionSent: previous?.lastSubscriptionSent ?? null,
    subscriptions,
  };
}

function markWsSubscription(state: WsDebugState, subscription: WsSubscription, timestamp: number) {
  const key = subscriptionKey(subscription);
  const current = state.subscriptions[key] || {
    key,
    channel: subscription.type,
    asset: subscription.coin || "all",
    acknowledgedAt: null,
    lastMessageAt: null,
    error: null,
  };
  return {
    ...state,
    subscriptions: {
      ...state.subscriptions,
      [key]: { ...current, acknowledgedAt: timestamp, error: null },
    },
  };
}

function markWsMessage(state: WsDebugState, subscription: WsSubscription, timestamp: number) {
  const key = subscriptionKey(subscription);
  const current = state.subscriptions[key] || {
    key,
    channel: subscription.type,
    asset: subscription.coin || "all",
    acknowledgedAt: null,
    lastMessageAt: null,
    error: null,
  };
  return {
    ...state,
    status: "streaming" as WebSocketStatus,
    lastMessageAt: timestamp,
    error: null,
    subscriptions: {
      ...state.subscriptions,
      [key]: { ...current, lastMessageAt: timestamp, error: null },
    },
  };
}

function median(values: number[]) {
  const rows = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

function formatUsd(value: number | null, fallback = "Loading") {
  if (!Number.isFinite(value as number)) return fallback;
  const numberValue = value as number;
  const sign = numberValue < 0 ? "-" : "";
  const abs = Math.abs(numberValue);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(4)}`;
}

function formatPct(value: number | null, digits = 2, fallback = "Loading", signed = true) {
  if (!Number.isFinite(value as number)) return fallback;
  const numberValue = value as number;
  const sign = signed && numberValue > 0 ? "+" : "";
  return `${sign}${numberValue.toFixed(digits)}%`;
}

function formatFunding(value: number | null) {
  if (!Number.isFinite(value as number)) return "Loading";
  const numberValue = value as number;
  if (Math.abs(numberValue) < 0.0001) return numberValue < 0 ? "-<0.0001%" : "<0.0001%";
  return formatPct(numberValue, 4);
}

function formatBps(value: number | null, fallback = "Unavailable") {
  if (!Number.isFinite(value as number)) return fallback;
  return `${(value as number).toFixed(2)} bps`;
}

function formatSlippagePct(value: number | null, fallback = "Unavailable") {
  if (!Number.isFinite(value as number)) return fallback;
  return `${((value as number) / 100).toFixed(4)}%`;
}

function formatRewardRiskValue(value: number | null, fallback = "Unavailable") {
  if (!Number.isFinite(value as number)) return fallback;
  return (value as number).toFixed(2);
}

function formatPositionAsset(value: number | null, asset: AssetConfig, fallback = "Unavailable") {
  if (!Number.isFinite(value as number)) return fallback;
  return `${(value as number).toFixed(4)} ${asset.shortName}`;
}

function formatDataAge(timestamp?: number | null) {
  if (!timestamp) return "Unavailable";
  return ageLabel(timestamp);
}

function availabilityLabel(value: boolean) {
  return value ? "Available" : "Unavailable";
}

function formatSourceTimestamp(state: AssetState) {
  if (!state.sourceUpdatedAtIso) return "/api/hl/markets updatedAt missing";
  return state.sourceUpdatedAtIso;
}

function assetDataStatus(state: AssetState, now = Date.now()): AssetDataStatus {
  if (state.dataError) return "error";
  if (!state.sourceUpdatedAt) return "loading";
  return now - state.sourceUpdatedAt > 30_000 ? "stale" : "ready";
}

function unavailableLabel(label: string, fields: string[], state: AssetState, endpoint: string) {
  const missing = fields.find((field) => state.missingFields.includes(field)) || fields[0];
  return `${label} unavailable: ${endpoint} ${missing} missing`;
}

function formatMarketValue(
  value: number | null,
  formatter: (value: number | null) => string,
  label: string,
  fields: string[],
  state: AssetState,
) {
  if (Number.isFinite(value as number)) return formatter(value);
  if (state.sourceUpdatedAt) return unavailableLabel(label, fields, state, "/api/hl/markets");
  return "Loading";
}

function formatCandleChange(value: number | null, label: "15m" | "1h", state: AssetState) {
  if (Number.isFinite(value as number)) return formatPct(value, 2);
  if (state.candleError) return state.candleError;
  if (state.candles.length) return `${label} unavailable: /api/hl/candles candle close missing`;
  return "Loading";
}

function formatSpread(value: number | null, state: AssetState) {
  if (Number.isFinite(value as number)) return `${(value as number).toFixed(2)} bps`;
  if (state.bookError) return state.bookError;
  if (state.book) return "spread unavailable: /api/hl/book spreadBps missing";
  return "Loading";
}

function formatDepth10(value: number | null, state: AssetState) {
  if (Number.isFinite(value as number)) return formatUsd(value);
  if (state.bookError) return state.bookError;
  if (state.book) return "depth unavailable: /api/hl/book depth10bpsUsd missing";
  return "Loading";
}

function parsePositiveNumber(value: string) {
  const clean = value.replace(/,/g, ".").trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatPriceInput(value: number | null) {
  if (!Number.isFinite(value as number)) return "";
  const numberValue = value as number;
  if (numberValue >= 1000) return numberValue.toFixed(1);
  if (numberValue >= 100) return numberValue.toFixed(2);
  if (numberValue >= 10) return numberValue.toFixed(3);
  return numberValue.toFixed(4);
}

function defaultStop(side: TicketSide | null, entry: number | null) {
  if (!entry || !side) return null;
  return side === "Long" ? entry * 0.98 : entry * 1.02;
}

function defaultTakeProfit(side: TicketSide | null, entry: number | null) {
  if (!entry || !side) return null;
  return side === "Long" ? entry * 1.04 : entry * 0.96;
}

function effectiveEntryFromDraft(state: AssetState, draft: RiskTicketDraft) {
  if (draft.entryType === "Limit") return parsePositiveNumber(draft.entryPrice);
  if (draft.side === "Long" && Number.isFinite(state.book?.bestAsk as number)) return state.book?.bestAsk ?? null;
  if (draft.side === "Short" && Number.isFinite(state.book?.bestBid as number)) return state.book?.bestBid ?? null;
  return state.market.price;
}

function targetPresetPercents(asset: ApiCoin) {
  if (asset === "BTC") return [0.005, 0.01, 0.02];
  if (asset === "ETH") return [0.0075, 0.015, 0.03];
  return [0.01, 0.025, 0.05];
}

function formatPresetPct(pct: number, side: TicketSide) {
  const sign = side === "Long" ? "+" : "-";
  const pctValue = pct * 100;
  return `${sign}${pctValue % 1 === 0 ? pctValue.toFixed(0) : pctValue.toFixed(2).replace(/0$/, "")}%`;
}

function roundedTargetInput(price: number, assetMeta: PerpAssetMeta | null) {
  if (assetMeta && assetMeta.szDecimals !== null) return roundPriceForPerp(price, assetMeta.szDecimals);
  return formatPriceInput(price);
}

function fundingAgainstPosition(side: TicketSide | null, fundingPct: number | null) {
  if (fundingPct === null || !side) return false;
  return side === "Long" ? fundingPct > 0.01 : fundingPct < -0.01;
}

function estimateLiquidation(side: TicketSide | null, entry: number | null, leverage: number | null) {
  if (!entry || !leverage || leverage <= 0 || !side) return null;
  const maintenanceBuffer = 0.005;
  if (side === "Long") return Math.max(0, entry * (1 - 1 / leverage + maintenanceBuffer));
  return entry * (1 + 1 / leverage - maintenanceBuffer);
}

function liquidationSafety(side: TicketSide | null, stopLoss: number | null, liquidationPrice: number | null, entry: number | null) {
  if (!stopLoss || !liquidationPrice || !entry || !side) return "Unavailable" as const;
  const riskDistance = Math.abs(entry - stopLoss);
  if (riskDistance <= 0) return "Unavailable" as const;
  const distanceBetweenStopAndLiq = side === "Long" ? stopLoss - liquidationPrice : liquidationPrice - stopLoss;
  const ratio = distanceBetweenStopAndLiq / riskDistance;
  if (ratio <= 0.35) return "Dangerous" as const;
  if (ratio <= 1) return "Medium" as const;
  return "Safe" as const;
}

function dataHealth(state: AssetState, wsDebug: WsDebugState, now: number) {
  const pricingLast = state.freshness.meta || state.sourceUpdatedAt || 0;
  const orderBookLast = state.freshness.book || 0;
  const ageSeconds = pricingLast ? Math.max(0, Math.round((now - pricingLast) / 1000)) : null;
  const bookAgeSeconds = orderBookLast ? Math.max(0, Math.round((now - orderBookLast) / 1000)) : null;
  const pricingStatus: DataStatus =
    state.dataError || !pricingLast ? "unavailable" :
    now - pricingLast < 10_000 ? "live" :
    now - pricingLast < 60_000 ? "stale" :
    "unavailable";
  const orderBookStatus: DataStatus =
    state.book && state.book.bestAsk && state.book.bestBid && orderBookLast && now - orderBookLast < 10_000 ? "live" : "unavailable";
  const wsConnected = wsDebug.status === "streaming" || wsDebug.status === "connected";
  const live = pricingStatus === "live";
  return {
    live,
    marketStatus: pricingStatus,
    orderBookStatus,
    wsConnected,
    ageSeconds,
    bookAgeSeconds,
    label: live ? "Market data live" : pricingStatus === "stale" ? "Market data updating" : "Market data connecting",
  };
}

function calculateRiskTicket(
  asset: AssetConfig,
  state: AssetState,
  metrics: MetricBundle,
  draft: RiskTicketDraft,
  wsDebug: WsDebugState,
  now: number,
  assetMeta: PerpAssetMeta | null,
): RiskTicketCalc {
  const preset = riskPresetFor(asset.apiCoin);
  const health = dataHealth(state, wsDebug, now);
  const side: CoreSide | null = draft.side === "Long" ? "long" : draft.side === "Short" ? "short" : null;
  const entryType: CoreEntryType = draft.entryType === "Market" ? "market" : "limit";
  const targetPrice = parsePositiveNumber(draft.targetPrice);
  const maxTotalRiskUsd = parsePositiveNumber(draft.maxTotalRiskUsd);
  const leverage = parsePositiveNumber(draft.leverage);
  const accountEquityUsd = parsePositiveNumber(draft.accountEquityUsd);
  const pricingStatus: DataStatus = health.live ? "live" : health.marketStatus === "stale" ? "stale" : "unavailable";
  const orderBookStatus: DataStatus = state.book && state.freshness.book && now - state.freshness.book < 10_000 ? "live" : "unavailable";
  const estimatedSlippageBps = metrics.spreadBps === null ? preset.maxSlippageBps : Math.min(preset.maxSlippageBps, Math.max(0.1, metrics.spreadBps / 2));
  const builderConfig = getBuilderConfig(false, 0);
  const builderFeeBps = builderConfig.enabled && builderConfig.valid ? builderConfig.feeBps : 0;
  const input: RiskTicketInput = {
    asset: asset.apiCoin,
    side,
    ticketMode: draft.ticketMode,
    entryType,
    entryPrice: parsePositiveNumber(draft.entryPrice),
    targetPrice,
    stopLoss: parsePositiveNumber(draft.stopLoss),
    maxTotalRiskUsd,
    desiredRewardRisk: parsePositiveNumber(draft.desiredRewardRisk) ?? preset.defaultRewardRisk,
    leverage: leverage ?? preset.defaultLeverage,
    marginMode: draft.marginMode === "Cross" ? "cross" : "isolated",
    accountEquityUsd,
  };
  const output = calculateRiskTicketCore(input, {
    markPrice: state.market.price,
    bestBid: state.book?.bestBid ?? null,
    bestAsk: state.book?.bestAsk ?? null,
    oraclePrice: state.market.oraclePx,
    pricingStatus,
    orderBookStatus,
    precision: assetMeta ? { szDecimals: assetMeta.szDecimals, priceDecimals: null } : { szDecimals: null, priceDecimals: null },
  }, {
    entrySlippageBps: estimatedSlippageBps,
    stopSlippageBps: estimatedSlippageBps,
    targetSlippageBps: estimatedSlippageBps,
    builderFeeEntryBps: builderFeeBps,
    builderFeeExitBps: builderFeeBps,
  });

  const warnings: TicketWarning[] = output.warnings.map((warning) => ({
    level: warning.status === "danger" ? "critical" : warning.status === "warning" ? "warning" : "info",
    text: warning.message,
  }));
  if (!health.wsConnected) warnings.push({ level: "info", text: "Flow data is still collecting. Trade planning remains available." });
  if (metrics.liquidityHealthy === false) warnings.push({ level: "warning", text: "Market liquidity is thin near the top of book." });
  if (fundingAgainstPosition(draft.side, state.market.fundingPct)) warnings.push({ level: "warning", text: "Funding is currently against this direction." });
  if (metrics.spreadBps !== null && metrics.spreadBps > preset.maxSpreadBps) warnings.push({ level: "warning", text: "Spread is elevated; market orders may slip." });
  if (accountEquityUsd !== null && maxTotalRiskUsd !== null && accountEquityUsd > 0 && maxTotalRiskUsd / accountEquityUsd > 0.05) {
    warnings.push({ level: "warning", text: "Max total risk is more than 5% of the account equity you entered." });
  }
  if (leverage !== null && leverage >= 10) warnings.push({ level: "warning", text: "Leverage is aggressive. Small price moves leave less room for the plan." });

  const invalidationReason = output.errors[0]?.message || null;
  const confidence =
    invalidationReason ? "Needs correction" :
    health.live ? "Ready for preview" :
    "Simulation only";
  const builderReady = !builderConfig.enabled || builderConfig.status === "approved";
  const executionEnabled = Boolean(ENABLE_REAL_EXECUTION && health.live && orderBookStatus === "live" && !invalidationReason && builderReady && output.precisionAvailable);
  const executionStatus =
    invalidationReason ? "Execution disabled" :
    executionEnabled ? "Execution ready" :
    health.live ? "Preview available" :
    "Simulation only";
  const hasPosition = output.positionSizeUsd !== null && output.positionSizeAssetRaw !== null;
  const estimatedFees = hasPosition ? (output.estimatedEntryFeesUsd ?? 0) + (output.estimatedExitFeesAtStopUsd ?? 0) : null;
  const builderFeeUsd = hasPosition ? (output.estimatedBuilderFeeEntryUsd ?? 0) + (output.estimatedBuilderFeeExitUsd ?? 0) : null;
  const totalEstimatedCostUsd = hasPosition
    ? (output.estimatedEntryFeesUsd ?? 0) + (output.estimatedExitFeesAtStopUsd ?? 0) + (output.estimatedEntrySlippageUsd ?? 0) + (output.estimatedStopSlippageUsd ?? 0) + (output.estimatedBuilderFeeEntryUsd ?? 0) + (output.estimatedBuilderFeeExitUsd ?? 0)
    : null;

  return {
    asset,
    side: draft.side,
    entryPrice: output.effectiveEntryPrice,
    stopLoss: output.stopLoss,
    targetPrice: output.targetPrice,
    maxTotalRiskUsd,
    leverage,
    desiredRewardRisk: input.desiredRewardRisk,
    riskPerUnit: output.riskDistance,
    rewardDistance: output.rewardDistance,
    positionSizeAsset: output.positionSizeAssetRounded,
    positionSizeAssetRaw: output.positionSizeAssetRaw,
    positionSizeUsd: output.positionSizeUsd,
    estimatedLossBeforeCostsUsd: output.estimatedLossBeforeCostsUsd,
    estimatedTotalLossAtStopUsd: output.estimatedTotalLossAtStopUsd,
    estimatedGainUsd: output.estimatedGrossProfitUsd,
    estimatedNetProfitUsd: output.estimatedNetProfitUsd,
    rewardRiskGross: output.rewardRiskGross,
    rewardRiskNet: output.rewardRiskNet,
    riskRewardRatio: output.rewardRiskNet,
    estimatedFees,
    estimatedEntryFeesUsd: output.estimatedEntryFeesUsd,
    estimatedExitFeesAtStopUsd: output.estimatedExitFeesAtStopUsd,
    estimatedExitFeesAtTargetUsd: output.estimatedExitFeesAtTargetUsd,
    estimatedSlippageBps,
    estimatedEntrySlippageUsd: output.estimatedEntrySlippageUsd,
    estimatedStopSlippageUsd: output.estimatedStopSlippageUsd,
    estimatedTargetSlippageUsd: output.estimatedTargetSlippageUsd,
    builderFeeUsd,
    totalEstimatedCostUsd,
    liquidationPrice: output.estimatedLiquidationPrice,
    liquidationDistancePct: output.liquidationDistancePct,
    liquidationSafety: liquidationSafety(draft.side, output.stopLoss, output.estimatedLiquidationPrice, output.effectiveEntryPrice),
    stopTriggerNote: "TP/SL trigger on mark price. Market TP/SL may slip. Preview before signing and verify the final order on Hyperliquid.",
    executionStatus,
    accountEquityUsd,
    marginMode: draft.marginMode,
    invalidationReason,
    confidence,
    warnings,
    dataIsLive: health.live,
    executionEnabled,
  };
}

function directionClass(value: number | null) {
  if (!Number.isFinite(value as number)) return "";
  return (value as number) >= 0 ? "positive" : "negative";
}

function ageLabel(timestamp?: number) {
  if (!timestamp) return "Loading";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 90) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function freshnessState(timestamp?: number): ConnectionState {
  if (!timestamp) return "loading";
  const age = Date.now() - timestamp;
  if (age > 120_000) return "stale";
  return "live";
}

function Tooltip({ label, text }: { label: string; text: string }) {
  return <span className="radar-tip" title={text}>{label}</span>;
}

function Freshness({ timestamp }: { timestamp?: number }) {
  const state = freshnessState(timestamp);
  return <span className={`freshness ${state}`}>{state === "live" ? "Live" : state === "stale" ? "Stale" : "Loading"} {ageLabel(timestamp)}</span>;
}

async function postInfo(body: unknown): Promise<unknown> {
  const response = await fetch("/api/hyperliquid/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Hyperliquid info failed ${response.status}`);
  return response.json();
}

async function fetchMeta(): Promise<unknown> {
  const response = await fetch("/api/hyperliquid/meta", { cache: "no-store" });
  if (!response.ok) throw new Error(`Meta failed ${response.status}`);
  return response.json();
}

async function fetchHlMarkets(): Promise<HlMarketsResponse> {
  const response = await fetch("/api/hl/markets", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      error: payload?.error || `HL markets failed ${response.status}`,
      updatedAt: payload?.updatedAt,
    };
  }
  return payload;
}

async function fetchCandles(coin: ApiCoin): Promise<HlCandlesResponse> {
  const params = new URLSearchParams({ coin, interval: "1m", hours: "24" });
  const response = await fetch(`/api/hl/candles?${params.toString()}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      coin,
      interval: "1m",
      error: payload?.error || `Candles failed ${coin}: ${response.status}`,
      updatedAt: payload?.updatedAt,
    };
  }
  return payload;
}

async function fetchBook(coin: ApiCoin): Promise<HlBookResponse> {
  const params = new URLSearchParams({ coin });
  const response = await fetch(`/api/hl/book?${params.toString()}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      coin,
      error: payload?.error || `Book failed ${coin}: ${response.status}`,
      updatedAt: payload?.updatedAt,
    };
  }
  return payload;
}

async function fetchOiHistory(asset: ApiCoin): Promise<OiHistoryResponse> {
  const params = new URLSearchParams({ asset });
  const response = await fetch(`/api/hl/oi-history?${params.toString()}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      asset,
      currentOiUsd: null,
      oiUsd15mAgo: null,
      oiUsd1hAgo: null,
      oiUsd4hAgo: null,
      oiChange15mPct: null,
      oiChange1hPct: null,
      oiChange4hPct: null,
      availableHistoryMinutes: 0,
      requiredHistoryMinutes: { oi15m: 15, oi1h: 60, oi4h: 240 },
      status: "error",
      error: payload?.error || `OI history failed ${asset}: ${response.status}`,
      updatedAt: payload?.updatedAt,
    };
  }
  return payload;
}

async function fetchContextHistory(coin: ApiCoin): Promise<unknown> {
  const params = new URLSearchParams({ coin });
  const response = await fetch(`/api/hyperliquid/context-history?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return { rows: [] };
  return response.json();
}

function payloadFor(rows: Array<readonly [ApiCoin, unknown]>, coin: ApiCoin) {
  return rows.find((row) => row[0] === coin)?.[1];
}

function normalizeContextHistory(payload: any): { oiHistory: OiPoint[]; fundingHistory: FundingPoint[] } {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const oiHistory = rows
    .map((row: any) => {
      const time = n(row.timestamp);
      const oiUsd = n(row.openInterestUsd);
      if (time === null || oiUsd === null) return null;
      return { time, oiUsd } satisfies OiPoint;
    })
    .filter((row: OiPoint | null): row is OiPoint => row !== null)
    .sort((a: OiPoint, b: OiPoint) => a.time - b.time);
  const fundingHistory = rows
    .map((row: any) => {
      const time = n(row.timestamp);
      const fundingRaw = n(row.funding);
      if (time === null || fundingRaw === null) return null;
      return { time, fundingPct: fundingRaw * 100 } satisfies FundingPoint;
    })
    .filter((row: FundingPoint | null): row is FundingPoint => row !== null)
    .sort((a: FundingPoint, b: FundingPoint) => a.time - b.time);
  return { oiHistory, fundingHistory };
}

function normalizeMeta(payload: unknown): Partial<Record<ApiCoin, MarketCtx>> {
  const tuple = Array.isArray(payload) ? payload : [];
  const meta = tuple[0] as { universe?: Array<{ name: string }> };
  const contexts = tuple[1] as Array<Record<string, unknown>>;
  if (!Array.isArray(meta?.universe) || !Array.isArray(contexts)) return {};

  const result: Partial<Record<ApiCoin, MarketCtx>> = {};
  meta.universe.forEach((asset, index) => {
    if (!ASSET_ORDER.includes(asset.name as ApiCoin)) return;
    const ctx = contexts[index] || {};
    const price = n(ctx.markPx ?? ctx.midPx ?? ctx.oraclePx);
    const midPx = n(ctx.midPx);
    const prevPrice = n(ctx.prevDayPx);
    const fundingRaw = n(ctx.funding);
    const openInterest = n(ctx.openInterest);
    result[asset.name as ApiCoin] = {
      price,
      prevPrice,
      midPx,
      fundingPct: fundingRaw === null ? null : fundingRaw * 100,
      premium: n(ctx.premium),
      openInterestRaw: openInterest,
      oiUsd: openInterest !== null && price !== null ? openInterest * price : null,
      volume24hUsd: n(ctx.dayNtlVlm),
      oraclePx: n(ctx.oraclePx),
    };
  });
  return result;
}

function normalizeHlMarkets(payload: HlMarketsResponse): Partial<Record<ApiCoin, {
  market: MarketCtx;
  missingFields: string[];
  sourceUpdatedAt: number | null;
  sourceUpdatedAtIso: string | null;
}>> {
  if (!payload.ok || !Array.isArray(payload.assets)) return {};
  const result: Partial<Record<ApiCoin, {
    market: MarketCtx;
    missingFields: string[];
    sourceUpdatedAt: number | null;
    sourceUpdatedAtIso: string | null;
  }>> = {};

  payload.assets.forEach((row) => {
    if (!ASSET_ORDER.includes(row.apiCoin)) return;
    const updatedAtIso = row.updatedAt || payload.updatedAt || null;
    const updatedAtMs = updatedAtIso ? Date.parse(updatedAtIso) : NaN;
    const price = n(row.markPx);
    const fundingPct = n(row.fundingPctHourly);
    const oiUsd = n(row.openInterestUsdComputed);
    result[row.apiCoin] = {
      market: {
        price,
        prevPrice: n(row.prevDayPx),
        midPx: n(row.midPx),
        fundingPct,
        premium: null,
        openInterestRaw: n(row.openInterestRaw),
        oiUsd,
        volume24hUsd: n(row.dayNtlVlm),
        oraclePx: n(row.oraclePx),
      },
      missingFields: Array.isArray(row.missingFields) ? row.missingFields : [],
      sourceUpdatedAt: Number.isFinite(updatedAtMs) ? updatedAtMs : null,
      sourceUpdatedAtIso: updatedAtIso,
    };
  });

  return result;
}

function normalizeCandles(payload: unknown): Candle[] {
  const rows = Array.isArray((payload as any)?.candles)
    ? (payload as any).candles
    : Array.isArray(payload)
      ? payload
      : [];
  return rows
    .map((row: any) => {
      const close = n(row.c ?? row.close);
      const open = n(row.o ?? row.open) ?? close;
      const high = n(row.h ?? row.high) ?? close;
      const low = n(row.l ?? row.low) ?? close;
      const time = n(row.t ?? row.time);
      const volume = n(row.v ?? row.volume);
      if (time === null || close === null || open === null || high === null || low === null || volume === null) return null;
      return {
        time,
        open,
        high,
        low,
        close,
        volumeUsd: volume * close,
      } satisfies Candle;
    })
    .filter((row: Candle | null): row is Candle => row !== null)
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-1500) as Candle[];
}

function normalizeLevel(level: any): BookLevel | null {
  const price = n(level.px ?? level.price);
  const size = n(level.sz ?? level.size);
  if (price === null || size === null || price <= 0 || size <= 0) return null;
  return { price, size, usd: price * size };
}

function normalizeBook(payload: any): Book | null {
  const directBestBid = n(payload?.bestBid);
  const directBestAsk = n(payload?.bestAsk);
  const directSpreadBps = n(payload?.spreadBps);
  const directDepth10 = n(payload?.depth10bpsUsd ?? payload?.depth10Bps);
  const directDepth25 = n(payload?.depth25bpsUsd ?? payload?.depth25Bps);
  if (directBestBid !== null && directBestAsk !== null) {
    return {
      bids: [],
      asks: [],
      bestBid: directBestBid,
      bestAsk: directBestAsk,
      spreadBps: directSpreadBps,
      depth10Bps: directDepth10,
      depth25Bps: directDepth25,
      depth50Bps: directDepth25,
    };
  }

  const levels = payload?.levels || payload?.data?.levels;
  if (!Array.isArray(levels)) return null;
  const rawBids = Array.isArray(levels[0]) ? levels[0] : [];
  const rawAsks = Array.isArray(levels[1]) ? levels[1] : [];
  const bids: BookLevel[] = rawBids.map(normalizeLevel).filter((level: BookLevel | null): level is BookLevel => level !== null);
  const asks: BookLevel[] = rawAsks.map(normalizeLevel).filter((level: BookLevel | null): level is BookLevel => level !== null);
  if (!bids.length || !asks.length) return null;
  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const mid = (bestBid + bestAsk) / 2;
  const depthWithinBps = (bps: number) => {
    const lower = mid * (1 - bps / 10_000);
    const upper = mid * (1 + bps / 10_000);
    const bidDepth = bids.filter((level) => level.price >= lower).reduce((sum, level) => sum + level.usd, 0);
    const askDepth = asks.filter((level) => level.price <= upper).reduce((sum, level) => sum + level.usd, 0);
    return bidDepth + askDepth;
  };
  const depth10Bps = depthWithinBps(10);
  const depth25Bps = depthWithinBps(25);
  return {
    bids,
    asks,
    bestBid,
    bestAsk,
    spreadBps: mid > 0 ? ((bestAsk - bestBid) / mid) * 10_000 : null,
    depth10Bps,
    depth25Bps,
    depth50Bps: depth10Bps,
  };
}

function normalizeTrade(row: any, index: number): Trade | null {
  const time = n(row.time ?? row.t);
  const price = n(row.px ?? row.price);
  const size = n(row.sz ?? row.size);
  if (time === null || price === null || size === null || price <= 0 || size <= 0) return null;
  const rawSide = String(row.side ?? row.dir ?? "").trim();
  const normalizedSide = rawSide.toLowerCase();
  const side: "Buy" | "Sell" =
    rawSide === "B" || normalizedSide === "bid" || normalizedSide.includes("buy")
      ? "Buy"
      : "Sell";
  return {
    id: String(row.hash ?? row.tid ?? row.id ?? `${time}-${index}`),
    time,
    rawSide,
    side,
    price,
    size,
    notionalUsd: price * size,
  };
}

function normalizeFundingHistory(payload: unknown): FundingPoint[] {
  return (Array.isArray(payload) ? payload : [])
    .map((row: any) => {
      const time = n(row.time ?? row.t);
      const fundingRaw = n(row.fundingRate ?? row.funding);
      if (time === null || fundingRaw === null) return null;
      return { time, fundingPct: fundingRaw * 100 } satisfies FundingPoint;
    })
    .filter((row: FundingPoint | null): row is FundingPoint => row !== null)
    .sort((a: FundingPoint, b: FundingPoint) => a.time - b.time)
    .slice(-1000);
}

function mergeCandle(existing: Candle[], incoming: Candle) {
  const next = existing.filter((candle) => candle.time !== incoming.time).concat(incoming);
  return next.sort((a, b) => a.time - b.time).slice(-1500);
}

function appendTrades(existing: Trade[], incoming: Trade[]) {
  const byId = new Map<string, Trade>();
  existing.concat(incoming).forEach((trade) => {
    byId.set(trade.id, trade);
  });
  return Array.from(byId.values()).sort((a, b) => b.time - a.time).slice(0, 3000);
}

function appendOi(existing: OiPoint[], oiUsd: number | null) {
  if (!Number.isFinite(oiUsd as number)) return existing;
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return existing.concat({ time: now, oiUsd: oiUsd as number }).filter((row) => row.time >= cutoff).slice(-400);
}

function appendFunding(existing: FundingPoint[], fundingPct: number | null) {
  if (!Number.isFinite(fundingPct as number)) return existing;
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return existing.concat({ time: now, fundingPct: fundingPct as number }).filter((row) => row.time >= cutoff).slice(-1000);
}

function oiWarmupLabel(history: OiPoint[], requiredMinutes: number) {
  if (history.length < 2) return `Live data connecting: 0m / ${requiredMinutes}m`;
  const spanMinutes = Math.floor((history[history.length - 1].time - history[0].time) / 60_000);
  return `Live data connecting: ${Math.max(0, spanMinutes)}m / ${requiredMinutes}m`;
}

function oiBackendLabel(state: AssetState, requiredMinutes: number) {
  const backend = state.backendOi;
  if (!backend) return "Loading backend OI history";
  if (!backend.ok || backend.status === "error") return backend.error || "Backend OI history error";
  if (backend.message) return backend.message;
  if (backend.status === "ready") return "";
  const available = Math.max(0, Math.floor(backend.availableHistoryMinutes || 0));
  const label = available === 0 && (backend.snapshotCount || 0) > 0 ? "<1" : String(available);
  return `Live data connecting: ${label}m / ${requiredMinutes}m`;
}

function priceChange(candles: Candle[], lookbackMs: number) {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const target = last.time - lookbackMs;
  const base = [...candles].reverse().find((candle) => candle.time <= target) || null;
  if (!base || base.close <= 0) return null;
  return ((last.close - base.close) / base.close) * 100;
}

function oiChange(history: OiPoint[], currentOi: number | null, lookbackMs: number) {
  if (!Number.isFinite(currentOi as number)) return null;
  const target = Date.now() - lookbackMs;
  const base = [...history].reverse().find((row) => row.time <= target) || null;
  if (!base || base.oiUsd <= 0) return null;
  return (((currentOi as number) - base.oiUsd) / base.oiUsd) * 100;
}

function windowTrades(trades: Trade[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  return trades.filter((trade) => trade.time >= cutoff);
}

function flowStats(trades: Trade[], windowMs: number) {
  const rows = windowTrades(trades, windowMs);
  if (!rows.length) return { buy: null, sell: null, net: null, netBuy: null, netSell: null, buyRatio: null, sellRatio: null, cvd: null };
  const buy = rows.filter((trade) => trade.side === "Buy").reduce((sum, trade) => sum + trade.notionalUsd, 0);
  const sell = rows.filter((trade) => trade.side === "Sell").reduce((sum, trade) => sum + trade.notionalUsd, 0);
  const total = buy + sell;
  const net = buy - sell;
  return {
    buy,
    sell,
    net,
    netBuy: Math.max(0, net),
    netSell: Math.max(0, -net),
    buyRatio: total > 0 ? (buy / total) * 100 : null,
    sellRatio: total > 0 ? (sell / total) * 100 : null,
    cvd: net,
  };
}

function relativeVolume5m(candles: Candle[]) {
  if (candles.length < 48) return null;
  const last = candles[candles.length - 1];
  const currentStart = last.time - 5 * 60_000;
  const current = candles.filter((candle) => candle.time >= currentStart).reduce((sum, candle) => sum + candle.volumeUsd, 0);
  const samples: number[] = [];
  for (let index = 0; index < candles.length; index += 5) {
    const bucket = candles.slice(index, index + 5);
    if (bucket.length === 5) samples.push(bucket.reduce((sum, candle) => sum + candle.volumeUsd, 0));
  }
  if (samples.length < 48) return null;
  const baseline = median(samples.slice(0, -1));
  if (!baseline || baseline <= 0) return null;
  return current / baseline;
}

function metricsFor(asset: AssetConfig, state: AssetState): MetricBundle {
  const five = flowStats(state.trades, 5 * 60_000);
  const fifteen = flowStats(state.trades, 15 * 60_000);
  const oneHour = flowStats(state.trades, 60 * 60_000);
  const spreadBps = state.book?.spreadBps ?? null;
  const depth10Bps = state.book?.depth10Bps ?? null;
  const depth25Bps = state.book?.depth25Bps ?? null;
  const liquidityHealthy =
    spreadBps === null || depth10Bps === null
      ? null
      : spreadBps <= 4 && depth10Bps >= asset.thresholds.minDepthUsd;
  const funding = state.market.fundingPct;
  const backendOi = state.backendOi?.ok ? state.backendOi : null;
  return {
    price15m: priceChange(state.candles, 15 * 60_000),
    price1h: priceChange(state.candles, 60 * 60_000),
    price24h: state.market.price !== null && state.market.prevPrice ? ((state.market.price - state.market.prevPrice) / state.market.prevPrice) * 100 : null,
    oi15m: n(backendOi?.oiChange15mPct),
    oi1h: n(backendOi?.oiChange1hPct),
    oi4h: n(backendOi?.oiChange4hPct),
    takerBuy5m: five.buy,
    takerSell5m: five.sell,
    buyNotional5m: five.buy,
    sellNotional5m: five.sell,
    takerBuy15m: fifteen.buy,
    takerSell15m: fifteen.sell,
    takerBuyRatio5m: five.buyRatio,
    takerSellRatio5m: five.sellRatio,
    netBuyFlow5m: five.netBuy,
    netSellFlow5m: five.netSell,
    netFlow5m: five.net,
    netFlow15m: fifteen.net,
    buyRatio5m: five.buyRatio,
    sellRatio5m: five.sellRatio,
    cvd5m: five.cvd,
    cvd15m: fifteen.cvd,
    cvd1h: oneHour.cvd,
    relativeVolume5m: relativeVolume5m(state.candles),
    liquidityHealthy,
    spreadBps,
    depth10Bps,
    depth25Bps,
    depth50Bps: depth10Bps,
    fundingDailyPct: funding === null ? null : funding * 24,
    fundingAnnualizedPct: funding === null ? null : funding * 24 * 365,
    fundingAbsExtreme: funding === null ? null : Math.abs(funding) >= asset.thresholds.fundingPct * 2,
    fundingPct: funding,
  };
}

function componentScore(value: number, threshold: number, inverse = false) {
  if (!Number.isFinite(value) || threshold <= 0) return null;
  const ratio = inverse ? threshold / Math.max(threshold, value) : value / threshold;
  return clamp(ratio * 100, 0, 100);
}

function condition(
  ok: boolean | null,
  label: string,
  currentValue: string,
  targetValue: string,
  unavailableReason: string,
  passed: string[],
  missing: string[],
  details: string[],
) {
  if (ok === true) {
    const line = `${label}: ${currentValue} / target ${targetValue} PASS`;
    passed.push(line);
    details.push(line);
    return;
  }
  if (ok === false) {
    const line = `${label}: ${currentValue} / target ${targetValue} FAIL`;
    missing.push(line);
    details.push(line);
    return;
  }
  const line = `${label}: unavailable because ${unavailableReason}`;
  missing.push(line);
  details.push(line);
}

function metricOrUnavailable(value: number | null, formatter: (value: number | null) => string) {
  return value === null ? "unavailable" : formatter(value);
}

function signalStatus(score: number | null, active: boolean): SignalStatus {
  if (score === null) return "not_evaluable_data_missing";
  if (active) return "active";
  if (score >= 65) return "near";
  return "inactive";
}

function averageScore(scores: Array<number | null | undefined>) {
  const usable = scores.filter((value): value is number => Number.isFinite(value as number));
  return usable.length ? Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length) : null;
}

function booleanScore(value: boolean | null) {
  if (value === null) return null;
  return value ? 100 : 0;
}

function positiveThresholdScore(value: number | null, threshold: number) {
  if (value === null) return null;
  return componentScore(Math.max(0, value), threshold) ?? 0;
}

function negativeThresholdScore(value: number | null, threshold: number) {
  if (value === null) return null;
  return componentScore(Math.max(0, -value), threshold) ?? 0;
}

function flowMissingInputs(kind: SignalKind, metrics: MetricBundle) {
  const missing: string[] = [];
  if (kind === "Fresh Long") {
    if (metrics.takerBuyRatio5m === null) missing.push("taker buy ratio 5m");
    if (metrics.netBuyFlow5m === null) missing.push("net buy flow 5m");
    if (metrics.cvd5m === null) missing.push("CVD 5m");
  }
  if (kind === "Fresh Short") {
    if (metrics.takerSellRatio5m === null) missing.push("taker sell ratio 5m");
    if (metrics.netSellFlow5m === null) missing.push("net sell flow 5m");
    if (metrics.cvd5m === null) missing.push("CVD 5m");
  }
  if (kind === "Crowded Long") {
    if (metrics.takerBuyRatio5m === null) missing.push("taker buy ratio 5m");
    if (metrics.netBuyFlow5m === null) missing.push("net buy flow 5m");
    if (metrics.cvd5m === null) missing.push("CVD 5m");
  }
  if (kind === "Crowded Short") {
    if (metrics.takerSellRatio5m === null) missing.push("taker sell ratio 5m");
    if (metrics.netSellFlow5m === null) missing.push("net sell flow 5m");
    if (metrics.cvd5m === null) missing.push("CVD 5m");
  }
  return missing;
}

function scoreParts(asset: AssetConfig, metrics: MetricBundle, kind: SignalKind) {
  const t = asset.thresholds;
  const fundingNotExtremeScore = metrics.fundingAbsExtreme === null ? null : metrics.fundingAbsExtreme ? 0 : 100;
  const liquidityScore = booleanScore(metrics.liquidityHealthy);
  const flowMissing = flowMissingInputs(kind, metrics);
  const cvdLongScore = metrics.cvd5m === null ? undefined : metrics.cvd5m > 0 ? 100 : 0;
  const cvdShortScore = metrics.cvd5m === null ? undefined : metrics.cvd5m < 0 ? 100 : 0;
  const crowdedLongFlowScore = metrics.cvd5m === null ? undefined : metrics.cvd5m <= 0 ? 100 : 0;
  const crowdedShortFlowScore = metrics.cvd5m === null ? undefined : metrics.cvd5m >= 0 ? 100 : 0;

  if (kind === "Fresh Long") {
    return {
      structureScore: averageScore([
        positiveThresholdScore(metrics.price15m, t.price15mPct),
        positiveThresholdScore(metrics.oi15m, t.oi15mPct),
        liquidityScore,
        fundingNotExtremeScore,
      ]),
      flowScore: flowMissing.length ? null : averageScore([
        positiveThresholdScore(metrics.takerBuyRatio5m, 60),
        positiveThresholdScore(metrics.netBuyFlow5m, t.flow5mUsd),
        cvdLongScore,
      ]),
      flowMissing,
    };
  }

  if (kind === "Fresh Short") {
    return {
      structureScore: averageScore([
        negativeThresholdScore(metrics.price15m, t.price15mPct),
        positiveThresholdScore(metrics.oi15m, t.oi15mPct),
        liquidityScore,
        fundingNotExtremeScore,
      ]),
      flowScore: flowMissing.length ? null : averageScore([
        positiveThresholdScore(metrics.takerSellRatio5m, 60),
        positiveThresholdScore(metrics.netSellFlow5m, t.flow5mUsd),
        cvdShortScore,
      ]),
      flowMissing,
    };
  }

  if (kind === "Crowded Long") {
    const fundingScore = metrics.fundingPct === null ? null : metrics.fundingPct >= t.fundingPct ? 100 : positiveThresholdScore(metrics.fundingPct, t.fundingPct);
    const priceStallingScore = metrics.price15m === null ? null : metrics.price15m <= t.price15mPct * 0.35 ? 100 : 0;
    return {
      structureScore: averageScore([
        fundingScore,
        positiveThresholdScore(metrics.oi4h, t.oi4hPct),
        priceStallingScore,
        liquidityScore,
      ]),
      flowScore: flowMissing.length ? null : averageScore([
        metrics.takerBuyRatio5m === null ? null : metrics.takerBuyRatio5m <= 55 ? 100 : 0,
        metrics.netBuyFlow5m === null ? null : metrics.netBuyFlow5m <= t.flow5mUsd * 0.35 ? 100 : 0,
        crowdedLongFlowScore,
      ]),
      flowMissing,
    };
  }

  const fundingScore = metrics.fundingPct === null ? null : metrics.fundingPct <= -t.fundingPct ? 100 : negativeThresholdScore(metrics.fundingPct, t.fundingPct);
  const priceStallingScore = metrics.price15m === null ? null : metrics.price15m >= -t.price15mPct * 0.35 ? 100 : 0;
  return {
    structureScore: averageScore([
      fundingScore,
      positiveThresholdScore(metrics.oi4h, t.oi4hPct),
      priceStallingScore,
      liquidityScore,
    ]),
    flowScore: flowMissing.length ? null : averageScore([
      metrics.takerSellRatio5m === null ? null : metrics.takerSellRatio5m <= 55 ? 100 : 0,
      metrics.netSellFlow5m === null ? null : metrics.netSellFlow5m <= t.flow5mUsd * 0.35 ? 100 : 0,
      crowdedShortFlowScore,
    ]),
    flowMissing,
  };
}

function finalSignalScore(structureScore: number | null, flowScore: number | null) {
  if (structureScore === null || flowScore === null) return null;
  return Math.round(structureScore * 0.6 + flowScore * 0.4);
}

function flowInputLines(metrics: MetricBundle) {
  return [
    `takerBuyRatio5m ${formatPct(metrics.takerBuyRatio5m, 1, "collecting", false)}`,
    `takerSellRatio5m ${formatPct(metrics.takerSellRatio5m, 1, "collecting", false)}`,
    `netBuyFlow5m ${formatUsd(metrics.netBuyFlow5m, "collecting")}`,
    `netSellFlow5m ${formatUsd(metrics.netSellFlow5m, "collecting")}`,
    `CVD 5m ${formatUsd(metrics.cvd5m, "collecting")}`,
    `CVD 15m ${formatUsd(metrics.cvd15m, "collecting")}`,
  ];
}

function buildSignal(asset: AssetConfig, metrics: MetricBundle, kind: SignalKind): SignalReadiness {
  const passed: string[] = [];
  const missing: string[] = [];
  const details: string[] = [];
  const t = asset.thresholds;
  const funding = metrics.fundingAbsExtreme;
  const liquidity = metrics.liquidityHealthy;

  if (kind === "Fresh Long") {
    const priceOk = metrics.price15m === null ? null : metrics.price15m > t.price15mPct;
    const oiOk = metrics.oi15m === null ? null : metrics.oi15m >= t.oi15mPct;
    const ratioOk = metrics.takerBuyRatio5m === null ? null : metrics.takerBuyRatio5m > 60;
    const flowOk = metrics.netBuyFlow5m === null ? null : metrics.netBuyFlow5m >= t.flow5mUsd;
    const cvdOk = metrics.cvd5m === null ? null : metrics.cvd5m > 0;
    const fundingOk = funding === null ? null : !funding;
    condition(priceOk, "Price 15m", metricOrUnavailable(metrics.price15m, (value) => formatPct(value, 2)), `> ${formatPct(t.price15mPct, 2, "", false)}`, "/api/hl/candles priceChange15mPct missing", passed, missing, details);
    condition(oiOk, "OI 15m", metricOrUnavailable(metrics.oi15m, (value) => formatPct(value, 2)), `>= ${formatPct(t.oi15mPct, 2, "", false)}`, "backend OI history has not reached 15 minutes", passed, missing, details);
    condition(ratioOk, "Taker buy ratio 5m", metricOrUnavailable(metrics.takerBuyRatio5m, (value) => formatPct(value, 1, "unavailable", false)), "> 60.0%", "Flow data still collecting", passed, missing, details);
    condition(flowOk, "Net buy flow 5m", metricOrUnavailable(metrics.netBuyFlow5m, formatUsd), `>= ${formatUsd(t.flow5mUsd)}`, "Flow data still collecting", passed, missing, details);
    condition(cvdOk, "CVD 5m", metricOrUnavailable(metrics.cvd5m, formatUsd), "> $0", "Flow data still collecting", passed, missing, details);
    condition(liquidity, "Liquidity", metrics.spreadBps === null || metrics.depth10Bps === null ? "unavailable" : `spread ${metrics.spreadBps.toFixed(2)} bps / depth ${formatUsd(metrics.depth10Bps)}`, `spread <= 4 bps and depth >= ${formatUsd(t.minDepthUsd)}`, "/api/hl/book spreadBps or depth10bpsUsd missing", passed, missing, details);
    condition(fundingOk, "Funding", metricOrUnavailable(metrics.fundingPct, formatFunding), `abs < ${formatFunding(t.fundingPct * 2)}`, "/api/hl/markets fundingRaw missing", passed, missing, details);
  }

  if (kind === "Fresh Short") {
    const priceOk = metrics.price15m === null ? null : metrics.price15m < -t.price15mPct;
    const oiOk = metrics.oi15m === null ? null : metrics.oi15m >= t.oi15mPct;
    const ratioOk = metrics.takerSellRatio5m === null ? null : metrics.takerSellRatio5m > 60;
    const flowOk = metrics.netSellFlow5m === null ? null : metrics.netSellFlow5m >= t.flow5mUsd;
    const cvdOk = metrics.cvd5m === null ? null : metrics.cvd5m < 0;
    const fundingOk = funding === null ? null : !funding;
    condition(priceOk, "Price 15m", metricOrUnavailable(metrics.price15m, (value) => formatPct(value, 2)), `< -${formatPct(t.price15mPct, 2, "", false)}`, "/api/hl/candles priceChange15mPct missing", passed, missing, details);
    condition(oiOk, "OI 15m", metricOrUnavailable(metrics.oi15m, (value) => formatPct(value, 2)), `>= ${formatPct(t.oi15mPct, 2, "", false)}`, "backend OI history has not reached 15 minutes", passed, missing, details);
    condition(ratioOk, "Taker sell ratio 5m", metricOrUnavailable(metrics.takerSellRatio5m, (value) => formatPct(value, 1, "unavailable", false)), "> 60.0%", "Flow data still collecting", passed, missing, details);
    condition(flowOk, "Net sell flow 5m", metricOrUnavailable(metrics.netSellFlow5m, formatUsd), `>= ${formatUsd(t.flow5mUsd)}`, "Flow data still collecting", passed, missing, details);
    condition(cvdOk, "CVD 5m", metricOrUnavailable(metrics.cvd5m, formatUsd), "< $0", "Flow data still collecting", passed, missing, details);
    condition(liquidity, "Liquidity", metrics.spreadBps === null || metrics.depth10Bps === null ? "unavailable" : `spread ${metrics.spreadBps.toFixed(2)} bps / depth ${formatUsd(metrics.depth10Bps)}`, `spread <= 4 bps and depth >= ${formatUsd(t.minDepthUsd)}`, "/api/hl/book spreadBps or depth10bpsUsd missing", passed, missing, details);
    condition(fundingOk, "Funding", metricOrUnavailable(metrics.fundingPct, formatFunding), `abs < ${formatFunding(t.fundingPct * 2)}`, "/api/hl/markets fundingRaw missing", passed, missing, details);
  }

  if (kind === "Crowded Long") {
    const fundingOk = metrics.fundingPct === null ? null : metrics.fundingPct >= t.fundingPct;
    const oiOk = metrics.oi4h === null ? null : metrics.oi4h >= t.oi4hPct;
    const priceOk = metrics.price15m === null ? null : metrics.price15m <= t.price15mPct * 0.35;
    const positioningOk = metrics.takerBuyRatio5m === null || metrics.netBuyFlow5m === null || metrics.cvd5m === null ? null : metrics.takerBuyRatio5m <= 55 || metrics.netBuyFlow5m <= t.flow5mUsd * 0.35 || metrics.cvd5m <= 0;
    condition(fundingOk, "Hourly funding", metricOrUnavailable(metrics.fundingPct, formatFunding), `> ${formatFunding(t.fundingPct)}`, "/api/hl/markets fundingRaw missing", passed, missing, details);
    condition(oiOk, "OI 4h", metricOrUnavailable(metrics.oi4h, (value) => formatPct(value, 2)), `>= ${formatPct(t.oi4hPct, 2, "", false)}`, "backend OI history has not reached 240 minutes", passed, missing, details);
    condition(priceOk, "Price momentum", metricOrUnavailable(metrics.price15m, (value) => formatPct(value, 2)), `<= ${formatPct(t.price15mPct * 0.35, 2, "", false)}`, "/api/hl/candles priceChange15mPct missing", passed, missing, details);
    condition(liquidity, "Liquidity", metrics.spreadBps === null || metrics.depth10Bps === null ? "unavailable" : `spread ${metrics.spreadBps.toFixed(2)} bps / depth ${formatUsd(metrics.depth10Bps)}`, `spread <= 4 bps and depth >= ${formatUsd(t.minDepthUsd)}`, "/api/hl/book spreadBps or depth10bpsUsd missing", passed, missing, details);
    condition(positioningOk, "Long-side taker pressure weakening", metrics.takerBuyRatio5m === null ? "unavailable" : `${formatPct(metrics.takerBuyRatio5m, 1, "unavailable", false)} buy ratio / ${formatUsd(metrics.netBuyFlow5m)} net buy / CVD ${formatUsd(metrics.cvd5m)}`, `buy ratio <= 55% or net buy <= ${formatUsd(t.flow5mUsd * 0.35)} or CVD <= $0`, "Flow data still collecting", passed, missing, details);
  }

  if (kind === "Crowded Short") {
    const fundingOk = metrics.fundingPct === null ? null : metrics.fundingPct <= -t.fundingPct;
    const oiOk = metrics.oi4h === null ? null : metrics.oi4h >= t.oi4hPct;
    const priceOk = metrics.price15m === null ? null : metrics.price15m >= -t.price15mPct * 0.35;
    const positioningOk = metrics.takerSellRatio5m === null || metrics.netSellFlow5m === null || metrics.cvd5m === null ? null : metrics.takerSellRatio5m <= 55 || metrics.netSellFlow5m <= t.flow5mUsd * 0.35 || metrics.cvd5m >= 0;
    condition(fundingOk, "Hourly funding", metricOrUnavailable(metrics.fundingPct, formatFunding), `< -${formatPct(t.fundingPct, 4, "", false)}`, "/api/hl/markets fundingRaw missing", passed, missing, details);
    condition(oiOk, "OI 4h", metricOrUnavailable(metrics.oi4h, (value) => formatPct(value, 2)), `>= ${formatPct(t.oi4hPct, 2, "", false)}`, "backend OI history has not reached 240 minutes", passed, missing, details);
    condition(priceOk, "Downside momentum", metricOrUnavailable(metrics.price15m, (value) => formatPct(value, 2)), `>= -${formatPct(t.price15mPct * 0.35, 2, "", false)}`, "/api/hl/candles priceChange15mPct missing", passed, missing, details);
    condition(liquidity, "Liquidity", metrics.spreadBps === null || metrics.depth10Bps === null ? "unavailable" : `spread ${metrics.spreadBps.toFixed(2)} bps / depth ${formatUsd(metrics.depth10Bps)}`, `spread <= 4 bps and depth >= ${formatUsd(t.minDepthUsd)}`, "/api/hl/book spreadBps or depth10bpsUsd missing", passed, missing, details);
    condition(positioningOk, "Short-side taker pressure weakening", metrics.takerSellRatio5m === null ? "unavailable" : `${formatPct(metrics.takerSellRatio5m, 1, "unavailable", false)} sell ratio / ${formatUsd(metrics.netSellFlow5m)} net sell / CVD ${formatUsd(metrics.cvd5m)}`, `sell ratio <= 55% or net sell <= ${formatUsd(t.flow5mUsd * 0.35)} or CVD >= $0`, "Flow data still collecting", passed, missing, details);
  }

  const { structureScore, flowScore, flowMissing } = scoreParts(asset, metrics, kind);
  const finalScore = finalSignalScore(structureScore, flowScore);
  const score = finalScore;
  const active = finalScore !== null && finalScore >= 80 && missing.length === 0;
  const status: SignalStatus =
    structureScore === null
      ? "not_evaluable_data_missing"
      : flowScore === null && flowMissing.length
      ? "not_evaluable_flow_missing"
      : signalStatus(finalScore, active);
  const flowReason = flowMissing.length
    ? `${flowMissing.join(" and ")} ${flowMissing.length > 1 ? "are" : "is"} unavailable because WebSocket trades are not streaming.`
    : "";
  return {
    asset: asset.apiCoin,
    kind,
    score,
    structureScore,
    flowScore,
    finalScore,
    status,
    active,
    passed,
    missing,
    flowMissing,
    details,
    flowInputs: flowInputLines(metrics),
    explanation: active ? `${asset.shortName} has an active ${kind.toLowerCase()} setup.` : flowReason || details[0] || "Not evaluated: waiting for price/funding/OI/flow data",
  };
}

function allSignals(asset: AssetConfig, metrics: MetricBundle) {
  return PRESET_KINDS.map((kind) => buildSignal(asset, metrics, kind));
}

function rankSignals(signals: SignalReadiness[]) {
  return [...signals].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.finalScore ?? b.structureScore ?? -1) - (a.finalScore ?? a.structureScore ?? -1);
  });
}

function bestSignal(signals: SignalReadiness[]) {
  return rankSignals(signals)[0] || null;
}

function summarySignalText(signal: SignalReadiness | null) {
  if (!signal || signal.finalScore === null) return "None";
  return `${signal.asset} ${signal.kind} - ${signal.status} - ${signal.finalScore}%`;
}

function signalBadge(signal: SignalReadiness | null) {
  if (!signal) return "Not evaluated";
  if (signal.finalScore === null && signal.status === "not_evaluable_flow_missing") return "Flow collecting";
  if (signal.finalScore === null) return signal.status === "not_evaluable_data_missing" ? "Data missing" : "Not evaluated";
  if (signal.active) return signal.kind;
  if (signal.status === "near") return `Near ${signal.kind}`;
  return "Inactive";
}

function buildFlowEvents(asset: AssetConfig, state: AssetState, metrics: MetricBundle): FlowEvent[] {
  const events: FlowEvent[] = [];
  const recentTrades = state.trades;
  const sourceStatus: FlowEvent["status"] = freshnessState(state.freshness.trades) === "stale" ? "stale" : "live";

  recentTrades
    .filter((trade) => trade.notionalUsd >= asset.thresholds.largeTradeUsd)
    .slice(0, 15)
    .forEach((trade) => {
      events.push({
        id: `${asset.apiCoin}-large-${trade.id}`,
        time: trade.time,
        asset: asset.apiCoin,
        event: "Large trade",
        eventType: "Large trade",
        side: trade.side,
        size: formatUsd(trade.notionalUsd),
        notionalUsd: trade.notionalUsd,
        price: trade.price,
        context: `single taker ${trade.side.toLowerCase()} >= ${formatUsd(asset.thresholds.largeTradeUsd)}`,
        source: "websocket trades",
        status: sourceStatus,
      });
    });

  if (metrics.netFlow5m !== null && Math.abs(metrics.netFlow5m) >= asset.thresholds.flow5mUsd) {
    const side = metrics.netFlow5m >= 0 ? "Buy" : "Sell";
    events.push({
      id: `${asset.apiCoin}-burst-${side}-${Math.round(Date.now() / 60_000)}`,
      time: Date.now(),
      asset: asset.apiCoin,
      event: "Flow burst",
      eventType: "Flow burst",
      side,
      size: formatUsd(Math.abs(metrics.netFlow5m)),
      notionalUsd: Math.abs(metrics.netFlow5m),
      price: state.market.price,
      context: `5m net ${side.toLowerCase()} flow >= ${formatUsd(asset.thresholds.flow5mUsd)}`,
      source: "websocket trades",
      status: sourceStatus,
    });
  }

  return events.sort((a, b) => b.time - a.time).slice(0, 25);
}

function normalizeStoredFlowEvents(payload: any): FlowEvent[] {
  const rows = Array.isArray(payload?.events) ? payload.events : [];
  return rows
    .map((row: any) => {
      const time = n(row.ts);
      if (!time || !ASSET_ORDER.includes(row.asset)) return null;
      return {
        id: String(row.id),
        time,
        asset: row.asset as ApiCoin,
        event: String(row.eventType || "").replaceAll("_", " "),
        eventType: String(row.eventType || "").replaceAll("_", " "),
        side: row.side || "-",
        size: row.notionalUsd === null || row.notionalUsd === undefined ? "-" : formatUsd(n(row.notionalUsd)),
        notionalUsd: n(row.notionalUsd),
        price: n(row.price),
        context: String(row.context || row.signalHint || "stored backend event"),
        source: "websocket trades",
        status: "live",
      } satisfies FlowEvent;
    })
    .filter((event: FlowEvent | null): event is FlowEvent => event !== null);
}

function parseUsdLabel(label: string) {
  const match = label.replace(/[$,]/g, "").match(/^(-?\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "B" ? 1_000_000_000 : suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  return value * multiplier;
}

function flowEventPayload(event: FlowEvent) {
  const eventType =
    event.eventType === "Large trade" ? "large_trade" :
    event.eventType === "Flow burst" ? "flow_burst" :
    "liquidity_thin";
  return {
    id: event.id,
    ts: event.time,
    asset: event.asset,
    eventType,
    side: event.side,
    notionalUsd: event.notionalUsd,
    price: event.price,
    context: event.context,
    signalHint: event.eventType,
    source: event.source,
    status: event.status,
    rawPayload: event,
    createdAt: new Date(event.time).toISOString(),
  };
}

function marketState(signals: SignalReadiness[], metricsByAsset: Record<ApiCoin, MetricBundle>, dataReady: boolean, connection: ConnectionState) {
  if (connection === "failed") return "API error";
  if (connection === "loading") return "Initializing";
  if (!dataReady) return "Live data connecting";
  if (connection === "stale") return "Stale";
  const active = signals.filter((signal) => signal.active);
  const thinAssets = ASSETS.filter((asset) => metricsByAsset[asset.apiCoin].liquidityHealthy === false);
  if (thinAssets.length >= 2) return "Liquidity Thin";
  if (thinAssets.length === 1) return "Mixed";
  if (active.some((signal) => signal.kind === "Crowded Long")) return "Crowded Long";
  if (active.some((signal) => signal.kind === "Crowded Short")) return "Crowded Short";
  if (active.some((signal) => signal.kind === "Fresh Long")) return "Risk-on";
  if (active.some((signal) => signal.kind === "Fresh Short")) return "Risk-off";
  return "Neutral";
}

function marketAssetWarning(metricsByAsset: Record<ApiCoin, MetricBundle>) {
  const thinAssets = ASSETS.filter((asset) => metricsByAsset[asset.apiCoin].liquidityHealthy === false);
  if (thinAssets.length !== 1) return "";
  const asset = thinAssets[0];
  const metrics = metricsByAsset[asset.apiCoin];
  return `Asset Warning: ${asset.shortName} liquidity thin - ${asset.shortName} depth ±10 bps ${formatUsd(metrics.depth10Bps, "unavailable")} / target ${formatUsd(asset.thresholds.minDepthUsd)}`;
}

function marketSentence(signal: SignalReadiness | null, state: string) {
  if (state === "Initializing") return "Connecting to Hyperliquid and loading BTC, ETH and HYPE source data.";
  if (state === "Live data connecting") return "Live data is arriving; advanced windows need a little more history.";
  if (state === "Stale") return "The stream is stale; values stay visible but should not be treated as live.";
  if (state === "API error") return "Hyperliquid source data is temporarily unavailable.";
  if (signal?.active) return `${signal.asset} is the cleanest active setup: ${signal.kind.toLowerCase()}.`;
  if (state === "Liquidity Thin") return "Liquidity is thin on at least one watched asset; avoid treating wicks as clean signals.";
  if (state === "Mixed") return "One watched asset has a liquidity warning; BTC and ETH are not implied as thin when they pass checks.";
  return "No scanner setup right now. You can still build your own trade.";
}

function intervalMs(interval: ChartInterval) {
  return CHART_INTERVALS.find((row) => row.key === interval)?.ms || 5 * 60_000;
}

function aggregateCandles(candles: Candle[], interval: ChartInterval) {
  const bucketSize = intervalMs(interval);
  if (interval === "1m") return candles.slice(-360);
  const buckets = new Map<number, Candle[]>();
  candles.forEach((candle: Candle) => {
    const bucketTime = Math.floor(candle.time / bucketSize) * bucketSize;
    const group = buckets.get(bucketTime) || [];
    group.push(candle);
    buckets.set(bucketTime, group);
  });
  return Array.from(buckets.entries())
    .map(([time, rows]) => ({
      time,
      open: rows[0].open,
      high: Math.max(...rows.map((row: Candle) => row.high)),
      low: Math.min(...rows.map((row: Candle) => row.low)),
      close: rows[rows.length - 1].close,
      volumeUsd: rows.reduce((sum: number, row: Candle) => sum + row.volumeUsd, 0),
    }))
    .sort((a: Candle, b: Candle) => a.time - b.time)
    .slice(-360);
}

function bucketLine(points: ChartPoint[], interval: ChartInterval) {
  const bucketSize = intervalMs(interval);
  const buckets = new Map<number, ChartPoint>();
  points.forEach((point: ChartPoint) => {
    const bucketTime = Math.floor(point.time / bucketSize) * bucketSize;
    buckets.set(bucketTime, { time: bucketTime, value: point.value });
  });
  return Array.from(buckets.values()).sort((a: ChartPoint, b: ChartPoint) => a.time - b.time).slice(-360);
}

function cvdPoints(trades: Trade[], interval: ChartInterval) {
  let cumulative = 0;
  const rows = [...trades]
    .sort((a: Trade, b: Trade) => a.time - b.time)
    .map((trade: Trade) => {
      cumulative += trade.side === "Buy" ? trade.notionalUsd : -trade.notionalUsd;
      return { time: trade.time, value: cumulative };
    });
  return bucketLine(rows, interval);
}

function lineBounds(points: ChartPoint[]) {
  const values = points.map((point: ChartPoint) => point.value).filter(Number.isFinite);
  if (!values.length) return { min: 0, max: 1, latest: null };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.max(Math.abs(max), 1) * 0.002);
  return { min: min - span * 0.08, max: max + span * 0.08, latest: points[points.length - 1]?.value ?? null };
}

function buildChartDataset(state: AssetState, mode: ChartMode, interval: ChartInterval): ChartDataset {
  if (mode === "price") {
    const candles = aggregateCandles(state.candles, interval);
    const values = candles.flatMap((candle: Candle) => [candle.high, candle.low]).filter(Number.isFinite);
    if (values.length < 2) {
      return { kind: "candles", label: "Price", valueLabel: "USD", points: [], min: 0, max: 1, latest: null, emptyReason: "Loading price candle backfill..." };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, max * 0.001);
    return {
      kind: "candles",
      label: "Price candles",
      valueLabel: "USD",
      points: candles,
      min: min - span * 0.08,
      max: max + span * 0.08,
      latest: candles[candles.length - 1]?.close ?? null,
      emptyReason: "Loading price candle backfill...",
    };
  }

  if (mode === "oi") {
    const points = bucketLine(state.oiHistory.map((row: OiPoint) => ({ time: row.time, value: row.oiUsd })), interval);
    const bounds = lineBounds(points);
    return { kind: "line", label: "Open Interest", valueLabel: "USD", points, ...bounds, emptyReason: "OI needs two live snapshots before the line can be drawn." };
  }

  if (mode === "cvd") {
    const points = cvdPoints(state.trades, interval);
    const bounds = lineBounds(points);
    return { kind: "line", label: "CVD", valueLabel: "USD", points, ...bounds, emptyReason: "CVD starts when live trades arrive from Hyperliquid." };
  }

  const points = bucketLine(state.fundingHistory.map((row: FundingPoint) => ({ time: row.time, value: row.fundingPct })), interval);
  const bounds = lineBounds(points);
  return { kind: "line", label: "Hourly Funding", valueLabel: "PCT", points, ...bounds, emptyReason: "Funding history is loading from Hyperliquid." };
}

function formatChartValue(value: number, mode: ChartMode) {
  if (mode === "funding") return formatFunding(value);
  return formatUsd(value, "");
}

function formatChartTime(time: number, interval: ChartInterval) {
  const date = new Date(time);
  if (interval === "1h") {
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" });
  }
  return date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}

function TradingChart({ state, mode, interval }: { state: AssetState; mode: ChartMode; interval: ChartInterval }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [logicalRange, setLogicalRange] = useState<LogicalRange | null>(null);
  const [manualYRange, setManualYRange] = useState<ValueRange | null>(null);
  const [drag, setDrag] = useState<ChartDragState | null>(null);
  const dataset = useMemo(() => buildChartDataset(state, mode, interval), [state, mode, interval]);
  const points = dataset.points;

  useEffect(() => {
    setHoverIndex(null);
    setLogicalRange(null);
    setManualYRange(null);
    setDrag(null);
  }, [mode, interval]);

  const needsMore = points.length < 2;
  if (needsMore) {
    return (
      <div className="radar-chart trading-chart empty-chart">
        <div>
          <strong>{dataset.label}</strong>
          <span>{dataset.emptyReason}</span>
        </div>
      </div>
    );
  }

  const width = 940;
  const height = 360;
  const plot = { left: 48, right: 92, top: 24, bottom: 46 };
  const chartRight = width - plot.right;
  const chartBottom = height - plot.bottom;
  const plotWidth = chartRight - plot.left;
  const plotHeight = chartBottom - plot.top;
  const minWindow = Math.min(Math.max(points.length - 1, 1), 18);
  const maxWindow = Math.max(points.length - 1, 1);
  const defaultBars = Math.min(points.length, interval === "1m" ? 170 : interval === "5m" ? 190 : 220);

  function normalizeRange(range: LogicalRange): LogicalRange {
    if (points.length <= 2) return { from: 0, to: points.length - 1 };
    const width = clamp(range.to - range.from, minWindow, maxWindow);
    let from = range.from;
    let to = from + width;
    if (from < 0) {
      from = 0;
      to = width;
    }
    if (to > points.length - 1) {
      to = points.length - 1;
      from = to - width;
    }
    return { from, to };
  }

  function zoomRange(range: LogicalRange, anchor: number, factor: number): LogicalRange {
    const current = normalizeRange(range);
    const width = Math.max(current.to - current.from, 1);
    const nextWidth = clamp(width * factor, minWindow, maxWindow);
    const ratio = clamp((anchor - current.from) / width, 0, 1);
    return normalizeRange({
      from: anchor - nextWidth * ratio,
      to: anchor + nextWidth * (1 - ratio),
    });
  }

  const currentRange = normalizeRange(logicalRange || { from: Math.max(0, points.length - defaultBars), to: points.length - 1 });
  const fromIndex = clamp(Math.floor(currentRange.from), 0, points.length - 1);
  const toIndex = clamp(Math.ceil(currentRange.to), fromIndex + 1, points.length - 1);
  const visiblePoints = points.slice(fromIndex, toIndex + 1);
  const visibleValues = dataset.kind === "candles"
    ? (visiblePoints as Candle[]).flatMap((candle: Candle) => [candle.high, candle.low])
    : (visiblePoints as ChartPoint[]).map((point: ChartPoint) => point.value);
  const visibleMin = Math.min(...visibleValues);
  const visibleMax = Math.max(...visibleValues);
  const autoSpan = Math.max(visibleMax - visibleMin, Math.max(Math.abs(visibleMax), 1) * 0.001);
  const autoYRange = { min: visibleMin - autoSpan * 0.08, max: visibleMax + autoSpan * 0.08 };
  const yRange = manualYRange || autoYRange;
  const span = Math.max(yRange.max - yRange.min, Math.max(Math.abs(yRange.max), 1) * 0.001);
  const x = (index: number) => plot.left + ((index - currentRange.from) / Math.max(1, currentRange.to - currentRange.from)) * plotWidth;
  const y = (value: number) => plot.top + (1 - (value - yRange.min) / span) * plotHeight;
  const valueAtY = (svgY: number) => yRange.min + (1 - clamp((svgY - plot.top) / plotHeight, 0, 1)) * span;
  const yTicks = [yRange.max, yRange.min + span * 0.75, yRange.min + span * 0.5, yRange.min + span * 0.25, yRange.min];
  const tickIndexes = Array.from(new Set([
    fromIndex,
    Math.round(fromIndex + (toIndex - fromIndex) * 0.25),
    Math.round(fromIndex + (toIndex - fromIndex) * 0.5),
    Math.round(fromIndex + (toIndex - fromIndex) * 0.75),
    toIndex,
  ]));
  const activeIndex = clamp(hoverIndex ?? toIndex, fromIndex, toIndex);
  const active = points[activeIndex];
  const activeValue = active ? dataset.kind === "candles" ? (active as Candle).close : (active as ChartPoint).value : null;
  const latestLabel = dataset.latest === null ? "Loading" : formatChartValue(dataset.latest, mode);
  const linePoints = dataset.kind === "line"
    ? (visiblePoints as ChartPoint[]).map((point: ChartPoint, index: number) => `${x(fromIndex + index)},${y(point.value)}`).join(" ")
    : "";
  const candleWidth = dataset.kind === "candles" ? clamp((plotWidth / Math.max(1, visiblePoints.length)) * 0.64, 2, 12) : 0;

  function svgPoint(event: React.PointerEvent<SVGSVGElement> | React.WheelEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      svgX: ((event.clientX - rect.left) / rect.width) * width,
      svgY: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function areaFor(svgX: number, svgY: number): "plot" | "xAxis" | "yAxis" {
    if (svgX >= chartRight) return "yAxis";
    if (svgY >= chartBottom) return "xAxis";
    return "plot";
  }

  function setRangeFromDrag(nextRange: LogicalRange) {
    setLogicalRange(normalizeRange(nextRange));
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    const { svgX, svgY } = svgPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      area: areaFor(svgX, svgY),
      startX: svgX,
      startY: svgY,
      startRange: currentRange,
      startYRange: yRange,
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const { svgX, svgY } = svgPoint(event);
    if (drag) {
      const deltaX = svgX - drag.startX;
      const deltaY = svgY - drag.startY;
      const rangeWidth = Math.max(drag.startRange.to - drag.startRange.from, 1);

      if (drag.area === "plot" || drag.area === "xAxis") {
        const deltaBars = -(deltaX / plotWidth) * rangeWidth;
        setRangeFromDrag({ from: drag.startRange.from + deltaBars, to: drag.startRange.to + deltaBars });
      }

      if (drag.area === "plot") {
        const yShift = (deltaY / plotHeight) * Math.max(drag.startYRange.max - drag.startYRange.min, 1);
        setManualYRange({ min: drag.startYRange.min + yShift, max: drag.startYRange.max + yShift });
      }

      if (drag.area === "yAxis") {
        const center = (drag.startYRange.max + drag.startYRange.min) / 2;
        const nextSpan = Math.max((drag.startYRange.max - drag.startYRange.min) * Math.exp(deltaY / 180), Math.abs(center) * 0.0001, 0.000001);
        setManualYRange({ min: center - nextSpan / 2, max: center + nextSpan / 2 });
      }
      return;
    }

    const rawIndex = Math.round(currentRange.from + ((svgX - plot.left) / plotWidth) * (currentRange.to - currentRange.from));
    setHoverIndex(clamp(rawIndex, fromIndex, toIndex));
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const { svgX, svgY } = svgPoint(event);
    const area = areaFor(svgX, svgY);
    const currentYRange = manualYRange || autoYRange;

    if (area === "yAxis") {
      const anchor = valueAtY(svgY);
      const factor = event.deltaY > 0 ? 1.14 : 0.88;
      setManualYRange({
        min: anchor - (anchor - currentYRange.min) * factor,
        max: anchor + (currentYRange.max - anchor) * factor,
      });
      return;
    }

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const deltaBars = (event.deltaX / plotWidth) * Math.max(currentRange.to - currentRange.from, 1);
      setLogicalRange(normalizeRange({ from: currentRange.from + deltaBars, to: currentRange.to + deltaBars }));
      return;
    }

    const anchor = currentRange.from + clamp((svgX - plot.left) / plotWidth, 0, 1) * (currentRange.to - currentRange.from);
    setLogicalRange(zoomRange(currentRange, anchor, event.deltaY > 0 ? 1.16 : 0.86));
  }

  function resetChart() {
    setLogicalRange(null);
    setManualYRange(null);
    setHoverIndex(null);
    setDrag(null);
  }

  return (
    <div className="radar-chart trading-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${dataset.label} chart`}
        onDoubleClick={resetChart}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={() => { if (!drag) setHoverIndex(null); }}
        onWheel={handleWheel}
      >
        <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} className="chart-plot-bg" />
        <rect x={chartRight} y={plot.top} width={plot.right - 8} height={plotHeight} className="chart-axis-zone y-axis" />
        <rect x={plot.left} y={chartBottom} width={plotWidth} height={plot.bottom - 8} className="chart-axis-zone x-axis" />
        {yTicks.map((tick: number) => {
          const yPos = y(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={plot.left} x2={chartRight} y1={yPos} y2={yPos} className="chart-grid" />
              <text x={chartRight + 10} y={yPos + 4} className="axis-label">{formatChartValue(tick, mode)}</text>
            </g>
          );
        })}
        {tickIndexes.map((index: number) => {
          const point = points[index];
          const xPos = x(index);
          return (
            <g key={`x-${point.time}-${index}`}>
              <line x1={xPos} x2={xPos} y1={plot.top} y2={chartBottom} className="chart-grid vertical" />
              <text x={xPos} y={height - 14} textAnchor="middle" className="axis-label">{formatChartTime(point.time, interval)}</text>
            </g>
          );
        })}
        {dataset.kind === "candles" && (visiblePoints as Candle[]).map((candle: Candle, index: number) => {
          const up = candle.close >= candle.open;
          const xPos = x(fromIndex + index);
          const openY = y(candle.open);
          const closeY = y(candle.close);
          return (
            <g className={up ? "candle up" : "candle down"} key={`${candle.time}-${index}`}>
              <line x1={xPos} x2={xPos} y1={y(candle.high)} y2={y(candle.low)} />
              <rect x={xPos - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(2, Math.abs(closeY - openY))} rx="1.5" />
            </g>
          );
        })}
        {dataset.kind === "line" && <polyline className={`chart-line ${mode}`} points={linePoints} />}
        {active && activeValue !== null && (
          <g className="chart-crosshair">
            <line x1={x(activeIndex)} x2={x(activeIndex)} y1={plot.top} y2={chartBottom} />
            <line x1={plot.left} x2={chartRight} y1={y(activeValue)} y2={y(activeValue)} />
            <circle cx={x(activeIndex)} cy={y(activeValue)} r="4" />
          </g>
        )}
      </svg>
      <div className="chart-meta">
        <span>{dataset.label} / {interval} / {points.length} bars</span>
        <span>{active && activeValue !== null ? `${formatChartTime(active.time, interval)} - ${formatChartValue(activeValue, mode)}` : "Move over chart"}</span>
        <span>Latest {latestLabel}</span>
      </div>
    </div>
  );
}

function AssetMetricCard({ label, value, meta, title, timestamp }: { label: string; value: string; meta: string; title?: string; timestamp?: number }) {
  return (
    <article className="metric-card" title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
      <Freshness timestamp={timestamp} />
    </article>
  );
}

function potentialMoveText(calc: RiskTicketCalc) {
  if (calc.entryPrice === null || calc.targetPrice === null || !calc.side) return "Set a target price";
  const move = ((calc.targetPrice - calc.entryPrice) / calc.entryPrice) * 100;
  return `Potential move: ${formatPct(move, 2, "Set a target price")}`;
}

function rewardRiskText(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(2)}x`;
}

function DataHealthBar({ state, wsDebug, now }: { state: AssetState; wsDebug: WsDebugState; now: number }) {
  const health = dataHealth(state, wsDebug, now);
  return (
    <div className={`data-health ${health.live ? "live" : health.marketStatus === "stale" ? "stale" : "waiting"}`}>
      <strong>{health.live ? "Market data live" : health.marketStatus === "stale" ? "Market data updating" : "Live data connecting"}</strong>
      <span>{health.orderBookStatus === "live" ? "Order book ready" : "Order book connecting"}</span>
      <span>Costs included</span>
      <span>{health.live ? "Preview only" : "Planning mode"}</span>
      <span>Updated {health.ageSeconds === null ? "soon" : `${health.ageSeconds}s ago`}</span>
      <span>Source: Hyperliquid</span>
      {!health.live ? <em>Preparing fresh market data for the trade plan.</em> : null}
    </div>
  );
}

function ticketEmptyState(ticketState: TicketState, asset: AssetConfig) {
  if (ticketState === "missing_direction") {
    return {
      title: "Choose Long or Short",
      body: "Pick a direction to start building the trade.",
    };
  }
  if (ticketState === "missing_entry") {
    return {
      title: "Set entry price",
      body: "Choose an entry price or use market entry with live price.",
    };
  }
  if (ticketState === "missing_target" || ticketState === "invalid_target") {
    return {
      title: "Set your target price",
      body: `Choose where you think ${asset.shortName} can go. HypurrScope will calculate stop, position size and potential profit.`,
    };
  }
  if (ticketState === "missing_risk") {
    return {
      title: "Set max total risk",
      body: "Choose the total amount you want to risk on this trade, including estimated costs.",
    };
  }
  if (ticketState === "invalid_stop") {
    return {
      title: "Fix stop price",
      body: "The stop must sit on the correct side of your entry price.",
    };
  }
  return null;
}

function TradeSummaryCard({ asset, calc, ticketState }: { asset: AssetConfig; calc: RiskTicketCalc; ticketState: TicketState }) {
  const empty = ticketEmptyState(ticketState, asset);
  return (
    <aside className="risk-mode-panel beginner-panel trade-summary-card">
      <span>Trade Summary</span>
      {empty && !isTicketComputable(ticketState) ? (
        <article>
          <h3>{empty.title}</h3>
          <p>{empty.body}</p>
        </article>
      ) : (
        <>
          <h3>Simple mode: see the trade in plain English.</h3>
          <div className="beginner-outcomes">
            <article>
              <small>Potential profit</small>
              <strong>{formatUsd(calc.estimatedNetProfitUsd, "Calculated after target is set")}</strong>
              <p>Estimated after fees and slippage if the target is reached.</p>
            </article>
            <article>
              <small>Max total risk</small>
              <strong>{formatUsd(calc.maxTotalRiskUsd, "Set max risk")}</strong>
              <p>The total risk budget for this trade, including estimated costs.</p>
            </article>
            <article>
              <small>Reward/Risk</small>
              <strong>{rewardRiskText(calc.rewardRiskNet)}</strong>
              <p>Net reward/risk after estimated costs.</p>
            </article>
            <article>
              <small>Position size</small>
              <strong>{formatUsd(calc.positionSizeUsd, "Calculated after trade is built")}</strong>
              <p>{calc.positionSizeAsset === null ? "Calculated after trade is built." : `${calc.positionSizeAsset.toFixed(4)} ${asset.shortName}`}</p>
            </article>
            <article>
              <small>Stop</small>
              <strong>{formatUsd(calc.stopLoss, "Calculated after target is set")}</strong>
              <p>The price where the trade plan stops making sense.</p>
            </article>
            <article>
              <small>Estimated liquidation</small>
              <strong>{formatUsd(calc.liquidationPrice, "Calculated after trade is built")}</strong>
              <p>If this is too close to your stop, the trade is unsafe.</p>
            </article>
            <article>
              <small>Costs</small>
              <strong>{formatUsd(calc.totalEstimatedCostUsd, "Calculated after target is set")}</strong>
              <p>Estimated fees, slippage and builder fee if enabled.</p>
            </article>
            <article>
              <small>Safety</small>
              <strong className={`safety-${calc.liquidationSafety.toLowerCase()}`}>{calc.liquidationSafety}</strong>
              <p>Preview before signing and verify the order on Hyperliquid.</p>
            </article>
          </div>
        </>
      )}
    </aside>
  );
}

function pendingTicketCheck(label: string): MarketSafetyCheck {
  return {
    label,
    value: "Calculated after trade is built",
    status: "Pending",
    impact: "Complete the trade builder before judging this item.",
  };
}

function liquidityTicketCheck(metrics: MetricBundle, calc: RiskTicketCalc): MarketSafetyCheck {
  if (calc.positionSizeUsd === null || metrics.depth10Bps === null || metrics.depth10Bps <= 0) {
    return pendingTicketCheck("Liquidity vs position size");
  }
  const liquidityUsagePct = (calc.positionSizeUsd / metrics.depth10Bps) * 100;
  const status: MarketSafetyCheck["status"] = liquidityUsagePct > 5 ? "Unsafe" : liquidityUsagePct > 1 ? "Review" : "OK";
  return {
    label: "Liquidity vs position size",
    value: `${liquidityUsagePct.toFixed(2)}% of +/-10 bps depth`,
    status,
    impact:
      status === "Unsafe" ? "This trade is large compared with near-book liquidity." :
      status === "Review" ? "Position size uses a noticeable share of near-book liquidity." :
      "Position size is small compared with visible near-book liquidity.",
  };
}

function marketSafetyChecks(state: AssetState, metrics: MetricBundle, calc: RiskTicketCalc, wsDebug: WsDebugState, now: number, ticketState: TicketState): MarketSafetyCheck[] {
  const health = dataHealth(state, wsDebug, now);
  const computable = isTicketComputable(ticketState);
  const marketReadiness: MarketSafetyCheck[] = [
    {
      label: "Pricing data",
      value: health.live ? "Live" : health.marketStatus === "stale" ? "Updating" : "Unavailable",
      status: health.live ? "OK" : health.marketStatus === "stale" ? "Review" : "Unavailable",
      impact: health.live ? "Hyperliquid price data is ready for this plan." : "Live data connecting. You can still prepare the plan.",
    },
    {
      label: "Order book",
      value: health.orderBookStatus === "live" ? "Ready" : "Connecting",
      status: health.orderBookStatus === "live" ? "OK" : "Unavailable",
      impact: health.orderBookStatus === "live" ? "Bid and ask are available for execution planning." : "Preview can use mark price while order book connects.",
    },
    {
      label: "Spread",
      value: metrics.spreadBps === null ? "Unavailable" : `${metrics.spreadBps.toFixed(2)} bps`,
      status: metrics.spreadBps === null ? "Unavailable" : metrics.spreadBps > 4 ? "Review" : "OK",
      impact: metrics.spreadBps !== null && metrics.spreadBps > 4 ? "Spread is wider than target. Consider a limit order." : "Top-of-book spread is tight.",
    },
  ];
  const ticketSpecific: MarketSafetyCheck[] = computable ? [
    liquidityTicketCheck(metrics, calc),
    {
      label: "Slippage vs position size",
      value: calc.estimatedSlippageBps === null ? "Calculated after trade is built" : `${calc.estimatedSlippageBps.toFixed(2)} bps`,
      status: calc.estimatedSlippageBps === null ? "Pending" : calc.estimatedSlippageBps > 5 ? "Review" : "OK",
      impact: calc.estimatedSlippageBps !== null && calc.estimatedSlippageBps > 5 ? "Estimated slippage is elevated for a market entry." : "Estimated slippage is included in the risk budget.",
    },
    {
      label: "Liquidation distance",
      value: calc.liquidationSafety,
      status: calc.liquidationSafety === "Unavailable" ? "Pending" : calc.liquidationSafety === "Dangerous" ? "Unsafe" : calc.liquidationSafety === "Medium" ? "Review" : "OK",
      impact: calc.liquidationSafety === "Dangerous" ? "Estimated liquidation is too close to the stop." : "Stop is far enough from estimated liquidation.",
    },
    {
      label: "Costs",
      value: formatUsd(calc.totalEstimatedCostUsd, "Calculated after trade is built"),
      status: calc.totalEstimatedCostUsd === null ? "Pending" : "OK",
      impact: "Estimated costs are included in your max total risk.",
    },
  ] : [
    pendingTicketCheck("Liquidity vs position size"),
    pendingTicketCheck("Slippage vs position size"),
    pendingTicketCheck("Liquidation distance"),
    pendingTicketCheck("Costs"),
  ];
  return [...marketReadiness, ...ticketSpecific];
}

function MarketSafetyChecks({ state, metrics, calc, wsDebug, now, ticketState }: { state: AssetState; metrics: MetricBundle; calc: RiskTicketCalc; wsDebug: WsDebugState; now: number; ticketState: TicketState }) {
  return (
    <aside className="risk-mode-panel safety-panel">
      <span>Market Safety Checks</span>
      <h3>Is this trade clean enough?</h3>
      <div className="safety-checks">
        {marketSafetyChecks(state, metrics, calc, wsDebug, now, ticketState).map((check, index) => (
          <React.Fragment key={check.label}>
            {index === 0 ? <small className="safety-group-label">Market readiness</small> : null}
            {index === 3 ? <small className="safety-group-label">Ticket-specific checks</small> : null}
            <article className={`safety-check ${check.status.toLowerCase()}`}>
              <div>
                <strong>{check.label}</strong>
                <small>{check.impact}</small>
                <small className="check-value">{check.value}</small>
              </div>
              <em>{check.status}</em>
            </article>
          </React.Fragment>
        ))}
      </div>
    </aside>
  );
}

function ProMetricRow({ label, value, status, impact, hint }: { label: string; value: string; status: "live" | "stale" | "unavailable"; impact: "favorable" | "neutral" | "warning"; hint: string }) {
  return (
    <article className={`pro-metric ${impact}`} title={hint}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{status} / {impact}</small>
    </article>
  );
}

function buildProTicketStateForUi({
  asset,
  state,
  metrics,
  draft,
  calc,
  wsDebug,
  now,
  assetMeta,
  ticketState,
}: {
  asset: AssetConfig;
  state: AssetState;
  metrics: MetricBundle;
  draft: RiskTicketDraft;
  calc: RiskTicketCalc;
  wsDebug: WsDebugState;
  now: number;
  assetMeta: PerpAssetMeta | null;
  ticketState: TicketState;
}) {
  const side = draft.side === "Long" ? "long" : draft.side === "Short" ? "short" : null;
  const pricingAvailable = Number.isFinite(state.market.price as number);
  const orderBookAvailable = Boolean(state.book && Number.isFinite(state.book.bestBid) && Number.isFinite(state.book.bestAsk));
  const assetPrecisionAvailable = Boolean(assetMeta && assetMeta.szDecimals !== null);
  const tpSlAvailable = Boolean(calc.stopLoss && calc.targetPrice && draft.side);
  const rawData: ProTicketRawData = {
    tradePlan: {
      Market: asset.shortName,
      Side: draft.side,
      "Entry price": formatUsd(calc.entryPrice, "Unavailable"),
      "Stop loss": formatUsd(calc.stopLoss, "Unavailable"),
      "Take profit": formatUsd(calc.targetPrice, "Unavailable"),
      "Position size": formatPositionAsset(calc.positionSizeAsset, asset),
      "Position notional": formatUsd(calc.positionSizeUsd, "Unavailable"),
      "Order type": draft.entryType,
      "Margin mode": calc.marginMode,
    },
    risk: {
      "Max risk": formatUsd(calc.maxTotalRiskUsd, "Unavailable"),
      "Estimated loss at stop": formatUsd(calc.estimatedTotalLossAtStopUsd, "Unavailable"),
      "Estimated profit": formatUsd(calc.estimatedNetProfitUsd, "Unavailable"),
      "Net reward/risk": formatRewardRiskValue(calc.rewardRiskNet),
      Leverage: calc.leverage === null ? null : `${calc.leverage.toFixed(1)}x`,
      "Liquidation price": formatUsd(calc.liquidationPrice, "Unavailable"),
    },
    execution: {
      "Order type": draft.entryType,
      Spread: formatBps(metrics.spreadBps),
      "Best bid": formatUsd(state.book?.bestBid ?? null, "Unavailable"),
      "Best ask": formatUsd(state.book?.bestAsk ?? null, "Unavailable"),
      "Mid price": formatUsd(state.market.midPx, "Unavailable"),
      "Order book depth +/-10 bps": formatUsd(metrics.depth10Bps, "Unavailable"),
      "Order book depth +/-25 bps": formatUsd(metrics.depth25Bps, "Unavailable"),
      "Estimated slippage": formatSlippagePct(calc.estimatedSlippageBps),
      "Estimated fees": formatUsd(calc.estimatedFees, "Unavailable"),
      "Maker fee": null,
      "Taker fee": "0.0450% model",
    },
    market: {
      "15m price change": formatPct(metrics.price15m, 2, "Unavailable"),
      "1h price change": formatPct(metrics.price1h, 2, "Unavailable"),
      "24h volume": formatUsd(state.market.volume24hUsd, "Unavailable"),
      "Open interest": formatUsd(state.market.oiUsd, "Unavailable"),
      "OI change 15m": formatPct(metrics.oi15m, 2, "Unavailable"),
      "OI change 1h": formatPct(metrics.oi1h, 2, "Unavailable"),
      "OI change 4h": formatPct(metrics.oi4h, 2, "Unavailable"),
      Funding: formatFunding(state.market.fundingPct).replace("Loading", "Unavailable"),
      "Next funding time": null,
      "Taker buy ratio 5m": formatPct(metrics.takerBuyRatio5m, 1, "Unavailable", false),
      "Taker sell ratio 5m": formatPct(metrics.takerSellRatio5m, 1, "Unavailable", false),
      "Net buy flow 5m": formatUsd(metrics.netBuyFlow5m, "Unavailable"),
      "Net sell flow 5m": formatUsd(metrics.netSellFlow5m, "Unavailable"),
      "CVD 5m": formatUsd(metrics.cvd5m, "Unavailable"),
      "CVD 15m": formatUsd(metrics.cvd15m, "Unavailable"),
    },
    dataQuality: {
      "Last price update": formatDataAge(state.freshness.meta || state.sourceUpdatedAt),
      "Last order book update": formatDataAge(state.freshness.book),
      "Last flow update": formatDataAge(state.freshness.trades),
      "Asset precision": availabilityLabel(assetPrecisionAvailable),
      "TP/SL availability": availabilityLabel(tpSlAvailable),
      "Pricing data": availabilityLabel(pricingAvailable),
      "Order book": availabilityLabel(orderBookAvailable),
      "Flow status": wsDebug.status,
    },
    advancedRawData: {
      "Ticket state": ticketState,
      "Calculator error": calc.invalidationReason,
      "REST source timestamp": state.sourceUpdatedAtIso,
      "Market data error": state.dataError,
      "Candle error": state.candleError,
      "Book error": state.bookError,
      "Missing fields": state.missingFields.length ? state.missingFields.join(", ") : null,
      "Asset szDecimals": assetMeta?.szDecimals ?? null,
      "WebSocket messages": wsDebug.rawMessagesCount,
      "WebSocket last message": formatDataAge(wsDebug.lastMessageAt),
      "Snapshot count": state.backendOi?.snapshotCount ?? null,
    },
  };

  return buildProTicketState({
    rawData,
    checks: {
      marketSelected: Boolean(asset.apiCoin),
      side,
      entry: calc.entryPrice,
      stop: calc.stopLoss,
      target: calc.targetPrice,
      maxRisk: calc.maxTotalRiskUsd,
      estimatedLossAtStop: calc.estimatedTotalLossAtStopUsd,
      liquidationPrice: calc.liquidationPrice,
      pricingAvailable,
      orderBookAvailable,
      assetPrecisionAvailable,
      tpSlAvailable,
      positionSize: calc.positionSizeAsset,
    },
  });
}

function ProTicketValue({ value }: { value: string | number | null }) {
  return <strong>{value === null || value === "" ? "Unavailable" : value}</strong>;
}

function ProTicketSection({ title, rows }: { title: string; rows: Record<string, string | number | null> }) {
  return (
    <section className="pro-ticket-section">
      <h4>{title}</h4>
      <div className="pro-ticket-grid">
        {Object.entries(rows).map(([label, value]) => (
          <article key={`${title}-${label}`}>
            <span>{label}</span>
            <ProTicketValue value={value} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ProRiskTicket({ ticketState, onPreview }: { ticketState: ProTicketState; onPreview: () => void }) {
  return (
    <aside className="risk-mode-panel pro-risk-ticket">
      <span>Mode Pro</span>
      <h3>Raw trade ticket</h3>
      <div className="pro-ticket-sections">
        <ProTicketSection title="Trade Plan" rows={ticketState.rawData.tradePlan} />
        <ProTicketSection title="Risk" rows={ticketState.rawData.risk} />
        <ProTicketSection title="Execution" rows={ticketState.rawData.execution} />
        <ProTicketSection title="Market Data" rows={ticketState.rawData.market} />
        <ProTicketSection title="Data Quality" rows={ticketState.rawData.dataQuality} />
        <ProTicketSection title="Advanced Raw Data" rows={ticketState.rawData.advancedRawData} />
      </div>
      <div className="ticket-actions single-primary pro-preview-actions">
        {ticketState.canPreviewOrder ? (
          <button className="primary-action" onClick={onPreview}>Preview order</button>
        ) : (
          <p className="pro-preview-unavailable">{ticketState.previewUnavailableReason}</p>
        )}
      </div>
    </aside>
  );
}

function TradeValidationWarnings({ warnings }: { warnings: TicketWarning[] }) {
  return (
    <div className="ticket-warnings">
      {warnings.length ? warnings.slice(0, 5).map((warning, index) => (
        <p className={warning.level} key={`${warning.text}-${index}`}>{warning.text}</p>
      )) : <p className="info">Ticket is ready for simulation preview.</p>}
    </div>
  );
}

function ticketText(asset: AssetConfig, calc: RiskTicketCalc) {
  return [
    `HypurrScope Risk Ticket`,
    `Market: ${asset.shortName}`,
    `Side: ${calc.side || "Choose side"}`,
    `Entry: ${formatUsd(calc.entryPrice, "Unavailable")}`,
    `Stop loss: ${formatUsd(calc.stopLoss, "Unavailable")}`,
    `Target: ${formatUsd(calc.targetPrice, "Unavailable")}`,
    `Max total risk: ${formatUsd(calc.maxTotalRiskUsd, "Unavailable")}`,
    `Estimated total loss at stop: ${formatUsd(calc.estimatedTotalLossAtStopUsd, "Unavailable")}`,
    `Position size: ${formatUsd(calc.positionSizeUsd, "Unavailable")}`,
    `Gross R/R: ${calc.rewardRiskGross === null ? "Unavailable" : `1:${calc.rewardRiskGross.toFixed(2)}`}`,
    `Net R/R: ${calc.rewardRiskNet === null ? "Unavailable" : `1:${calc.rewardRiskNet.toFixed(2)}`}`,
    `Estimated liquidation: ${formatUsd(calc.liquidationPrice, "Unavailable")}`,
    `Execution: ${calc.executionStatus}`,
  ].join("\n");
}

function ExecutionPreview({ asset, calc, ticketState, onPreview }: { asset: AssetConfig; calc: RiskTicketCalc; ticketState: TicketState; onPreview: () => void }) {
  const hyperliquidHref = `https://app.hyperliquid.xyz/trade/${asset.apiCoin}`;
  const executionConfig = getHyperliquidConfig();
  const builderConfig = getBuilderConfig(false, 0);
  const copyTicket = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(ticketText(asset, calc));
  };
  const primary = derivePrimaryCta({
    ticketState,
    sideSelected: Boolean(calc.side),
    targetPresent: calc.targetPrice !== null,
    maxTotalRiskPresent: calc.maxTotalRiskUsd !== null,
    ticketInvalid: Boolean(calc.invalidationReason),
    realExecutionEnabled: executionConfig.enableRealExecution,
    builderEnabled: builderConfig.enabled,
    builderApproved: builderConfig.status === "approved",
    walletConnected: false,
  });
  const runPrimary = () => {
    if (primary.disabled) return;
    if (primary.action === "copy") copyTicket();
    else onPreview();
  };
  const locked = !isTicketComputable(ticketState);

  return (
    <aside className="risk-mode-panel execution-panel">
      <span>Execution Preview</span>
      {locked ? (
        <div className="locked-preview">
          <h3>Preview locked</h3>
          <p>Complete the trade builder to preview the order.</p>
          <small>{ticketStateNextAction(ticketState)}</small>
        </div>
      ) : (
        <>
          <h3>{calc.executionStatus}</h3>
          <div className="execution-lines">
            <div><span>Market</span><strong>{asset.shortName}</strong></div>
            <div><span>Side</span><strong>{calc.side || "Choose side"}</strong></div>
            <div><span>Entry</span><strong>{formatUsd(calc.entryPrice, "Unavailable")}</strong></div>
            <div><span>Stop</span><strong>{formatUsd(calc.stopLoss, "Unavailable")}</strong></div>
            <div><span>Target</span><strong>{formatUsd(calc.targetPrice, "Unavailable")}</strong></div>
            <div><span>Position</span><strong>{formatUsd(calc.positionSizeUsd, "Unavailable")}</strong></div>
            <div><span>Max total risk</span><strong>{formatUsd(calc.maxTotalRiskUsd, "Unavailable")}</strong></div>
            <div><span>Loss at stop</span><strong>{formatUsd(calc.estimatedTotalLossAtStopUsd, "Unavailable")}</strong></div>
            <div><span>Net profit</span><strong>{formatUsd(calc.estimatedNetProfitUsd, "Unavailable")}</strong></div>
            <div><span>Gross / net R:R</span><strong>{calc.rewardRiskGross === null ? "Unavailable" : `${calc.rewardRiskGross.toFixed(2)} / ${calc.rewardRiskNet === null ? "-" : calc.rewardRiskNet.toFixed(2)}`}</strong></div>
            <div><span>Leverage</span><strong>{calc.leverage === null ? "Unavailable" : `${calc.leverage.toFixed(1)}x`}</strong></div>
            <div><span>Liquidation</span><strong>{formatUsd(calc.liquidationPrice, "Unavailable")}</strong></div>
            <div><span>Fees + builder</span><strong>{formatUsd(calc.totalEstimatedCostUsd, "Unavailable")}</strong></div>
          </div>
          {ticketState === "execution_disabled_precision" ? (
            <p className="execution-note">Asset precision unavailable - execution disabled. Preview remains available.</p>
          ) : null}
          <p className="execution-note">{calc.stopTriggerNote}</p>
          <div className="ticket-actions single-primary">
            <button className="subtle-button" disabled={primary.disabled} onClick={runPrimary}>{primary.label}</button>
            <a className="subtle-link" href={hyperliquidHref} target="_blank" rel="noreferrer">Open on Hyperliquid</a>
            <small>{calc.executionStatus}</small>
          </div>
        </>
      )}
    </aside>
  );
}

function BuilderCodePanel({ calc }: { calc: RiskTicketCalc }) {
  const builder = getBuilderConfig(false, 0);
  const builderFeeLabel = builder.enabled ? `${builder.feeBps.toFixed(1)} bps` : "off";
  const title =
    builder.status === "disabled" ? "Builder routing not enabled" :
    builder.status === "invalid_config" ? "Builder routing not configured" :
    builder.status === "wallet_required" ? "Connect wallet to approve" :
    builder.status === "approval_required" ? `Approve ${builder.feeBps.toFixed(1)} bps builder fee` :
    "Builder approved";
  return (
    <aside className="risk-mode-panel builder-code-panel">
      <span>Execution settings</span>
      <h3>{title}</h3>
      <div className="builder-badges">
        <em>Builder code: {builder.enabled ? "on" : "off"}</em>
        <em>Execution: {calc.executionEnabled ? "enabled" : "preview only"}</em>
      </div>
      <div className="execution-lines">
        <div><span>Builder address</span><strong>{builder.builderAddress || "Not enabled"}</strong></div>
        <div><span>Builder fee rate</span><strong>{builderFeeLabel}</strong></div>
        <div><span>Estimated builder fee</span><strong>{formatUsd(calc.builderFeeUsd, "Unavailable")}</strong></div>
        <div><span>Approval status</span><strong>{builder.status.replace(/_/g, " ")}</strong></div>
      </div>
      <p className="execution-note">HypurrScope may receive a small builder fee if you route an order through this interface. You approve it before execution.</p>
      {builder.status === "disabled" ? <p className="execution-note">Builder routing is not enabled yet. You can still preview and copy the trade plan.</p> : null}
      {builder.status === "wallet_required" ? <p className="execution-note">Connect wallet to approve. Real wallet execution is not connected in this preview build.</p> : null}
      {builder.status === "approval_required" || builder.status === "approved" ? (
        <div className="ticket-actions single-primary">
          <button className="disabled-action" disabled>{builder.status === "approved" ? "Set builder fee approval to 0" : `Approve ${builder.feeBps.toFixed(1)} bps builder fee`}</button>
        </div>
      ) : null}
    </aside>
  );
}

function ProMetricsPanel({ state, metrics, calc, wsDebug, now }: { state: AssetState; metrics: MetricBundle; calc: RiskTicketCalc; wsDebug: WsDebugState; now: number }) {
  const health = dataHealth(state, wsDebug, now);
  const stale = !health.live && health.marketStatus === "stale";
  const status = (value: number | null): "live" | "stale" | "unavailable" => value === null ? "unavailable" : stale ? "stale" : "live";
  return (
    <aside className="risk-mode-panel pro-panel">
      <span>Advanced data</span>
      <h3>Optional market details for experienced traders.</h3>
      <div className="pro-grid">
        <ProMetricRow label="Mark price" value={formatUsd(state.market.price, "unavailable")} status={status(state.market.price)} impact="neutral" hint="Hyperliquid mark price from REST and live feed." />
        <ProMetricRow label="Oracle price" value={formatUsd(state.market.oraclePx, "unavailable")} status={status(state.market.oraclePx)} impact="neutral" hint="Oracle reference price if exposed by Hyperliquid." />
        <ProMetricRow label="Bid / ask" value={state.book ? `${formatUsd(state.book.bestBid)} / ${formatUsd(state.book.bestAsk)}` : "unavailable"} status={state.book ? (stale ? "stale" : "live") : "unavailable"} impact="neutral" hint="Best visible bid and ask from l2Book." />
        <ProMetricRow label="Spread" value={metrics.spreadBps === null ? "unavailable" : `${metrics.spreadBps.toFixed(2)} bps`} status={status(metrics.spreadBps)} impact={metrics.spreadBps !== null && metrics.spreadBps > 4 ? "warning" : "neutral"} hint="Wide spread increases execution risk." />
        <ProMetricRow label="Order book depth" value={formatUsd(metrics.depth10Bps, "unavailable")} status={status(metrics.depth10Bps)} impact={metrics.liquidityHealthy === false ? "warning" : "neutral"} hint="USD depth within +/-10 bps of mid." />
        <ProMetricRow label="24h volume" value={formatUsd(state.market.volume24hUsd, "unavailable")} status={status(state.market.volume24hUsd)} impact="neutral" hint="24h notional volume from Hyperliquid asset context." />
        <ProMetricRow label="Open interest" value={formatUsd(state.market.oiUsd, "unavailable")} status={status(state.market.oiUsd)} impact="neutral" hint="Open interest converted to USD." />
        <ProMetricRow label="Funding rate" value={formatFunding(state.market.fundingPct)} status={status(state.market.fundingPct)} impact={fundingAgainstPosition(calc.side, state.market.fundingPct) ? "warning" : "neutral"} hint="Hourly funding. Positive usually means longs pay shorts." />
        <ProMetricRow label="Recent trades flow" value={formatUsd(metrics.netFlow5m, "unavailable")} status={status(metrics.netFlow5m)} impact="neutral" hint="Aggressive buy minus sell notional over 5 minutes." />
        <ProMetricRow label="CVD 5m" value={formatUsd(metrics.cvd5m, "unavailable")} status={status(metrics.cvd5m)} impact="neutral" hint="Cumulative volume delta over 5 minutes." />
        <ProMetricRow label="Volatility proxy" value={formatPct(Math.abs(metrics.price1h ?? 0), 2, "unavailable", false)} status={status(metrics.price1h)} impact={metrics.price1h !== null && Math.abs(metrics.price1h) > 3 ? "warning" : "neutral"} hint="Short-term 1h price range proxy." />
        <ProMetricRow label="Slippage estimate" value={calc.estimatedSlippageBps === null ? "unavailable" : `${calc.estimatedSlippageBps.toFixed(2)} bps`} status={status(calc.estimatedSlippageBps)} impact={calc.estimatedSlippageBps !== null && calc.estimatedSlippageBps > 5 ? "warning" : "neutral"} hint="Approximation from current spread, not a guaranteed execution value." />
        <ProMetricRow label="Fee estimate" value={formatUsd(calc.estimatedFees, "unavailable")} status={status(calc.estimatedFees)} impact="neutral" hint="Estimated taker round trip. Exact fees depend on account tier." />
        <ProMetricRow label="Builder fee" value="not active" status="unavailable" impact="neutral" hint="Prepared for future builder code, not presented as active." />
        <ProMetricRow label="Data freshness" value={health.ageSeconds === null ? "waiting" : `${health.ageSeconds}s`} status={health.live ? "live" : health.marketStatus === "stale" ? "stale" : "unavailable"} impact={health.live ? "favorable" : "warning"} hint="How recent the latest market update is." />
        <ProMetricRow label="Flow status" value={wsDebug.status === "streaming" ? "live" : "still collecting"} status={wsDebug.status === "streaming" ? "live" : "unavailable"} impact={wsDebug.status === "streaming" ? "favorable" : "warning"} hint="Live browser flow connection status." />
      </div>
    </aside>
  );
}

function RecentTickets({ tickets }: { tickets: RecentTicket[] }) {
  return (
    <section className="recent-tickets">
      <div>
        <span>Recent plans</span>
        <h3>Previewed trade plans</h3>
      </div>
      {tickets.length ? (
        <div className="recent-ticket-list">
          {tickets.slice(0, 5).map((ticket) => (
            <article key={ticket.id}>
              <strong>{ticket.asset} {ticket.side}</strong>
              <span>{formatUsd(ticket.potentialProfitUsd, "profit unavailable")} potential profit</span>
              <span>{formatUsd(ticket.maxTotalRiskUsd)} max total risk</span>
              <span>{ticket.riskRewardRatio === null ? "Reward/Risk unavailable" : `${ticket.riskRewardRatio.toFixed(2)}x Reward/Risk`}</span>
              <small>{ticket.status} / {new Date(ticket.createdAt).toLocaleTimeString()}</small>
            </article>
          ))}
        </div>
      ) : (
        <p>Your previewed trade plans will appear here.</p>
      )}
    </section>
  );
}

function TargetPresetButtons({
  asset,
  state,
  draft,
  assetMeta,
  onDraftChange,
}: {
  asset: AssetConfig;
  state: AssetState;
  draft: RiskTicketDraft;
  assetMeta: PerpAssetMeta | null;
  onDraftChange: (draft: RiskTicketDraft) => void;
}) {
  if (!draft.side) return null;
  const side = draft.side;
  const entry = effectiveEntryFromDraft(state, draft);
  return (
    <div className="quick-row target-presets" aria-label="Quick targets">
      <span>Quick targets</span>
      {targetPresetPercents(asset.apiCoin).map((pct) => {
        const target = entry === null ? "" : roundedTargetInput(side === "Long" ? entry * (1 + pct) : entry * (1 - pct), assetMeta);
        return (
          <button
            key={`${asset.apiCoin}-${side}-${pct}`}
            disabled={!target}
            onClick={() => onDraftChange({ ...draft, targetPrice: target })}
          >
            {formatPresetPct(pct, side)}
          </button>
        );
      })}
    </div>
  );
}

function beginnerButtonLabel(button: BeginnerPrimaryButton) {
  switch (button) {
    case "choose_market":
      return "Choisir le marche";
    case "refresh_data":
      return "Refresh data";
    case "fix_levels":
      return "Fix levels";
    case "auto_fix_size":
      return "Auto-fix size";
    case "lower_leverage":
      return "Lower leverage";
    case "wait_for_confirmation":
      return "Wait for confirmation";
    case "set_alert":
      return "Set alert";
    case "reduce_size":
      return "Reduce size";
    case "switch_to_limit":
      return "Switch to limit order";
    case "accept_setup":
      return "Accepter ce setup";
    default:
      return null;
  }
}

function BeginnerReasonList({ reasons }: { reasons: BeginnerReason[] }) {
  return (
    <div className="beginner-reasons">
      {reasons.slice(0, 5).map((item) => (
        <article className={`beginner-reason ${item.status}`} key={item.id}>
          <span>{item.status === "ok" ? "OK" : item.status === "danger" ? "BLOCK" : item.status === "missing" ? "WAIT" : "CHECK"}</span>
          <div>
            <strong>{item.label}</strong>
            <small>{item.value}</small>
            <small>{item.rule}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProtectedOrderPreview({ decision, orderType }: { decision: BeginnerTradeDecision; orderType: EntryType }) {
  const setup = decision.setup;
  if (!setup) return null;
  return (
    <div className="protected-order-preview">
      <span>ProtectedOrderPreview</span>
      <h4>Preview d'ordre protege</h4>
      <div className="execution-lines">
        <div><span>Market</span><strong>{setup.market}</strong></div>
        <div><span>Side</span><strong>{setup.side === "long" ? "Long" : "Short"}</strong></div>
        <div><span>Entry</span><strong>{formatUsd(setup.entry)}</strong></div>
        <div><span>Stop loss</span><strong>{formatUsd(setup.stop)}</strong></div>
        <div><span>Take profit</span><strong>{formatUsd(setup.target)}</strong></div>
        <div><span>Position size</span><strong>{setup.positionSize.toFixed(4)}</strong></div>
        <div><span>Max loss</span><strong>{formatUsd(setup.estimatedLoss)}</strong></div>
        <div><span>Estimated fees</span><strong>{formatUsd(setup.fees)}</strong></div>
        <div><span>Estimated slippage</span><strong>{setup.slippage.toFixed(2)} bps</strong></div>
        <div><span>Liquidation price</span><strong>{formatUsd(setup.liquidationPrice, "Not available")}</strong></div>
        <div><span>TP/SL attached</span><strong>Yes</strong></div>
        <div><span>Order type</span><strong>{orderType}</strong></div>
      </div>
      <p className="execution-note">Cette preview ne place pas l'ordre. Elle sert seulement a verifier le stop loss et le take profit avant toute action.</p>
    </div>
  );
}

function BeginnerRiskTicket({ decision, orderType }: { decision: BeginnerTradeDecision; orderType: EntryType }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const buttonLabel = beginnerButtonLabel(decision.primaryButton);
  const canAccept = decision.verdict === "setup_validated" && decision.canAcceptSetup && decision.canPreviewOrder;

  useEffect(() => {
    setPreviewOpen(false);
  }, [decision.verdict, decision.setup?.entry, decision.setup?.stop, decision.setup?.target, decision.setup?.positionSize]);

  const handleAction = () => {
    if (canAccept) {
      setPreviewOpen(true);
      return;
    }
    if (decision.primaryButton === "refresh_data" && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <aside className={`risk-mode-panel beginner-decision-card verdict-${decision.verdict}`}>
      <span>Mode Debutant</span>
      <h3>{decision.title}</h3>
      <p>{decision.summary}</p>

      {decision.setup ? (
        <div className="beginner-setup-grid">
          <article><span>Market</span><strong>{decision.setup.market}</strong></article>
          <article><span>Side</span><strong>{decision.setup.side === "long" ? "Long" : "Short"}</strong></article>
          <article><span>Entry</span><strong>{formatUsd(decision.setup.entry)}</strong></article>
          <article><span>Stop loss</span><strong>{formatUsd(decision.setup.stop)}</strong></article>
          <article><span>Take profit</span><strong>{formatUsd(decision.setup.target)}</strong></article>
          <article><span>Position size</span><strong>{decision.setup.positionSize.toFixed(4)}</strong></article>
          <article><span>Max risk</span><strong>{formatUsd(decision.setup.maxRisk)}</strong></article>
          <article><span>Estimated loss</span><strong>{formatUsd(decision.setup.estimatedLoss)}</strong></article>
          <article><span>Estimated profit</span><strong>{formatUsd(decision.setup.estimatedProfit)}</strong></article>
          <article><span>Net reward/risk</span><strong>{decision.setup.netRewardRisk.toFixed(2)}x</strong></article>
        </div>
      ) : null}

      <BeginnerReasonList reasons={decision.reasons} />

      {buttonLabel ? (
        <div className="ticket-actions single-primary">
          <button
            className={canAccept ? "primary-action" : "ghost-action"}
            disabled={!canAccept && decision.primaryButton !== "refresh_data"}
            onClick={handleAction}
          >
            {buttonLabel}
          </button>
        </div>
      ) : null}

      {previewOpen && canAccept ? <ProtectedOrderPreview decision={decision} orderType={orderType} /> : null}
    </aside>
  );
}

function RiskTicket({
  asset,
  state,
  metrics,
  draft,
  mode,
  calc,
  wsDebug,
  now,
  recentTickets,
  ticketState,
  assetMeta,
  assetMetaError,
  onAssetChange,
  onDraftChange,
  onModeChange,
  onSampleHypeTrade,
  onPreview,
}: {
  asset: AssetConfig;
  state: AssetState;
  metrics: MetricBundle;
  draft: RiskTicketDraft;
  mode: RiskMode;
  calc: RiskTicketCalc;
  wsDebug: WsDebugState;
  now: number;
  recentTickets: RecentTicket[];
  ticketState: TicketState;
  assetMeta: PerpAssetMeta | null;
  assetMetaError: string | null;
  onAssetChange: (asset: ApiCoin) => void;
  onDraftChange: (draft: RiskTicketDraft) => void;
  onModeChange: (mode: RiskMode) => void;
  onSampleHypeTrade: () => void;
  onPreview: () => void;
}) {
  const entryFallback = draft.entryType === "Market" ? state.market.price : state.market.price;
  const stopFallback = defaultStop(draft.side, calc.entryPrice);
  const takeFallback = defaultTakeProfit(draft.side, calc.entryPrice);
  const ticketComputable = isTicketComputable(ticketState);
  const canPreview = ticketComputable && !calc.invalidationReason && Boolean(draft.side);
  const builderConfig = getBuilderConfig(false, 0);
  const health = dataHealth(state, wsDebug, now);
  const preset = riskPresetFor(asset.apiCoin);
  const beginnerDecision = buildBeginnerTradeDecision({
    market: asset.shortName,
    side: draft.side === "Long" ? "long" : draft.side === "Short" ? "short" : null,
    entry: calc.entryPrice,
    stop: calc.stopLoss,
    target: calc.targetPrice,
    positionSize: calc.positionSizeAsset,
    positionSizeUsd: calc.positionSizeUsd,
    maxRisk: calc.maxTotalRiskUsd,
    estimatedLoss: calc.estimatedTotalLossAtStopUsd,
    estimatedProfit: calc.estimatedNetProfitUsd,
    netRewardRisk: calc.rewardRiskNet,
    liquidationPrice: calc.liquidationPrice,
    fees: calc.estimatedFees,
    slippageBps: calc.estimatedSlippageBps,
    spreadBps: metrics.spreadBps,
    orderBookDepthUsd: metrics.depth10Bps,
    leverage: calc.leverage,
    marginMode: calc.marginMode,
    fundingPct: state.market.fundingPct,
    openInterestUsd: state.market.oiUsd,
    volume24hUsd: state.market.volume24hUsd,
    price15mPct: metrics.price15m,
    price1hPct: metrics.price1h,
    cvd5m: metrics.cvd5m,
    netFlow5m: metrics.netFlow5m,
    dataFresh: health.marketStatus === "live" && health.orderBookStatus === "live",
    assetPrecisionAvailable: Boolean(assetMeta && assetMeta.szDecimals !== null),
    tpSlAvailable: Boolean(calc.stopLoss && calc.targetPrice && draft.side),
    orderType: draft.entryType === "Market" ? "market" : "limit",
    maxSpreadBps: preset.maxSpreadBps,
    maxSlippageBps: preset.maxSlippageBps,
    minDepthUsd: asset.thresholds.minDepthUsd,
    minNetRewardRisk: 1.2,
  });
  const proTicketState = buildProTicketStateForUi({
    asset,
    state,
    metrics,
    draft,
    calc,
    wsDebug,
    now,
    assetMeta,
    ticketState,
  });
  const primaryCta = derivePrimaryCta({
    ticketState,
    sideSelected: Boolean(draft.side),
    targetPresent: parsePositiveNumber(draft.targetPrice) !== null,
    maxTotalRiskPresent: parsePositiveNumber(draft.maxTotalRiskUsd) !== null,
    ticketInvalid: Boolean(calc.invalidationReason) || ticketState === "invalid_target" || ticketState === "invalid_stop" || ticketState === "missing_entry",
    realExecutionEnabled: getHyperliquidConfig().enableRealExecution,
    walletConnected: false,
    builderEnabled: builderConfig.enabled,
    builderApproved: builderConfig.status === "approved",
  });
  const hyperliquidHref = `https://app.hyperliquid.xyz/trade/${asset.apiCoin}`;
  const copyPlan = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(ticketText(asset, calc));
  };
  const runPrimary = () => {
    if (mode === "pro") {
      if (proTicketState.canPreviewOrder) onPreview();
      return;
    }
    if (primaryCta.disabled) return;
    if (primaryCta.action === "copy") copyPlan();
    else onPreview();
  };

  return (
    <section className="risk-ticket-hero">
      <div className="risk-ticket-copy">
        <span>Risk-first execution for Hyperliquid</span>
        <h1>Calculate your trade before you enter.</h1>
        <p>Choose your target profit and max total risk. HypurrScope calculates position size, stop loss, liquidation distance, fees and execution preview for Hyperliquid.</p>
        <div className="hero-actions">
          {mode === "pro" ? (
            proTicketState.canPreviewOrder ? <button className="ghost-action" onClick={runPrimary}>Preview order</button> : null
          ) : (
            <>
              <button className="ghost-action" onClick={runPrimary} disabled={primaryCta.disabled}>{primaryCta.label}</button>
              <button className="ghost-action" onClick={onSampleHypeTrade}>Try sample HYPE trade</button>
            </>
          )}
        </div>
        <p className="risk-disclaimer">Perpetual futures are risky. This is a planning tool, not financial advice.</p>
      </div>

      <div className="risk-ticket-layout">
        <section className="risk-ticket-card">
          <DataHealthBar state={state} wsDebug={wsDebug} now={now} />
          <div className="risk-ticket-head">
            <div>
              <span>Trade Builder</span>
              <h2>{asset.shortName} {draft.side || "Choose direction"}</h2>
            </div>
            <div className="mode-toggle" aria-label="Risk ticket mode">
              <button className={mode === "beginner" ? "active" : ""} onClick={() => onModeChange("beginner")}>Beginner</button>
              <button className={mode === "pro" ? "active" : ""} onClick={() => onModeChange("pro")}>Pro</button>
            </div>
          </div>

          <div className="ticket-stepper" aria-label="Trade builder steps">
            <div className="active"><span>1</span><strong>Choose market & direction</strong><small>Pick the direction you want to trade.</small></div>
            <div className={draft.side ? "active" : ""}><span>2</span><strong>Set your target</strong><small>Start with where you think price can go.</small></div>
            <div className={!calc.invalidationReason && draft.side ? "active" : ""}><span>3</span><strong>Choose your max risk</strong><small>HypurrScope sizes the position.</small></div>
          </div>

          <div className="guided-step">
            <div className="guided-step-head">
              <span>Step 1</span>
              <h3>Choose market & direction</h3>
              <p>Pick the direction you want to trade.</p>
            </div>
            <div className="ticket-form-grid two-columns">
              <label>
                <span>Market</span>
                <select value={asset.apiCoin} onChange={(event) => onAssetChange(event.target.value as ApiCoin)}>
                  {ASSETS.map((row) => <option key={row.apiCoin} value={row.apiCoin}>{row.shortName}</option>)}
                </select>
              </label>
              <label>
                <span>Direction</span>
                <select value={draft.side ?? ""} onChange={(event) => onDraftChange({ ...draft, side: event.target.value ? event.target.value as TicketSide : null })}>
                  <option value="">Choose Long or Short</option>
                  <option>Long</option>
                  <option>Short</option>
                </select>
              </label>
            </div>
          </div>

          <div className="guided-step">
            <div className="guided-step-head">
              <span>Step 2</span>
              <h3>Set your target</h3>
              <p>Your target price for this trade.</p>
            </div>
            <div className="ticket-form-grid three-columns">
              <label>
                <span>Entry type</span>
                <select value={draft.entryType} onChange={(event) => onDraftChange({ ...draft, entryType: event.target.value as EntryType })}>
                  <option>Market</option>
                  <option>Limit</option>
                </select>
              </label>
              <label>
                <span>Entry price</span>
                <input value={draft.entryPrice} onChange={(event) => onDraftChange({ ...draft, entryPrice: event.target.value })} placeholder={formatPriceInput(entryFallback)} disabled={draft.entryType === "Market"} inputMode="decimal" />
              </label>
              <label>
                <span>Target price</span>
                <input value={draft.targetPrice} onChange={(event) => onDraftChange({ ...draft, targetPrice: event.target.value })} placeholder={formatPriceInput(takeFallback)} inputMode="decimal" />
              </label>
            </div>
            <TargetPresetButtons asset={asset} state={state} draft={draft} assetMeta={assetMeta} onDraftChange={onDraftChange} />
            <div className="potential-move">{potentialMoveText(calc)}</div>
          </div>

          <div className="guided-step">
            <div className="guided-step-head">
              <span>Step 3</span>
              <h3>Choose your max risk</h3>
              <p>The total risk budget for this trade, including estimated costs.</p>
            </div>
            <div className="quick-row" aria-label="Max total risk presets">
              {["25", "50", "100"].map((value) => (
                <button className={draft.maxTotalRiskUsd === value ? "active" : ""} key={value} onClick={() => onDraftChange({ ...draft, maxTotalRiskUsd: value })}>${value}</button>
              ))}
              <span>or custom below</span>
            </div>
            <div className="quick-row" aria-label="Reward risk presets">
              <span>Reward/Risk</span>
              {["1.5", "2", "3"].map((value) => (
                <button className={draft.desiredRewardRisk === value ? "active" : ""} key={value} onClick={() => onDraftChange({ ...draft, desiredRewardRisk: value })}>{value}x</button>
              ))}
            </div>
            <div className="quick-row" aria-label="Leverage presets">
              <span>Leverage</span>
              {["1", "2", "3"].map((value) => (
                <button className={draft.leverage === value ? "active" : ""} key={value} onClick={() => onDraftChange({ ...draft, leverage: value })}>{value}x</button>
              ))}
            </div>
            <div className="ticket-form-grid three-columns">
              <label className="max-loss-field">
                <span>Max total risk</span>
                <input value={draft.maxTotalRiskUsd} onChange={(event) => onDraftChange({ ...draft, maxTotalRiskUsd: event.target.value })} inputMode="decimal" />
              </label>
              <label>
                <span>Reward/Risk</span>
                <input value={draft.desiredRewardRisk} onChange={(event) => onDraftChange({ ...draft, desiredRewardRisk: event.target.value })} disabled={draft.ticketMode === "manual"} inputMode="decimal" />
              </label>
              <label>
                <span>Leverage</span>
                <input value={draft.leverage} onChange={(event) => onDraftChange({ ...draft, leverage: event.target.value })} inputMode="decimal" />
              </label>
            </div>
            <details className="advanced-stop">
              <summary>Advanced: set stop manually</summary>
              <div className="ticket-form-grid three-columns">
                <label>
                  <span>Mode</span>
                  <select value={draft.ticketMode} onChange={(event) => onDraftChange({ ...draft, ticketMode: event.target.value as RiskTicketDraft["ticketMode"] })}>
                    <option value="target-first">Target first</option>
                    <option value="manual">Manual stop</option>
                  </select>
                </label>
                <label>
                  <span>Stop price</span>
                  <input value={draft.stopLoss} onChange={(event) => onDraftChange({ ...draft, stopLoss: event.target.value })} placeholder={formatPriceInput(calc.stopLoss ?? stopFallback)} disabled={draft.ticketMode === "target-first"} inputMode="decimal" />
                </label>
                <label>
                  <span>Account equity USD</span>
                  <input value={draft.accountEquityUsd} onChange={(event) => onDraftChange({ ...draft, accountEquityUsd: event.target.value })} placeholder="Optional" inputMode="decimal" />
                </label>
                <label>
                  <span>Margin mode</span>
                  <select value={draft.marginMode} onChange={(event) => onDraftChange({ ...draft, marginMode: event.target.value as MarginMode })}>
                    <option>Isolated</option>
                    <option>Cross</option>
                  </select>
                </label>
              </div>
            </details>
          </div>

          {mode !== "pro" && (ticketComputable || ticketState === "invalid_target" || ticketState === "invalid_stop") ? (
            <TradeValidationWarnings warnings={calc.warnings} />
          ) : null}
          {mode !== "pro" && ticketComputable && (!assetMeta || assetMetaError) ? (
            <p className="execution-note">Asset precision unavailable - execution disabled. Preview remains available.</p>
          ) : null}
        </section>

        <div className="risk-ticket-side">
          {mode === "beginner" ? (
            <BeginnerRiskTicket decision={beginnerDecision} orderType={draft.entryType} />
          ) : (
            <ProRiskTicket ticketState={proTicketState} onPreview={onPreview} />
          )}
        </div>
      </div>

      <RecentTickets tickets={recentTickets} />
      {mode === "beginner" ? (
        <details className="advanced-home risk-advanced-data">
          <summary>Advanced data</summary>
          <p>{wsDebug.status === "streaming" ? "Live flow is streaming. Advanced metrics are optional." : "Flow data is still collecting. Trade planning remains available."}</p>
          <ProMetricsPanel state={state} metrics={metrics} calc={calc} wsDebug={wsDebug} now={now} />
          <BuilderCodePanel calc={calc} />
        </details>
      ) : null}
      <p className="footer-disclaimer">Perpetual futures are risky. HypurrScope helps you plan and preview; it does not provide financial advice.</p>
    </section>
  );
}

function AssetCard({
  asset,
  state,
  metrics,
  signal,
  now,
  onOpen,
}: {
  asset: AssetConfig;
  state: AssetState;
  metrics: MetricBundle;
  signal: SignalReadiness | null;
  now: number;
  onOpen: () => void;
}) {
  const dataStatus = assetDataStatus(state, now);
  const sourceText = state.dataError
    ? state.dataError
    : `Source timestamp ${formatSourceTimestamp(state)}`;

  return (
    <article className="asset-card">
      <button className="asset-open" onClick={onOpen}>
        <div>
          <span>{asset.bucket}</span>
          <strong>{asset.displayName}</strong>
        </div>
        <em className={signal?.active ? "signal-active" : ""}>{signalBadge(signal)}</em>
      </button>
      <div className="asset-card-grid">
        <div><span>Price</span><strong>{formatMarketValue(state.market.price, formatUsd, "price", ["markPx"], state)}</strong></div>
        <div><span>15m</span><strong className={directionClass(metrics.price15m)}>{formatCandleChange(metrics.price15m, "15m", state)}</strong></div>
        <div><span>1h</span><strong className={directionClass(metrics.price1h)}>{formatCandleChange(metrics.price1h, "1h", state)}</strong></div>
        <div><span>Open interest</span><strong>{formatMarketValue(state.market.oiUsd, formatUsd, "open interest", ["openInterestRaw", "openInterestUsdComputed"], state)}</strong></div>
        <div><span>24h volume</span><strong>{formatMarketValue(state.market.volume24hUsd, formatUsd, "24h volume", ["dayNtlVlm"], state)}</strong></div>
        <div><span>Hourly funding</span><strong>{formatMarketValue(state.market.fundingPct, formatFunding, "funding", ["fundingRaw"], state)}</strong></div>
        <div><span>Spread</span><strong>{formatSpread(metrics.spreadBps, state)}</strong></div>
        <div><span>Depth +/-10 bps</span><strong>{formatDepth10(metrics.depth10Bps, state)}</strong></div>
      </div>
      <small className="asset-source">Source Hyperliquid REST - Data status {dataStatus} - {sourceText}</small>
      <button className="text-action" onClick={onOpen}>View details</button>
    </article>
  );
}

function SignalTable({ signals, onAlert }: { signals: SignalReadiness[]; onAlert: (signal: SignalReadiness) => void }) {
  const rows = rankSignals(signals);
  if (!rows.length) {
    return (
      <div className="compact-empty">
        Scanner setups need live price, OI and flow history.
        <small>BTC, ETH and HYPE will appear here once enough data is available.</small>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Asset</th><th>Setup</th><th>Structure score</th><th>Flow score</th><th>Final score</th><th>Status</th><th>Flow inputs</th><th>Passed conditions</th><th>Failed conditions</th><th>Current value / target value</th><th>Action</th></tr>
        </thead>
        <tbody>
          {rows.map((signal) => (
            <tr key={`${signal.asset}-${signal.kind}`} data-testid={`closest-setup-${signal.asset}-${signal.kind.replace(/\s+/g, "-").toLowerCase()}`}>
              <td data-col="asset"><strong>{signal.asset}</strong></td>
              <td data-col="setup">{signal.kind}</td>
              <td data-col="structure-score">{signal.structureScore === null ? "Structure unavailable" : `${signal.structureScore}%`}</td>
              <td data-col="flow-score">{signal.flowScore === null ? `unavailable${signal.flowMissing.length ? `: ${signal.flowMissing.join(", ")}` : ""}` : `${signal.flowScore}%`}</td>
              <td data-col="final-score">{signal.finalScore === null ? "not evaluable" : `${signal.finalScore}%`}</td>
              <td data-col="status">{signal.status}</td>
              <td data-col="flow-inputs">{signal.flowInputs.join(" | ")}</td>
              <td data-col="passed-conditions">{signal.passed.length ? signal.passed.join(" | ") : "No condition passed yet"}</td>
              <td data-col="failed-conditions">{signal.missing.length ? signal.missing.join(" | ") : "No missing condition"}</td>
              <td data-col="current-target">{signal.details.join(" | ")}</td>
              <td data-col="action"><button className="table-action" disabled={signal.finalScore === null} onClick={() => onAlert(signal)}>{signal.finalScore === null ? "Not evaluable" : "Create alert"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowEventsTable({ events, flowState }: { events: FlowEvent[]; flowState: FlowDisplayState }) {
  const explanation = "Recent Flow only shows threshold events. Flow Score uses continuous taker flow, net flow and CVD.";
  if (!events.length) {
    const emptyText =
      flowState.status === "connecting" ? "Preparing live flow stream" :
      flowState.status === "reconnecting" ? "Reconnecting live flow stream" :
      flowState.status === "collecting" ? `Collecting live flow: ${flowState.minutes}m since page open` :
      flowState.status === "stale" ? "Live flow stream is stale" :
      flowState.status === "error" ? `Flow data unavailable: ${flowState.error || "Hyperliquid WebSocket error"}` :
      "Streaming. No events above threshold since page open";
    return (
      <div className="compact-empty">
        {emptyText}.
        {flowState.status !== "error" && flowState.hypeError ? <small>{flowState.hypeError}</small> : null}
        <small>{explanation}</small>
        <small>Large trades: BTC $1M, ETH $500K, HYPE $100K. Flow bursts: BTC $10M, ETH $6M, HYPE $1.5M.</small>
      </div>
    );
  }
  return (
    <>
      <small className="panel-note">{explanation}</small>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Time</th><th>Asset</th><th>Event</th><th>Side</th><th>Notional</th><th>Price</th><th>Context</th><th>Source</th><th>Status</th></tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.time).toLocaleTimeString()}</td>
                <td><strong>{event.asset}</strong></td>
                <td>{event.eventType}</td>
                <td className={event.side === "Buy" ? "positive" : event.side === "Sell" ? "negative" : ""}>{event.side}</td>
                <td>{event.size}</td>
                <td>{formatUsd(event.price, "-")}</td>
                <td>{event.context}</td>
                <td>{event.source}</td>
                <td>{event.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LiveTradeTape({
  assetStates,
  metricsByAsset,
  filter,
}: {
  assetStates: Record<ApiCoin, AssetState>;
  metricsByAsset: Record<ApiCoin, MetricBundle>;
  filter: FlowFilter;
}) {
  const watchedAssets = ASSETS.filter((asset) => filter === "All" || filter === asset.apiCoin || filter === "Large trades" || filter === "Taker bursts");
  const rows = watchedAssets
    .flatMap((asset) => assetStates[asset.apiCoin].trades.slice(0, 16).map((trade) => ({ asset, trade })))
    .sort((a, b) => b.trade.time - a.trade.time)
    .slice(0, 40);

  if (!rows.length) {
    return (
      <div className="compact-empty">
        Waiting for live trades.
        <small>The WebSocket is connected; the tape fills as trades arrive after this page is opened.</small>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Time</th><th>Asset</th><th>Side</th><th>Notional</th><th>Price</th><th>Large trade threshold</th><th>5m net flow</th><th>Buy / sell ratio</th></tr>
        </thead>
        <tbody>
          {rows.map(({ asset, trade }) => {
            const metrics = metricsByAsset[asset.apiCoin];
            const ratio =
              metrics.buyRatio5m === null || metrics.sellRatio5m === null
                ? "Collecting"
                : `${metrics.buyRatio5m.toFixed(1)}% / ${metrics.sellRatio5m.toFixed(1)}%`;
            return (
              <tr key={`${asset.apiCoin}-${trade.id}`}>
                <td>{new Date(trade.time).toLocaleTimeString()}</td>
                <td><strong>{asset.shortName}</strong></td>
                <td className={trade.side === "Buy" ? "positive" : "negative"}>{trade.side}</td>
                <td>{formatUsd(trade.notionalUsd)}</td>
                <td>{formatUsd(trade.price)}</td>
                <td>{trade.notionalUsd >= asset.thresholds.largeTradeUsd ? "Triggered" : `below ${formatUsd(asset.thresholds.largeTradeUsd)}`}</td>
                <td className={directionClass(metrics.netFlow5m)}>{metrics.netFlow5m === null ? "Collecting" : formatUsd(metrics.netFlow5m)}</td>
                <td>{ratio}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FlowMetricsDebugTable({ metricsByAsset }: { metricsByAsset: Record<ApiCoin, MetricBundle> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>takerBuyRatio5m</th>
            <th>takerSellRatio5m</th>
            <th>buyNotional5m</th>
            <th>sellNotional5m</th>
            <th>netFlow5m</th>
            <th>netBuyFlow5m</th>
            <th>netSellFlow5m</th>
            <th>CVD 5m</th>
            <th>CVD 15m</th>
            <th>CVD 1h</th>
          </tr>
        </thead>
        <tbody>
          {ASSETS.map((asset) => {
            const metrics = metricsByAsset[asset.apiCoin];
            return (
              <tr key={asset.apiCoin} data-testid={`flow-metrics-${asset.apiCoin}`}>
                <td data-col="asset"><strong>{asset.shortName}</strong></td>
                <td data-col="taker-buy-ratio-5m">{formatPct(metrics.takerBuyRatio5m, 1, "collecting", false)}</td>
                <td data-col="taker-sell-ratio-5m">{formatPct(metrics.takerSellRatio5m, 1, "collecting", false)}</td>
                <td data-col="buy-notional-5m">{formatUsd(metrics.buyNotional5m, "collecting")}</td>
                <td data-col="sell-notional-5m">{formatUsd(metrics.sellNotional5m, "collecting")}</td>
                <td data-col="net-flow-5m" className={directionClass(metrics.netFlow5m)}>{formatUsd(metrics.netFlow5m, "collecting")}</td>
                <td data-col="net-buy-flow-5m" className={directionClass(metrics.netBuyFlow5m)}>{formatUsd(metrics.netBuyFlow5m, "collecting")}</td>
                <td data-col="net-sell-flow-5m" className={directionClass(metrics.netSellFlow5m)}>{formatUsd(metrics.netSellFlow5m, "collecting")}</td>
                <td data-col="cvd-5m" className={directionClass(metrics.cvd5m)}>{formatUsd(metrics.cvd5m, "collecting")}</td>
                <td data-col="cvd-15m" className={directionClass(metrics.cvd15m)}>{formatUsd(metrics.cvd15m, "collecting")}</td>
                <td data-col="cvd-1h" className={directionClass(metrics.cvd1h)}>{formatUsd(metrics.cvd1h, "collecting")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeSideMappingDebugTable({ assetStates }: { assetStates: Record<ApiCoin, AssetState> }) {
  const rows = ASSETS.flatMap((asset) => assetStates[asset.apiCoin].trades.slice(0, 10).map((trade) => ({ asset, trade })))
    .sort((a, b) => b.trade.time - a.trade.time)
    .slice(0, 30);

  if (!rows.length) {
    return (
      <div className="compact-empty">
        Waiting for WebSocket trades to confirm side mapping.
        <small>Expected Hyperliquid raw sides: B = Bid/buy, A = Ask/sell.</small>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Asset</th><th>Raw trade side</th><th>Interpreted side</th><th>Price</th><th>Size</th><th>Notional</th><th>Timestamp</th></tr>
        </thead>
        <tbody>
          {rows.map(({ asset, trade }) => (
            <tr key={`${asset.apiCoin}-${trade.id}`} data-testid="trade-side-row">
              <td data-col="asset"><strong>{asset.shortName}</strong></td>
              <td data-col="raw-side">{trade.rawSide || "-"}</td>
              <td data-col="interpreted-side" className={trade.side === "Buy" ? "positive" : "negative"}>{trade.side}</td>
              <td data-col="price">{formatUsd(trade.price)}</td>
              <td data-col="size">{trade.size.toFixed(4)}</td>
              <td data-col="notional">{formatUsd(trade.notionalUsd)}</td>
              <td data-col="timestamp">{new Date(trade.time).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>Side mapping used: raw B = Bid/buy taker, raw A = Ask/sell taker.</small>
    </div>
  );
}

function ReadinessCard({ signal }: { signal: SignalReadiness }) {
  return (
    <article className={signal.active ? "readiness-card active" : "readiness-card"}>
      <div className="readiness-head">
        <strong>{signal.kind}</strong>
        <span>{signal.finalScore === null ? `structure ${signal.structureScore ?? "unavailable"}${signal.structureScore === null ? "" : "%"}` : `${signal.finalScore}%`}</span>
      </div>
      <em>{signal.status === "not_evaluable_flow_missing" ? "flow collecting" : signal.finalScore === null ? "not evaluable" : signal.active ? "active" : "inactive"}</em>
      <div className="check-list">
        {signal.passed.map((item) => <span className="passed" key={item}>OK {item}</span>)}
        {signal.missing.map((item) => <span className="missing" key={item}>Missing {item}</span>)}
      </div>
    </article>
  );
}

function presetRules(asset: AssetConfig, kind: SignalKind) {
  const t = asset.thresholds;
  if (kind === "Fresh Long") {
    return [
      `Net buy flow 5m >= ${formatUsd(t.flow5mUsd)}`,
      "Taker buy ratio 5m > 60%",
      `OI change 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`,
      `Price change 15m > ${formatPct(t.price15mPct, 2, "", false)}`,
      "Liquidity healthy and funding not extreme",
    ];
  }
  if (kind === "Fresh Short") {
    return [
      `Net sell flow 5m >= ${formatUsd(t.flow5mUsd)}`,
      "Taker sell ratio 5m > 60%",
      `OI change 15m >= ${formatPct(t.oi15mPct, 2, "", false)}`,
      `Price change 15m < -${formatPct(t.price15mPct, 2, "", false)}`,
      "Liquidity healthy and funding not extreme",
    ];
  }
  if (kind === "Crowded Long") {
    return [
      `Hourly funding > +${formatPct(t.fundingPct, 3, "", false)}`,
      `OI change 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`,
      "Price momentum is stalling",
      "Long-side taker pressure visible",
    ];
  }
  return [
    `Hourly funding < -${formatPct(t.fundingPct, 3, "", false)}`,
    `OI change 4h >= ${formatPct(t.oi4hPct, 2, "", false)}`,
    "Downside momentum is stalling",
    "Short-side taker pressure visible",
  ];
}

function presetThresholds(asset: AssetConfig, kind: SignalKind): Record<string, number | string> {
  const t = asset.thresholds;
  if (kind === "Fresh Long") {
    return {
      netBuyFlow5mUsd: t.flow5mUsd,
      takerBuyRatioPct: 60,
      oi15mPct: t.oi15mPct,
      price15mPct: t.price15mPct,
      liquidity: "healthy",
      funding: "not extreme",
    };
  }
  if (kind === "Fresh Short") {
    return {
      netSellFlow5mUsd: t.flow5mUsd,
      takerSellRatioPct: 60,
      oi15mPct: t.oi15mPct,
      price15mPct: -t.price15mPct,
      liquidity: "healthy",
      funding: "not extreme",
    };
  }
  if (kind === "Crowded Long") {
    return {
      fundingGreaterPct: t.fundingPct,
      oi4hPct: t.oi4hPct,
      momentum: "stalling",
      takerPressure: "long-side visible",
    };
  }
  return {
    fundingLowerPct: -t.fundingPct,
    oi4hPct: t.oi4hPct,
    momentum: "downside stalling",
    takerPressure: "short-side visible",
  };
}

function defaultCustomDraft(asset: AssetConfig): CustomAlertDraft {
  return {
    direction: "Fresh Long",
    price15mPct: asset.thresholds.price15mPct,
    oi15mPct: asset.thresholds.oi15mPct,
    oi4hPct: asset.thresholds.oi4hPct,
    fundingGreaterPct: asset.thresholds.fundingPct,
    fundingLowerPct: -asset.thresholds.fundingPct,
    takerBuyRatioPct: 60,
    takerSellRatioPct: 60,
    netBuyFlow5mUsd: asset.thresholds.flow5mUsd,
    netSellFlow5mUsd: asset.thresholds.flow5mUsd,
    largeTradeUsd: asset.thresholds.largeTradeUsd,
    spreadBps: 4,
    depthUsd: asset.thresholds.minDepthUsd,
    triggerMode: "all",
    triggerCount: 4,
    destination: "Browser",
    cooldownMinutes: 20,
  };
}

function customThresholds(draft: CustomAlertDraft): Record<string, number | string> {
  return {
    direction: draft.direction,
    price15mPct: draft.price15mPct,
    oi15mPct: draft.oi15mPct,
    oi4hPct: draft.oi4hPct,
    fundingGreaterPct: draft.fundingGreaterPct,
    fundingLowerPct: draft.fundingLowerPct,
    takerBuyRatioPct: draft.takerBuyRatioPct,
    takerSellRatioPct: draft.takerSellRatioPct,
    netBuyFlow5mUsd: draft.netBuyFlow5mUsd,
    netSellFlow5mUsd: draft.netSellFlow5mUsd,
    largeTradeUsd: draft.largeTradeUsd,
    spreadBps: draft.spreadBps,
    depthUsd: draft.depthUsd,
    cooldownMinutes: draft.cooldownMinutes,
  };
}

function alertFingerprint(
  asset: ApiCoin,
  kind: string,
  thresholds: Record<string, number | string>,
  destination: AlertDestination,
  triggerMode: TriggerMode,
  triggerCount: number,
) {
  const thresholdKey = Object.keys(thresholds)
    .sort()
    .map((key) => `${key}:${thresholds[key]}`)
    .join("|");
  return `${asset}|${kind}|${destination}|${triggerMode}|${triggerCount}|${thresholdKey}`;
}

function AlertPresetGrid({
  asset,
  alerts,
  onCreate,
}: {
  asset: AssetConfig;
  alerts: AlertRule[];
  onCreate: (asset: AssetConfig, kind: SignalKind) => void;
}) {
  return (
    <div className="preset-grid">
      {PRESET_KINDS.map((kind) => {
        const thresholds = presetThresholds(asset, kind);
        const fingerprint = alertFingerprint(asset.apiCoin, kind, thresholds, "Browser", "all", Object.keys(thresholds).length);
        const alreadyCreated = alerts.some((alert: AlertRule) => alert.fingerprint === fingerprint);
        return (
          <article className="preset-card" key={kind}>
            <header>
              <div>
                <span>Preset alert</span>
                <strong>{asset.shortName} {kind}</strong>
              </div>
              <em>Template</em>
            </header>
            <ul>
              {presetRules(asset, kind).map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
            <small>
              Calibration: large trade {formatUsd(asset.thresholds.largeTradeUsd)} / flow 5m {formatUsd(asset.thresholds.flow5mUsd)}
            </small>
            <button className="table-action" disabled={alreadyCreated} onClick={() => onCreate(asset, kind)}>
              {alreadyCreated ? "Already created" : "Create preset alert"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="builder-field">
      <span>{label}</span>
      <div>
        {prefix ? <em>{prefix}</em> : null}
        <input type="number" value={value} step="any" onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function CustomAlertBuilder({
  asset,
  draft,
  duplicate,
  onChange,
  onCreate,
}: {
  asset: AssetConfig;
  draft: CustomAlertDraft;
  duplicate: boolean;
  onChange: (draft: CustomAlertDraft) => void;
  onCreate: () => void;
}) {
  const conditionCount = Object.keys(customThresholds(draft)).length;
  return (
    <div className="custom-builder">
      <div className="builder-field">
        <span>Asset</span>
        <select value={asset.apiCoin} disabled>
          <option>{asset.shortName}</option>
        </select>
      </div>
      <label className="builder-field">
        <span>Setup direction</span>
        <select value={draft.direction} onChange={(event) => onChange({ ...draft, direction: event.target.value as SignalKind })}>
          {PRESET_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
      </label>
      <NumberField label="Price 15m threshold" value={draft.price15mPct} suffix="%" onChange={(value) => onChange({ ...draft, price15mPct: value })} />
      <NumberField label="OI 15m threshold" value={draft.oi15mPct} suffix="%" onChange={(value) => onChange({ ...draft, oi15mPct: value })} />
      <NumberField label="OI 4h threshold" value={draft.oi4hPct} suffix="%" onChange={(value) => onChange({ ...draft, oi4hPct: value })} />
      <NumberField label="Funding above" value={draft.fundingGreaterPct} suffix="%" onChange={(value) => onChange({ ...draft, fundingGreaterPct: value })} />
      <NumberField label="Funding below" value={draft.fundingLowerPct} suffix="%" onChange={(value) => onChange({ ...draft, fundingLowerPct: value })} />
      <NumberField label="Taker buy ratio" value={draft.takerBuyRatioPct} suffix="%" onChange={(value) => onChange({ ...draft, takerBuyRatioPct: value })} />
      <NumberField label="Taker sell ratio" value={draft.takerSellRatioPct} suffix="%" onChange={(value) => onChange({ ...draft, takerSellRatioPct: value })} />
      <NumberField label="Net buy flow 5m" value={draft.netBuyFlow5mUsd} prefix="$" onChange={(value) => onChange({ ...draft, netBuyFlow5mUsd: value })} />
      <NumberField label="Net sell flow 5m" value={draft.netSellFlow5mUsd} prefix="$" onChange={(value) => onChange({ ...draft, netSellFlow5mUsd: value })} />
      <NumberField label="Large trade threshold" value={draft.largeTradeUsd} prefix="$" onChange={(value) => onChange({ ...draft, largeTradeUsd: value })} />
      <NumberField label="Spread threshold" value={draft.spreadBps} suffix="bps" onChange={(value) => onChange({ ...draft, spreadBps: value })} />
      <NumberField label="Depth threshold" value={draft.depthUsd} prefix="$" onChange={(value) => onChange({ ...draft, depthUsd: value })} />
      <label className="builder-field">
        <span>Trigger logic</span>
        <select value={draft.triggerMode} onChange={(event) => onChange({ ...draft, triggerMode: event.target.value as TriggerMode })}>
          <option value="all">All conditions</option>
          <option value="any">Any N conditions</option>
        </select>
      </label>
      <NumberField label="N conditions" value={draft.triggerCount} onChange={(value) => onChange({ ...draft, triggerCount: clamp(Math.round(value), 1, conditionCount) })} />
      <label className="builder-field">
        <span>Destination</span>
        <select value={draft.destination} onChange={(event) => onChange({ ...draft, destination: event.target.value as AlertDestination })}>
          <option value="Browser">Browser</option>
          <option value="Telegram" disabled>Telegram (soon)</option>
          <option value="Webhook" disabled>Webhook (soon)</option>
        </select>
      </label>
      <NumberField label="Cooldown" value={draft.cooldownMinutes} suffix="min" onChange={(value) => onChange({ ...draft, cooldownMinutes: clamp(Math.round(value), 1, 240) })} />
      <div className="builder-submit">
        <span>{duplicate ? "Already created" : `${asset.shortName} custom alert ready`}</span>
        <button className="primary-action" disabled={duplicate} onClick={onCreate}>{duplicate ? "Already created" : "Create custom alert"}</button>
      </div>
    </div>
  );
}

function MyAlertsTable({
  alerts,
  filter,
  onFilter,
  onToggle,
}: {
  alerts: AlertRule[];
  filter: AlertFilter;
  onFilter: (filter: AlertFilter) => void;
  onToggle: (id: string) => void;
}) {
  const filters: AlertFilter[] = ["All", "BTC", "ETH", "HYPE", "Enabled", "Disabled"];
  const rows = alerts.filter((alert: AlertRule) => {
    if (filter === "All") return true;
    if (filter === "Enabled") return alert.enabled;
    if (filter === "Disabled") return !alert.enabled;
    return alert.asset === filter;
  });
  return (
    <>
      <div className="alert-filter-row">
        {filters.map((item) => (
          <button className={filter === item ? "active" : ""} key={item} onClick={() => onFilter(item)}>{item}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Setup</th><th>Type</th><th>Logic</th><th>Destination</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((alert) => (
              <tr key={alert.id}>
                <td><strong>{alert.asset}</strong></td>
                <td>{alert.kind}</td>
                <td>{alert.alertType}</td>
                <td>{alert.triggerMode === "all" ? "All conditions" : `Any ${alert.triggerCount}`}</td>
                <td>{alert.destination}</td>
                <td>{alert.enabled ? "Enabled" : "Disabled"}</td>
                <td>{new Date(alert.createdAt).toLocaleString()}</td>
                <td><button className="table-action muted-action" onClick={() => onToggle(alert.id)}>{alert.enabled ? "Disable" : "Enable"}</button></td>
              </tr>
            )) : <tr><td colSpan={8}>No alerts match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AlertTabs({ active, onChange }: { active: AlertTab; onChange: (tab: AlertTab) => void }) {
  const tabs: Array<{ key: AlertTab; label: string }> = [
    { key: "presets", label: "Presets" },
    { key: "builder", label: "Create your own" },
    { key: "saved", label: "My alerts" },
  ];
  return (
    <div className="alert-tabs" role="tablist" aria-label="Alert sections">
      {tabs.map((tab) => (
        <button className={active === tab.key ? "active" : ""} key={tab.key} onClick={() => onChange(tab.key)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function WatchlistTable({
  assetStates,
  metricsByAsset,
  onOpen,
}: {
  assetStates: Record<ApiCoin, AssetState>;
  metricsByAsset: Record<ApiCoin, MetricBundle>;
  onOpen: (asset: ApiCoin) => void;
}) {
  return (
    <div className="table-wrap watchlist-table">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price</th>
            <th>15m</th>
            <th>1h</th>
            <th>OI 15m</th>
            <th>OI 1h</th>
            <th>OI 4h</th>
            <th>Hourly funding</th>
            <th>Taker 5m</th>
            <th>CVD 15m</th>
            <th>Spread</th>
            <th>Depth +/-10bps</th>
            <th>Signal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {ASSETS.map((asset) => {
            const state = assetStates[asset.apiCoin];
            const metrics = metricsByAsset[asset.apiCoin];
            const signal = bestSignal(allSignals(asset, metrics));
            return (
              <tr key={asset.apiCoin}>
                <td><strong>{asset.shortName}</strong><small>{asset.bucket}</small></td>
                <td>{formatUsd(state.market.price)}</td>
                <td className={directionClass(metrics.price15m)}>{formatPct(metrics.price15m)}</td>
                <td className={directionClass(metrics.price1h)}>{formatPct(metrics.price1h)}</td>
                <td>{formatPct(metrics.oi15m, 2, oiBackendLabel(state, 15))}</td>
                <td>{formatPct(metrics.oi1h, 2, oiBackendLabel(state, 60))}</td>
                <td>{formatPct(metrics.oi4h, 2, oiBackendLabel(state, 240))}</td>
                <td className={directionClass(state.market.fundingPct)}>{formatFunding(state.market.fundingPct)}</td>
                <td className={directionClass(metrics.netFlow5m)}>{metrics.netFlow5m === null ? "Connecting" : formatUsd(metrics.netFlow5m)}</td>
                <td className={directionClass(metrics.cvd15m)}>{metrics.cvd15m === null ? "Connecting" : formatUsd(metrics.cvd15m)}</td>
                <td>{metrics.spreadBps === null ? "Loading" : `${metrics.spreadBps.toFixed(2)} bps`}</td>
                <td>{formatUsd(metrics.depth10Bps)}</td>
                <td>{signalBadge(signal)}</td>
                <td><button className="table-action" onClick={() => onOpen(asset.apiCoin)}>View details</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FlowStatusCards({
  events,
  flowState,
  metricsByAsset,
}: {
  events: FlowEvent[];
  flowState: FlowDisplayState;
  metricsByAsset: Record<ApiCoin, MetricBundle>;
}) {
  const largestEvent = events.find((event) => event.event === "Large trade") || events[0] || null;
  const mostActive = [...ASSETS].sort((a, b) => Math.abs(metricsByAsset[b.apiCoin].netFlow5m ?? 0) - Math.abs(metricsByAsset[a.apiCoin].netFlow5m ?? 0))[0];
  const strongestFlow = mostActive ? metricsByAsset[mostActive.apiCoin].netFlow5m : null;
  const label =
    flowState.status === "connecting" ? "Connecting" :
    flowState.status === "reconnecting" ? "Reconnecting" :
    flowState.status === "collecting" ? "Collecting live flow" :
    flowState.status === "stale" ? "Stale" :
    flowState.status === "error" ? "Error" :
    "Streaming";
  return (
    <section className="risk-summary flow-summary">
      <article>
        <span>WebSocket status</span>
        <strong>{label}</strong>
        <small>{flowState.status === "error" ? `Flow data unavailable: ${flowState.error || "Hyperliquid WebSocket error"}` : flowState.hypeError || (flowState.status === "streaming" && !events.length ? "No events above threshold since page open." : `${flowState.minutes}m since page open`)}</small>
      </article>
      <article>
        <span>Events since page open</span>
        <strong>{events.length}</strong>
        <small>Large trades and 5m taker-flow bursts only.</small>
      </article>
      <article>
        <span>Largest event</span>
        <strong>{largestEvent ? largestEvent.size : "None yet"}</strong>
        <small>{largestEvent ? `${largestEvent.asset} ${largestEvent.eventType}` : flowState.hypeError || "Waiting for a qualifying trade."}</small>
      </article>
      <article>
        <span>Strongest net flow</span>
        <strong>{mostActive ? mostActive.shortName : "None"}</strong>
        <small>{strongestFlow === null ? "Connecting" : formatUsd(strongestFlow)}</small>
      </article>
    </section>
  );
}

function filterFlowEvents(events: FlowEvent[], filter: FlowFilter) {
  if (filter === "All") return events;
  if (ASSET_ORDER.includes(filter as ApiCoin)) return events.filter((event) => event.asset === filter);
  if (filter === "Large trades") return events.filter((event) => event.eventType === "Large trade");
  if (filter === "Taker bursts") return events.filter((event) => event.eventType === "Flow burst");
  return [];
}

function FlowFilterRow({ filter, onFilter }: { filter: FlowFilter; onFilter: (filter: FlowFilter) => void }) {
  const filters: FlowFilter[] = ["All", "BTC", "ETH", "HYPE", "Large trades", "Taker bursts"];
  return (
    <div className="alert-filter-row">
      {filters.map((item) => (
        <button className={filter === item ? "active" : ""} key={item} onClick={() => onFilter(item)}>{item}</button>
      ))}
    </div>
  );
}

function normalizeWalletResult(payload: any): WalletResult {
  const positions: WalletPosition[] = (Array.isArray(payload?.assetPositions) ? payload.assetPositions : [])
    .map((row: any) => {
      const position = row?.position || {};
      const size = n(position.szi);
      return {
        coin: String(position.coin || row.coin || "-"),
        size,
        side: size === null ? "-" : size > 0 ? "Long" : "Short",
        entryPx: n(position.entryPx),
        markPx: n(position.markPx),
        positionValue: n(position.positionValue),
        unrealizedPnl: n(position.unrealizedPnl),
        liquidationPx: n(position.liquidationPx),
        leverage: n(position.leverage?.value ?? position.leverage),
        marginUsed: n(position.marginUsed),
      };
    })
    .filter((position: WalletPosition) => position.coin !== "-" && position.size !== null && position.size !== 0);
  const totalNotional = positions.reduce((sum, position) => sum + Math.abs(position.positionValue ?? 0), 0);
  return {
    accountValue: n(payload?.marginSummary?.accountValue ?? payload?.crossMarginSummary?.accountValue),
    marginUsed: n(payload?.marginSummary?.totalMarginUsed ?? payload?.crossMarginSummary?.totalMarginUsed),
    totalNotional,
    withdrawable: n(payload?.withdrawable),
    unrealizedPnl: positions.reduce((sum, position) => sum + (position.unrealizedPnl ?? 0), 0),
    positions,
  };
}

function WalletScanResult({ result }: { result: WalletResult }) {
  return (
    <div className="wallet-result">
      <div className="metric-grid wallet-metrics">
        <AssetMetricCard label="Account value" value={formatUsd(result.accountValue)} meta="clearinghouseState" />
        <AssetMetricCard label="Margin used" value={formatUsd(result.marginUsed)} meta="read-only public address" />
        <AssetMetricCard label="Total notional" value={formatUsd(result.totalNotional)} meta="open position value" />
        <AssetMetricCard label="Withdrawable" value={formatUsd(result.withdrawable)} meta="public account field" />
        <AssetMetricCard label="Unrealized PnL" value={formatUsd(result.unrealizedPnl)} meta="sum of open positions" />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>Position value</th><th>Unrealized PnL</th><th>Liq price</th><th>Leverage</th><th>Margin used</th></tr></thead>
          <tbody>
            {result.positions.length ? result.positions.map((position) => (
              <tr key={position.coin}>
                <td><strong>{position.coin}</strong></td>
                <td>{position.side}</td>
                <td className={directionClass(position.size)}>{position.size === null ? "Unavailable" : position.size.toFixed(4)}</td>
                <td>{formatUsd(position.entryPx)}</td>
                <td>{formatUsd(position.markPx, "Not available")}</td>
                <td>{formatUsd(position.positionValue)}</td>
                <td className={directionClass(position.unrealizedPnl)}>{formatUsd(position.unrealizedPnl)}</td>
                <td>{formatUsd(position.liquidationPx, "Not available")}</td>
                <td>{position.leverage === null ? "Not available" : `${position.leverage.toFixed(1)}x`}</td>
                <td>{formatUsd(position.marginUsed, "Not available")}</td>
              </tr>
            )) : <tr><td colSpan={10}>No open perp positions found. Possible reasons: no open positions, wrong address, or an agent wallet instead of the master/sub-account address.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QAPanel({
  assets,
  metricsByAsset,
  wsDebug,
}: {
  assets: Record<ApiCoin, AssetState>;
  metricsByAsset: Record<ApiCoin, MetricBundle>;
  wsDebug: WsDebugState;
}) {
  const subscriptions = Object.values(wsDebug.subscriptions);
  return (
    <Panel title="QA source panel" right="enabled with ?qa=1">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Raw markPx</th><th>Displayed price</th><th>Raw/display funding</th><th>Raw openInterest</th><th>Displayed OI USD</th><th>Oracle</th><th>Premium</th><th>Spread</th><th>Depth +/-10bps</th><th>Depth +/-25bps</th><th>Meta</th><th>Trades</th><th>Book</th><th>State</th></tr></thead>
          <tbody>
            {ASSETS.map((asset) => {
              const state = assets[asset.apiCoin];
              const metrics = metricsByAsset[asset.apiCoin];
              return (
                <tr key={asset.apiCoin}>
                  <td><strong>{asset.shortName}</strong></td>
                  <td>{state.market.price === null ? "Unavailable" : state.market.price.toString()}</td>
                  <td>{formatUsd(state.market.price)}</td>
                  <td>{state.market.fundingPct === null ? "Unavailable" : formatFunding(state.market.fundingPct)}</td>
                  <td>{state.market.openInterestRaw === null ? "Unavailable" : state.market.openInterestRaw.toString()}</td>
                  <td>{formatUsd(state.market.oiUsd, "Unavailable")}</td>
                  <td>{formatUsd(state.market.oraclePx, "Unavailable")}</td>
                  <td>{state.market.premium === null ? "Unavailable" : state.market.premium.toString()}</td>
                  <td>{metrics.spreadBps === null ? "Unavailable" : `${metrics.spreadBps.toFixed(3)} bps`}</td>
                  <td>{formatUsd(metrics.depth10Bps, "Unavailable")}</td>
                  <td>{formatUsd(metrics.depth25Bps, "Unavailable")}</td>
                  <td>{ageLabel(state.freshness.meta)}</td>
                  <td>{ageLabel(state.freshness.trades)}</td>
                  <td>{ageLabel(state.freshness.book)}</td>
                  <td>{state.requestFailed ? "API error" : freshnessState(state.freshness.meta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>WebSocket status</th><th>Connected at</th><th>Last message</th><th>Reconnects</th><th>Raw messages</th><th>Acks</th><th>Last subscription</th><th>Error</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>{wsDebug.status}</strong></td>
              <td>{wsDebug.connectedAt ? new Date(wsDebug.connectedAt).toLocaleTimeString() : "-"}</td>
              <td>{wsDebug.lastMessageAt ? ageLabel(wsDebug.lastMessageAt) : "-"}</td>
              <td>{wsDebug.reconnects}</td>
              <td>{wsDebug.rawMessagesCount}</td>
              <td>{wsDebug.subscriptionAcksCount}</td>
              <td>{wsDebug.lastSubscriptionSent || "-"}</td>
              <td>{wsDebug.error || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Channel</th><th>Asset</th><th>Subscription ack</th><th>Last message</th><th>Error</th></tr></thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.key}>
                <td>{subscription.channel}</td>
                <td><strong>{subscription.asset}</strong></td>
                <td>{subscription.acknowledgedAt ? new Date(subscription.acknowledgedAt).toLocaleTimeString() : "Waiting"}</td>
                <td>{subscription.lastMessageAt ? ageLabel(subscription.lastMessageAt) : "Waiting"}</td>
                <td>{subscription.error || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function HypurrScopeClient({ initialAssets: initialAssetState }: { initialAssets?: InitialAssetStateMap }) {
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<number | null>(null);
  const wsPingRef = useRef<number | null>(null);
  const wsStaleRef = useRef<number | null>(null);
  const wsAttemptRef = useRef(0);
  const wsLastMessageRef = useRef<number | null>(null);
  const flowOpenedAtRef = useRef(Date.now());
  const hasInitialRestData = initialRestDataReady(initialAssetState);
  const [assets, setAssets] = useState<Record<ApiCoin, AssetState>>(() => mergeInitialAssets(initialAssetState));
  const [selected, setSelected] = useState<ApiCoin>("HYPE");
  const [view, setView] = useState<View>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("price");
  const [chartInterval, setChartInterval] = useState<ChartInterval>("5m");
  const [connection, setConnection] = useState<ConnectionState>(() => hasInitialRestData ? "live" : "loading");
  const [lastUpdate, setLastUpdate] = useState<number | undefined>(() => initialLastUpdate(initialAssetState));
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("All");
  const [alertTab, setAlertTab] = useState<AlertTab>("presets");
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("All");
  const [wsDebug, setWsDebug] = useState<WsDebugState>(() => createWsDebugState("connecting"));
  const [customDraft, setCustomDraft] = useState<CustomAlertDraft>(() => defaultCustomDraft(ASSET_BY_COIN.HYPE));
  const [wallet, setWallet] = useState("");
  const [walletError, setWalletError] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletResult, setWalletResult] = useState<WalletResult | null>(null);
  const [qaEnabled, setQaEnabled] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [riskMode, setRiskMode] = useState<RiskMode>("beginner");
  const [perpMeta, setPerpMeta] = useState<Record<string, PerpAssetMeta>>({});
  const [perpMetaError, setPerpMetaError] = useState<string | null>(null);
  const [riskDraft, setRiskDraft] = useState<RiskTicketDraft>({
    side: null,
    ticketMode: "target-first",
    entryType: "Market",
    maxTotalRiskUsd: "100",
    desiredRewardRisk: "2",
    entryPrice: "",
    stopLoss: "",
    targetPrice: "",
    leverage: "3",
    marginMode: "Isolated",
    accountEquityUsd: "",
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);

  const patchAsset = (coin: ApiCoin, updater: (state: AssetState) => AssetState) => {
    setAssets((current) => ({ ...current, [coin]: updater(current[coin]) }));
  };

  useEffect(() => {
    setQaEnabled(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("qa") === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPerpMeta()
      .then((meta) => {
        if (!cancelled) {
          setPerpMeta(meta);
          setPerpMetaError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setPerpMetaError(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("hypurrscope_recent_risk_tickets");
      if (stored) setRecentTickets(JSON.parse(stored).slice(0, 10));
    } catch {
      setRecentTickets([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("hypurrscope_recent_risk_tickets", JSON.stringify(recentTickets.slice(0, 10)));
  }, [recentTickets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === "/watchlist") setView("watchlist");
    if (path === "/alerts") setView("alerts");
    if (path === "/wallet-scanner") setView("wallet");
    if (path === "/recent-flow") setView("flow");
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialMarkets() {
      try {
        const payload = await fetchHlMarkets();
        if (cancelled) return;
        if (!payload.ok) {
          const message = payload.error || "HL markets unavailable";
          setAssets((current) => {
            const next = { ...current };
            ASSET_ORDER.forEach((coin) => {
              next[coin] = { ...next[coin], dataError: message, requestFailed: true };
            });
            return next;
          });
          setConnection("failed");
          return;
        }

        const markets = normalizeHlMarkets(payload);
        setAssets((current) => {
          const next = { ...current };
          ASSET_ORDER.forEach((coin) => {
            const row = markets[coin];
            if (!row) {
              next[coin] = {
                ...next[coin],
                missingFields: ["asset"],
                dataError: `${coin} missing from /api/hl/markets`,
                requestFailed: true,
              };
              return;
            }
            next[coin] = {
              ...next[coin],
              market: row.market,
              oiHistory: appendOi(next[coin].oiHistory, row.market.oiUsd),
              fundingHistory: appendFunding(next[coin].fundingHistory, row.market.fundingPct),
              freshness: { ...next[coin].freshness, meta: row.sourceUpdatedAt || Date.now() },
              sourceUpdatedAt: row.sourceUpdatedAt,
              sourceUpdatedAtIso: row.sourceUpdatedAtIso,
              missingFields: row.missingFields,
              dataError: null,
              requestFailed: false,
            };
          });
          return next;
        });
        setLastUpdate(Date.now());
        setConnection("live");
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setAssets((current) => {
          const next = { ...current };
          ASSET_ORDER.forEach((coin) => {
            next[coin] = { ...next[coin], dataError: message, requestFailed: true };
          });
          return next;
        });
        setConnection("failed");
      }
    }

    loadInitialMarkets();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCandlesAndBook() {
      const [candleRows, bookRows] = await Promise.all([
        Promise.all(ASSETS.map((asset) => fetchCandles(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const).catch((error) => [asset.apiCoin, { ok: false, coin: asset.apiCoin, interval: "1m", error: error instanceof Error ? error.message : String(error) } as HlCandlesResponse] as const))),
        Promise.all(ASSETS.map((asset) => fetchBook(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const).catch((error) => [asset.apiCoin, { ok: false, coin: asset.apiCoin, error: error instanceof Error ? error.message : String(error) } as HlBookResponse] as const))),
      ]);
      if (cancelled) return;

      setAssets((current) => {
        const next = { ...current };
        ASSET_ORDER.forEach((coin) => {
          const candlePayload = payloadFor(candleRows, coin) as HlCandlesResponse | undefined;
          const bookPayload = payloadFor(bookRows, coin) as HlBookResponse | undefined;
          const candles = candlePayload?.ok ? normalizeCandles(candlePayload) : next[coin].candles;
          const book = bookPayload?.ok ? normalizeBook(bookPayload) : next[coin].book;
          next[coin] = {
            ...next[coin],
            candles,
            book,
            freshness: {
              ...next[coin].freshness,
              candles: candles.length ? Date.parse(candlePayload?.updatedAt || "") || Date.now() : next[coin].freshness.candles,
              book: book ? Date.parse(bookPayload?.updatedAt || "") || Date.now() : next[coin].freshness.book,
            },
            candleError: candlePayload?.ok ? null : candlePayload?.error || next[coin].candleError,
            bookError: bookPayload?.ok ? null : bookPayload?.error || next[coin].bookError,
          };
        });
        return next;
      });
    }

    loadInitialCandlesAndBook();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendOiHistory() {
      const rows = await Promise.all(
        ASSETS.map((asset) => fetchOiHistory(asset.apiCoin)
          .then((payload) => [asset.apiCoin, payload] as const)
          .catch((error) => [asset.apiCoin, {
            ok: false,
            asset: asset.apiCoin,
            currentOiUsd: null,
            oiUsd15mAgo: null,
            oiUsd1hAgo: null,
            oiUsd4hAgo: null,
            oiChange15mPct: null,
            oiChange1hPct: null,
            oiChange4hPct: null,
            availableHistoryMinutes: 0,
            requiredHistoryMinutes: { oi15m: 15, oi1h: 60, oi4h: 240 },
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          } as OiHistoryResponse] as const)),
      );
      if (cancelled) return;

      setAssets((current) => {
        const next = { ...current };
        ASSET_ORDER.forEach((coin) => {
          const backendOi = payloadFor(rows, coin) as OiHistoryResponse | undefined;
          next[coin] = {
            ...next[coin],
            backendOi: backendOi || next[coin].backendOi,
            market: {
              ...next[coin].market,
              oiUsd: n(backendOi?.currentOiUsd) ?? next[coin].market.oiUsd,
            },
          };
        });
        return next;
      });
    }

    async function snapshotAndReloadOiHistory() {
      await fetch("/api/cron/snapshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      }).catch(() => undefined);
      if (!cancelled) await loadBackendOiHistory();
    }

    snapshotAndReloadOiHistory();
    const timer = window.setInterval(snapshotAndReloadOiHistory, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/alerts", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { alerts: [] })
      .then((payload) => {
        if (Array.isArray(payload.alerts)) setAlerts(payload.alerts);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBackfill() {
      setConnection((current) => current === "live" ? "live" : "loading");
      try {
        const requestTime = Date.now();
        const [metaPayload, candlePayloads, bookPayloads, fundingPayloads, historyPayloads]: [
          unknown,
          Array<readonly [ApiCoin, unknown]>,
          Array<readonly [ApiCoin, unknown]>,
          Array<readonly [ApiCoin, unknown]>,
          Array<readonly [ApiCoin, unknown]>,
        ] = await Promise.all([
          fetchMeta(),
          Promise.all(ASSETS.map((asset) => fetchCandles(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const).catch((error) => [asset.apiCoin, { ok: false, coin: asset.apiCoin, interval: "1m", error: error instanceof Error ? error.message : String(error) } as HlCandlesResponse] as const))),
          Promise.all(ASSETS.map((asset) => fetchBook(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const).catch((error) => [asset.apiCoin, { ok: false, coin: asset.apiCoin, error: error instanceof Error ? error.message : String(error) } as HlBookResponse] as const))),
          Promise.all(ASSETS.map((asset) => postInfo({ type: "fundingHistory", coin: asset.apiCoin, startTime: requestTime - 24 * 60 * 60 * 1000, endTime: requestTime }).then((payload) => [asset.apiCoin, payload] as const).catch(() => [asset.apiCoin, []] as const))),
          Promise.all(ASSETS.map((asset) => fetchContextHistory(asset.apiCoin).then((payload) => [asset.apiCoin, payload] as const).catch(() => [asset.apiCoin, { rows: [] }] as const))),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const meta = normalizeMeta(metaPayload);
        setAssets((current) => {
          const next = { ...current };
          ASSETS.forEach((asset) => {
            const previous = current[asset.apiCoin];
            const backfillMarket = meta[asset.apiCoin] || { ...EMPTY_MARKET };
            const candlePayload = payloadFor(candlePayloads, asset.apiCoin) as HlCandlesResponse | undefined;
            const bookPayload = payloadFor(bookPayloads, asset.apiCoin) as HlBookResponse | undefined;
            const market = {
              price: backfillMarket.price ?? previous.market.price,
              prevPrice: backfillMarket.prevPrice ?? previous.market.prevPrice,
              midPx: backfillMarket.midPx ?? previous.market.midPx,
              fundingPct: backfillMarket.fundingPct ?? previous.market.fundingPct,
              premium: backfillMarket.premium ?? previous.market.premium,
              openInterestRaw: backfillMarket.openInterestRaw ?? previous.market.openInterestRaw,
              oiUsd: backfillMarket.oiUsd ?? previous.market.oiUsd,
              volume24hUsd: backfillMarket.volume24hUsd ?? previous.market.volume24hUsd,
              oraclePx: backfillMarket.oraclePx ?? previous.market.oraclePx,
            };
            const candles = candlePayload?.ok ? normalizeCandles(candlePayload) : previous.candles;
            const book = bookPayload?.ok ? normalizeBook(bookPayload) : previous.book;
            const candleError = candlePayload?.ok ? null : candlePayload?.error || previous.candleError;
            const bookError = bookPayload?.ok ? null : bookPayload?.error || previous.bookError;
            const contextHistory = normalizeContextHistory(payloadFor(historyPayloads, asset.apiCoin));
            const fundingHistory = appendFunding(
              normalizeFundingHistory(payloadFor(fundingPayloads, asset.apiCoin)).concat(contextHistory.fundingHistory).sort((a, b) => a.time - b.time).slice(-1000),
              market.fundingPct,
            );
            next[asset.apiCoin] = {
              ...previous,
              market,
              candles,
              book,
              trades: previous.trades,
              oiHistory: appendOi(contextHistory.oiHistory, market.oiUsd),
              fundingHistory,
              freshness: {
                ...previous.freshness,
                meta: market.price !== null ? previous.sourceUpdatedAt || now : previous.freshness.meta,
                candles: candles.length ? Date.parse(candlePayload?.updatedAt || "") || now : previous.freshness.candles,
                book: book ? Date.parse(bookPayload?.updatedAt || "") || now : previous.freshness.book,
              },
              candleError,
              bookError,
              requestFailed: false,
            };
          });
          return next;
        });
        setLastUpdate(now);
        setConnection("live");
      } catch {
        if (!cancelled) {
          setConnection((current) => current === "live" ? "live" : "failed");
          setAssets((current) => {
            const next = { ...current };
            ASSET_ORDER.forEach((coin) => {
              next[coin] = { ...next[coin], requestFailed: !next[coin].sourceUpdatedAt };
            });
            return next;
          });
        }
      }
    }

    loadBackfill();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let stopped = false;

    const clearWsTimers = () => {
      if (wsReconnectRef.current) window.clearTimeout(wsReconnectRef.current);
      if (wsPingRef.current) window.clearInterval(wsPingRef.current);
      if (wsStaleRef.current) window.clearInterval(wsStaleRef.current);
      wsReconnectRef.current = null;
      wsPingRef.current = null;
      wsStaleRef.current = null;
    };

    const subscribeAll = (ws: WebSocket) => {
      WS_SUBSCRIPTIONS.forEach((subscription) => {
        ws.send(JSON.stringify({ method: "subscribe", subscription }));
        setWsDebug((current) => ({ ...current, lastSubscriptionSent: subscriptionKey(subscription) }));
      });
    };

    function reconnect() {
      if (stopped) return;
      clearWsTimers();
      setConnection("stale");
      setWsDebug((current) => ({
        ...current,
        status: "reconnecting",
        reconnects: current.reconnects + 1,
        error: "WebSocket disconnected; reconnecting",
      }));
      const delay = Math.min(15_000, 1_000 * Math.max(1, 2 ** Math.min(wsAttemptRef.current, 4)));
      wsAttemptRef.current += 1;
      wsReconnectRef.current = window.setTimeout(connect, delay);
    }

    function connect() {
      if (stopped) return;
      const ws = new WebSocket(HYPERLIQUID_WS_URL);
      wsRef.current = ws;
      const openTimeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.CONNECTING) return;
        const error = `WebSocket connection timed out while connecting to ${HYPERLIQUID_WS_URL}`;
        setConnection("stale");
        setWsDebug((current) => ({ ...current, status: "error", error }));
        ws.close();
      }, 20_000);
      setWsDebug((current) => ({
        ...createWsDebugState(wsAttemptRef.current > 0 ? "reconnecting" : "connecting", current),
        reconnects: current.reconnects,
        error: null,
      }));

      ws.onopen = () => {
        window.clearTimeout(openTimeout);
        const now = Date.now();
        wsAttemptRef.current = 0;
        wsLastMessageRef.current = null;
        setConnection("live");
        setLastUpdate(now);
        setWsDebug((current) => ({
          ...createWsDebugState("connected", current),
          connectedAt: now,
          reconnects: current.reconnects,
          error: null,
        }));
        subscribeAll(ws);

        wsPingRef.current = window.setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (!wsLastMessageRef.current && Date.now() - now > 45_000) ws.close();
        }, 30_000);

        wsStaleRef.current = window.setInterval(() => {
          setWsDebug((current) => {
            const last = current.lastMessageAt || current.connectedAt;
            if (!last || Date.now() - last < 90_000 || current.status === "reconnecting" || current.status === "connecting") return current;
            setConnection("stale");
            return { ...current, status: "stale", error: "No WebSocket messages for 90s" };
          });
        }, 5_000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const channel = String(message.channel || "");
          const data = message.data;
          const now = Date.now();
          wsLastMessageRef.current = now;
          setLastUpdate(now);
          setWsDebug((current) => ({
            ...current,
            lastMessageAt: now,
            rawMessagesCount: current.rawMessagesCount + 1,
            lastRawMessagePreview: String(event.data || "").slice(0, 500),
          }));

          if (channel === "subscriptionResponse") {
            const subscription = subscriptionFromMessage(message);
            if (subscription) {
              setWsDebug((current) => ({
                ...markWsSubscription(current, subscription, now),
                subscriptionAcksCount: current.subscriptionAcksCount + 1,
              }));
            } else {
              setWsDebug((current) => ({ ...current, subscriptionAcksCount: current.subscriptionAcksCount + 1 }));
            }
            return;
          }

          if (channel === "error" || message.error) {
            const errorText = String(message.error || data?.error || "Hyperliquid WebSocket error");
            const subscription = subscriptionFromMessage(message);
            setWsDebug((current) => {
              const next = { ...current, status: "error" as WebSocketStatus, error: errorText };
              if (!subscription) return next;
              const key = subscriptionKey(subscription);
              const row = next.subscriptions[key];
              return {
                ...next,
                subscriptions: {
                  ...next.subscriptions,
                  [key]: row ? { ...row, error: errorText } : {
                    key,
                    channel: subscription.type,
                    asset: subscription.coin || "all",
                    acknowledgedAt: null,
                    lastMessageAt: null,
                    error: errorText,
                  },
                },
              };
            });
            setConnection("stale");
            return;
          }

          const liveSubscription = subscriptionFromLiveMessage(channel, data, message);
          if (liveSubscription) setWsDebug((current) => markWsMessage(current, liveSubscription, now));

          if (channel === "allMids" && data?.mids) {
            setAssets((current) => {
              const next = { ...current };
              ASSET_ORDER.forEach((coin) => {
                const price = n(data.mids[coin]);
                if (price !== null) {
                  next[coin] = {
                    ...next[coin],
                    market: { ...next[coin].market, price },
                    freshness: { ...next[coin].freshness, meta: now, ws: now },
                  };
                }
              });
              return next;
            });
          }

          if (channel === "candle") {
            const rows = Array.isArray(data) ? data : [data];
            rows.forEach((row) => {
              const coin = messageAsset(row) || message?.subscription?.coin;
              if (!coin) return;
              const candle = normalizeCandles([row]).slice(-1)[0];
              if (candle) patchAsset(coin, (state) => ({
                ...state,
                candles: mergeCandle(state.candles, candle),
                freshness: { ...state.freshness, candles: now, ws: now },
              }));
            });
          }

          if (channel === "trades") {
            const rawRows = Array.isArray(data) ? data : Array.isArray(data?.trades) ? data.trades : [];
            const coin = rawRows[0]?.coin || rawRows[0]?.s || messageAsset(rawRows) || messageAsset(data) || message?.subscription?.coin;
            if (ASSET_ORDER.includes(coin)) {
              const trades = rawRows.map(normalizeTrade).filter((trade: Trade | null): trade is Trade => trade !== null);
              patchAsset(coin, (state) => ({
                ...state,
                trades: appendTrades(state.trades, trades),
                freshness: { ...state.freshness, trades: now, ws: now },
              }));
            }
          }

          if (channel === "l2Book") {
            const coin = messageAsset(data) || message?.subscription?.coin;
            if (coin) {
              const book = normalizeBook(data);
              if (book) patchAsset(coin, (state) => ({
                ...state,
                book,
                freshness: { ...state.freshness, book: now, ws: now },
              }));
            }
          }

          if (channel === "activeAssetCtx") {
            const coin = messageAsset(data) || message?.subscription?.coin;
            const ctx = data?.ctx || data;
            if (coin) {
              const price = n(ctx.markPx ?? ctx.midPx ?? ctx.oraclePx);
              const midPx = n(ctx.midPx);
              const fundingRaw = n(ctx.funding);
              const openInterest = n(ctx.openInterest);
              const oiUsd = openInterest !== null && price !== null ? openInterest * price : null;
              patchAsset(coin, (state) => ({
                ...state,
                market: {
                  ...state.market,
                  price: price ?? state.market.price,
                  midPx: midPx ?? state.market.midPx,
                  fundingPct: fundingRaw === null ? state.market.fundingPct : fundingRaw * 100,
                  premium: n(ctx.premium) ?? state.market.premium,
                  openInterestRaw: openInterest ?? state.market.openInterestRaw,
                  oiUsd: oiUsd ?? state.market.oiUsd,
                  volume24hUsd: n(ctx.dayNtlVlm) ?? state.market.volume24hUsd,
                  oraclePx: n(ctx.oraclePx) ?? state.market.oraclePx,
                },
                oiHistory: appendOi(state.oiHistory, oiUsd ?? state.market.oiUsd),
                fundingHistory: appendFunding(state.fundingHistory, fundingRaw === null ? state.market.fundingPct : fundingRaw * 100),
                freshness: { ...state.freshness, meta: now, ws: now },
              }));
            }
          }
        } catch (error) {
          setWsDebug((current) => ({
            ...current,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      };

      ws.onerror = () => {
        setConnection("stale");
        setWsDebug((current) => ({ ...current, status: "error", error: "Hyperliquid WebSocket error" }));
      };
      ws.onclose = () => {
        window.clearTimeout(openTimeout);
        reconnect();
      };
    }

    connect();

    return () => {
      stopped = true;
      clearWsTimers();
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, []);

  const metricsByAsset = useMemo(() => {
    return Object.fromEntries(ASSETS.map((asset) => [asset.apiCoin, metricsFor(asset, assets[asset.apiCoin])])) as Record<ApiCoin, MetricBundle>;
  }, [assets]);

  const signals = useMemo(() => {
    return ASSETS.flatMap((asset) => allSignals(asset, metricsByAsset[asset.apiCoin]));
  }, [metricsByAsset]);

  const rankedSignals = useMemo(() => rankSignals(signals), [signals]);
  const activeSignals = rankedSignals.filter((signal) => signal.active);
  const bestActiveSignal = rankedSignals.find((signal) => signal.active) || null;
  const closestSummarySignal = bestActiveSignal || rankedSignals.find((signal) => signal.status === "near") || null;
  const best = rankedSignals[0] || null;
  const dataReady = ASSET_ORDER.every((coin) => {
    const assetState = assets[coin];
    return assetState.market.price !== null && assetState.market.fundingPct !== null && assetState.market.oiUsd !== null && assetState.candles.length >= 2 && assetState.book !== null;
  });
  const flowSinceOpenMinutes = Math.max(0, Math.floor((nowTick - flowOpenedAtRef.current) / 60_000));
  const tradeSubscriptions = ASSET_ORDER.map((coin) => wsDebug.subscriptions[subscriptionKey({ type: "trades", coin })]);
  const tradeStreamsActive = tradeSubscriptions.every((subscription) => Boolean(subscription?.lastMessageAt));
  const tradeStreamStale = tradeSubscriptions.some((subscription) => Boolean(subscription?.lastMessageAt && nowTick - subscription.lastMessageAt > 120_000));
  const hypeTrade = wsDebug.subscriptions[subscriptionKey({ type: "trades", coin: "HYPE" })];
  const hypeError =
    hypeTrade?.error ||
    (hypeTrade?.lastMessageAt && nowTick - hypeTrade.lastMessageAt > 120_000 ? "HYPE trades stream is stale." : null) ||
    (!hypeTrade?.lastMessageAt && flowSinceOpenMinutes >= 2 && wsDebug.connectedAt ? "HYPE trades stream has not received messages yet." : null);
  const initialWsFailure = !wsDebug.connectedAt && Boolean(wsDebug.error);
  const flowStatus: FlowStatus =
    initialWsFailure || wsDebug.status === "error" ? "error" :
    wsDebug.status === "reconnecting" ? "reconnecting" :
    wsDebug.status === "stale" || tradeStreamStale || connection === "stale" ? "stale" :
    !wsDebug.connectedAt ? "connecting" :
    !tradeStreamsActive ? "collecting" :
    "streaming";
  const flowState: FlowDisplayState = {
    status: flowStatus,
    minutes: flowSinceOpenMinutes,
    wsStatus: wsDebug.status,
    tradeStreamsActive,
    hypeError,
    error: wsDebug.error || hypeError,
  };
  const state = marketState(signals, metricsByAsset, dataReady, connection);
  const selectedAsset = ASSET_BY_COIN[selected];
  const selectedState = assets[selected];
  const selectedMetrics = metricsByAsset[selected];
  const selectedAssetMeta = assetMetaFor(perpMeta, selectedAsset.apiCoin);
  const riskTicketCalc = useMemo(
    () => calculateRiskTicket(selectedAsset, selectedState, selectedMetrics, riskDraft, wsDebug, nowTick, selectedAssetMeta),
    [selectedAsset, selectedState, selectedMetrics, riskDraft, wsDebug, nowTick, selectedAssetMeta],
  );
  const riskTicketState = useMemo(() => {
    const health = dataHealth(selectedState, wsDebug, nowTick);
    const side: CoreSide | null = riskDraft.side === "Long" ? "long" : riskDraft.side === "Short" ? "short" : null;
    return deriveTicketState({
      side,
      asset: selectedAsset.apiCoin,
      entryType: riskDraft.entryType === "Market" ? "market" : "limit",
      entryPrice: parsePositiveNumber(riskDraft.entryPrice),
      marketPrice: selectedState.market.price,
      bestBid: selectedState.book?.bestBid ?? null,
      bestAsk: selectedState.book?.bestAsk ?? null,
      targetPrice: parsePositiveNumber(riskDraft.targetPrice),
      stopLoss: parsePositiveNumber(riskDraft.stopLoss),
      maxTotalRiskUsd: parsePositiveNumber(riskDraft.maxTotalRiskUsd),
      rewardRisk: parsePositiveNumber(riskDraft.desiredRewardRisk),
      leverage: parsePositiveNumber(riskDraft.leverage),
      assetMeta: selectedAssetMeta,
      pricingDataStatus: health.marketStatus,
      orderBookStatus: health.orderBookStatus,
      executionEnabled: riskTicketCalc.executionEnabled,
      builderEnabled: getBuilderConfig(false, 0).enabled,
      builderApproved: getBuilderConfig(false, 0).status === "approved",
    });
  }, [riskDraft, selectedAsset.apiCoin, selectedState, selectedAssetMeta, wsDebug, nowTick, riskTicketCalc.executionEnabled]);
  const selectedSignals = allSignals(selectedAsset, selectedMetrics);
  const selectedBest = bestSignal(selectedSignals);
  const customFingerprint = alertFingerprint(
    selected,
    `Custom ${customDraft.direction}`,
    customThresholds(customDraft),
    customDraft.destination,
    customDraft.triggerMode,
    customDraft.triggerCount,
  );
  const customDuplicate = alerts.some((alert: AlertRule) => alert.fingerprint === customFingerprint);
  const liveFlowEvents = useMemo(() => ASSETS.flatMap((asset) => buildFlowEvents(asset, assets[asset.apiCoin], metricsByAsset[asset.apiCoin]))
    .sort((a, b) => b.time - a.time)
    .slice(0, 40), [assets, metricsByAsset]);
  const flowEvents = Array.from(new Map(liveFlowEvents.map((event) => [event.id, event])).values())
    .sort((a, b) => b.time - a.time)
    .slice(0, 60);
  const filteredFlowEvents = filterFlowEvents(flowEvents, flowFilter);
  const marketWarning = marketAssetWarning(metricsByAsset);

  useEffect(() => {
    setCustomDraft(defaultCustomDraft(selectedAsset));
  }, [selectedAsset]);

  function saveAlert(rule: AlertRule) {
    setAlerts((current) => {
      if (current.some((alert: AlertRule) => alert.fingerprint === rule.fingerprint)) return current;
      return [rule].concat(current).slice(0, 60);
    });
    void fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rule),
    }).catch(() => undefined);
    setView("alerts");
    setAlertTab("saved");
  }

  function previewRiskTicket() {
    if (riskTicketCalc.invalidationReason || riskTicketCalc.maxTotalRiskUsd === null || !riskDraft.side) return;
    const ticket: RecentTicket = {
      id: `risk-ticket-${selected}-${Date.now()}`,
      createdAt: Date.now(),
      asset: selected,
      side: riskDraft.side,
      potentialProfitUsd: riskTicketCalc.estimatedNetProfitUsd,
      maxTotalRiskUsd: riskTicketCalc.maxTotalRiskUsd,
      riskRewardRatio: riskTicketCalc.rewardRiskNet,
      status: "previewed",
    };
    setRecentTickets((current) => [ticket].concat(current).slice(0, 10));
  }

  function loadSampleHypeTrade() {
    const hypeState = assets.HYPE;
    const entry = hypeState.book?.bestAsk ?? hypeState.market.price;
    const hypeMeta = assetMetaFor(perpMeta, "HYPE");
    const targetPrice = entry === null ? "" : roundedTargetInput(entry * 1.025, hypeMeta);
    setSelected("HYPE");
    setRiskMode("beginner");
    setRiskDraft({
      side: "Long",
      ticketMode: "target-first",
      entryType: "Market",
      maxTotalRiskUsd: "100",
      desiredRewardRisk: "2",
      entryPrice: "",
      stopLoss: "",
      targetPrice,
      leverage: "2",
      marginMode: "Isolated",
      accountEquityUsd: "",
    });
  }

  function createAlert(signal: SignalReadiness) {
    if (signal.finalScore === null) return;
    const asset = ASSET_BY_COIN[signal.asset];
    const thresholds = presetThresholds(asset, signal.kind);
    const triggerCount = Object.keys(thresholds).length;
    const now = Date.now();
    const rule: AlertRule = {
      id: `alert-${signal.asset}-${signal.kind}-${now}`,
      asset: signal.asset,
      kind: signal.kind,
      alertType: "live",
      fingerprint: alertFingerprint(signal.asset, signal.kind, thresholds, "Browser", "all", triggerCount),
      thresholds,
      triggerMode: "all",
      triggerCount,
      cooldownSeconds: 20 * 60,
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: null,
      enabled: true,
      destination: "Browser",
    };
    setSelected(signal.asset);
    saveAlert(rule);
  }

  function createPresetAlert(asset: AssetConfig, kind: SignalKind) {
    const thresholds = presetThresholds(asset, kind);
    const triggerCount = Object.keys(thresholds).length;
    const now = Date.now();
    saveAlert({
      id: `preset-${asset.apiCoin}-${kind}-${now}`,
      asset: asset.apiCoin,
      kind,
      alertType: "preset",
      fingerprint: alertFingerprint(asset.apiCoin, kind, thresholds, "Browser", "all", triggerCount),
      thresholds,
      triggerMode: "all",
      triggerCount,
      cooldownSeconds: 20 * 60,
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: null,
      enabled: true,
      destination: "Browser",
    });
  }

  function createCustomAlert() {
    const now = Date.now();
    saveAlert({
      id: `custom-${selected}-${now}`,
      asset: selected,
      kind: `Custom ${customDraft.direction}`,
      alertType: "custom",
      fingerprint: customFingerprint,
      thresholds: customThresholds(customDraft),
      triggerMode: customDraft.triggerMode,
      triggerCount: customDraft.triggerCount,
      cooldownSeconds: customDraft.cooldownMinutes * 60,
      createdAt: now,
      updatedAt: now,
      lastTriggeredAt: null,
      enabled: true,
      destination: customDraft.destination,
    });
  }

  function toggleAlert(id: string) {
    setAlerts((current) => current.map((alert: AlertRule) => {
      if (alert.id !== id) return alert;
      const next = { ...alert, enabled: !alert.enabled, updatedAt: Date.now() };
      void fetch("/api/alerts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, enabled: next.enabled }),
      }).catch(() => undefined);
      return next;
    }));
  }

  async function scanWallet() {
    const trimmed = wallet.trim();
    setWalletResult(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setWalletError("Invalid address. Paste a public Hyperliquid/EVM address like 0x followed by 40 hex characters.");
      return;
    }
    setWalletError("");
    setWalletLoading(true);
    try {
      const payload = await postInfo({ type: "clearinghouseState", user: trimmed });
      setWalletResult(normalizeWalletResult(payload));
    } catch {
      setWalletError("Unable to scan this public address right now. Hyperliquid may be temporarily unavailable.");
    } finally {
      setWalletLoading(false);
    }
  }

  const connectionLabel =
    wsDebug.status === "streaming" ? "Streaming" :
    wsDebug.status === "connected" ? "Connected" :
    wsDebug.status === "reconnecting" ? "Reconnecting" :
    wsDebug.status === "error" ? "Error" :
    connection === "failed" ? "Error" :
    connection === "loading" || wsDebug.status === "connecting" ? "Live data connecting" :
    connection === "stale" ? "Stale" :
    dataReady ? "Connected" :
    "Live data connecting";

  return (
    <main className="risk-shell">
      <aside className="risk-rail">
        <div className="risk-brand">
          <span>HS</span>
          <div>
            <strong>HypurrScope</strong>
            <small>Risk-first execution for Hyperliquid</small>
          </div>
        </div>
        <nav>
          {[
            ["overview", "Trade Builder"],
            ["watchlist", "Advanced Data"],
            ["flow", "History"],
          ].map(([key, label]) => (
            <button className={view === key ? "active" : ""} key={key} onClick={() => setView(key as View)}>{label}</button>
          ))}
        </nav>
        <div className="risk-rail-foot">
          <span className={`connection ${connection}`}>{connectionLabel}</span>
          <small>Last update {ageLabel(lastUpdate)}</small>
        </div>
      </aside>

      <section className="risk-page">
        <header className="risk-topbar">
          <div className="asset-switcher">
            {ASSETS.map((asset) => (
              <button className={selected === asset.apiCoin ? "active" : ""} key={asset.apiCoin} onClick={() => setSelected(asset.apiCoin)}>
                {asset.shortName}
              </button>
            ))}
          </div>
          <span className={`connection ${connection}`}>{connectionLabel}</span>
          <span className="preview-badge">Preview only</span>
        </header>

        {view === "overview" && (
          <>
            <RiskTicket
              asset={selectedAsset}
              state={selectedState}
              metrics={selectedMetrics}
              draft={riskDraft}
              mode={riskMode}
              calc={riskTicketCalc}
              wsDebug={wsDebug}
              now={nowTick}
              recentTickets={recentTickets}
              ticketState={riskTicketState}
              assetMeta={selectedAssetMeta}
              assetMetaError={perpMetaError}
              onAssetChange={setSelected}
              onDraftChange={setRiskDraft}
              onModeChange={setRiskMode}
              onSampleHypeTrade={loadSampleHypeTrade}
              onPreview={previewRiskTicket}
            />
            <details className="advanced-home">
              <summary>Legacy scanner</summary>
              <p>{activeSignals.length ? `${activeSignals.length} scanner setup(s) in advanced diagnostics.` : "No scanner setup right now. You can still build your own trade."}</p>
              <section className="risk-summary">
                <article>
                  <span>Market State</span>
                  <strong>{state}</strong>
                  <small>{marketWarning || marketSentence(best, state)}</small>
                </article>
                <article>
                  <span>Best active setup</span>
                  <strong data-testid="best-active-setup">{!dataReady ? "Not available yet" : bestActiveSignal ? `${bestActiveSignal.asset} ${bestActiveSignal.kind}` : "None"}</strong>
                  <small>{!dataReady ? "Waiting for BTC, ETH and HYPE live source data." : bestActiveSignal ? summarySignalText(bestActiveSignal) : "Best active setup: None"}</small>
                  <small data-testid="closest-setup-summary">Closest setup: {!dataReady ? "Waiting for live source data" : summarySignalText(closestSummarySignal)}</small>
                </article>
                <article>
                  <span>Flow status</span>
                  <strong>{flowState.status === "streaming" ? "Streaming" : flowState.status === "collecting" ? "Collecting" : flowState.status === "reconnecting" ? "Reconnecting" : flowState.status === "stale" ? "Stale" : flowState.status === "error" ? "Error" : "Connecting"}</strong>
                  <small>{flowState.status === "streaming" ? "Live flow since page open." : `Collecting live flow: ${flowState.minutes}m since page open.`}</small>
                </article>
                <article>
                  <span>Alerts</span>
                  <strong>{alerts.filter((alert) => alert.enabled).length}</strong>
                  <small><button className="inline-link" onClick={() => { setView("alerts"); setAlertTab("saved"); }}>Manage alerts</button></small>
                </article>
              </section>

              <section className="asset-grid">
                {ASSETS.map((asset) => {
                  const assetSignals = allSignals(asset, metricsByAsset[asset.apiCoin]);
                  return (
                    <AssetCard
                      asset={asset}
                      state={assets[asset.apiCoin]}
                      metrics={metricsByAsset[asset.apiCoin]}
                      signal={bestSignal(assetSignals)}
                      now={nowTick}
                      key={asset.apiCoin}
                      onOpen={() => { setSelected(asset.apiCoin); setView("asset"); }}
                    />
                  );
                })}
              </section>

              <section className="two-panels">
                <Panel title="Closest setups" right={activeSignals.length ? `${activeSignals.length} active` : "No scanner setup"}>
                  <SignalTable signals={signals} onAlert={createAlert} />
                </Panel>
                <Panel title="Recent Flow Events" right="since page open">
                  <FlowEventsTable events={flowEvents} flowState={flowState} />
                </Panel>
              </section>
            </details>
          </>
        )}

        {view === "watchlist" && (
          <>
            <PageHead title="Advanced Data" subtitle="Optional BTC / ETH / HYPE market details for traders who want the raw context." />
            <Panel title="BTC / ETH / HYPE market board" right="Hyperliquid perps only">
              <WatchlistTable
                assetStates={assets}
                metricsByAsset={metricsByAsset}
                onOpen={(asset) => { setSelected(asset); setView("asset"); }}
              />
            </Panel>
          </>
        )}

        {view === "asset" && (
          <>
            <section className="asset-header">
              <div>
                <span>{selectedAsset.bucket}</span>
                <h1>{selectedAsset.displayName}</h1>
                <p>{selectedBest?.explanation || "Live data connecting. Trade planning remains available."}</p>
              </div>
              <div>
                <strong>{formatUsd(selectedState.market.price)}</strong>
                <em className={selectedBest?.active ? "signal-active" : ""}>{signalBadge(selectedBest)}</em>
              </div>
            </section>

            <section className="metric-grid">
              <AssetMetricCard label="Price" value={formatUsd(selectedState.market.price)} meta={`15m ${formatPct(selectedMetrics.price15m)} / 1h ${formatPct(selectedMetrics.price1h)}`} title="Price uses Hyperliquid markPx, with allMids as live fallback." timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="24h volume" value={formatUsd(selectedState.market.volume24hUsd)} meta={`RVOL 5m ${selectedMetrics.relativeVolume5m === null ? "insufficient history" : `${selectedMetrics.relativeVolume5m.toFixed(2)}x`}`} timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Open Interest USD" value={formatUsd(selectedState.market.oiUsd)} meta={`15m ${formatPct(selectedMetrics.oi15m, 2, oiBackendLabel(selectedState, 15))} / 1h ${formatPct(selectedMetrics.oi1h, 2, oiBackendLabel(selectedState, 60))} / 4h ${formatPct(selectedMetrics.oi4h, 2, oiBackendLabel(selectedState, 240))}`} title="Open interest is the current notional value of open perp positions." timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Hourly funding" value={formatFunding(selectedState.market.fundingPct)} meta="raw funding converted to percent" title="Funding shows which side pays to hold perp exposure." timestamp={selectedState.freshness.meta} />
              <AssetMetricCard label="Taker pressure" value={selectedMetrics.netFlow5m === null ? "Loading" : formatUsd(selectedMetrics.netFlow5m)} meta={`5m buy ${formatPct(selectedMetrics.buyRatio5m, 1, "Loading", false)} / 15m ${formatUsd(selectedMetrics.netFlow15m)}`} title="Taker pressure estimates aggressive buy versus sell notional." timestamp={selectedState.freshness.trades} />
              <AssetMetricCard label="Spread + depth" value={selectedMetrics.spreadBps === null ? "Loading" : `${selectedMetrics.spreadBps.toFixed(2)} bps`} meta={`Depth +/-10 bps ${formatUsd(selectedMetrics.depth10Bps)} / +/-25 bps ${formatUsd(selectedMetrics.depth25Bps)}`} title="Liquidity uses spread and +/-10 bps near-book depth from the order book." timestamp={selectedState.freshness.book} />
            </section>

            <Panel title={`${selectedAsset.shortName} chart`} right={<Freshness timestamp={selectedState.freshness.candles} />}>
              <div className="chart-toolbar chart-toolbar-split">
                <div className="toolbar-group">
                  {(["price", "oi", "cvd", "funding"] as ChartMode[]).map((mode) => (
                    <button className={chartMode === mode ? "active" : ""} key={mode} onClick={() => setChartMode(mode)}>
                      {mode === "cvd" ? <Tooltip label="CVD" text="Cumulative volume delta: aggressive buy notional minus aggressive sell notional." /> : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="toolbar-group">
                  {CHART_INTERVALS.map((row) => (
                    <button className={chartInterval === row.key ? "active" : ""} key={row.key} onClick={() => setChartInterval(row.key)}>
                      {row.label}
                    </button>
                  ))}
                </div>
              </div>
              <TradingChart state={selectedState} mode={chartMode} interval={chartInterval} />
            </Panel>

            <section className="two-panels">
              <Panel title="Signal Readiness" right={selectedBest?.active ? "active" : "inactive"}>
                <div className="readiness-grid">
                  {selectedSignals.map((signal) => <ReadinessCard signal={signal} key={signal.kind} />)}
                </div>
              </Panel>
              <Panel title={`${selectedAsset.shortName} recent flow`} right="since page open">
                <FlowEventsTable events={buildFlowEvents(selectedAsset, selectedState, selectedMetrics)} flowState={flowState} />
              </Panel>
            </section>
          </>
        )}

        {view === "flow" && (
          <>
            <PageHead title="History" subtitle="Recent plans, live flow events and optional scanner history." />
            <FlowStatusCards events={flowEvents} flowState={flowState} metricsByAsset={metricsByAsset} />
            <Panel title="All watched assets" right="BTC / ETH / HYPE">
              <FlowFilterRow filter={flowFilter} onFilter={setFlowFilter} />
              <FlowEventsTable events={filteredFlowEvents} flowState={flowState} />
            </Panel>
            <Panel title="Live trade tape" right="real WebSocket trades">
              <LiveTradeTape assetStates={assets} metricsByAsset={metricsByAsset} filter={flowFilter} />
            </Panel>
            <Panel title="Flow metrics debug" right="5m taker pressure">
              <FlowMetricsDebugTable metricsByAsset={metricsByAsset} />
            </Panel>
            <Panel title="Trade side mapping debug" right="raw WebSocket trades">
              <TradeSideMappingDebugTable assetStates={assets} />
            </Panel>
          </>
        )}

        {view === "alerts" && (
          <>
            <PageHead title="Alerts" subtitle="Presets and custom rules are controlled by the selected BTC / ETH / HYPE asset." />
            <Panel title="Alert workspace" right={selectedAsset.shortName}>
              <AlertTabs active={alertTab} onChange={setAlertTab} />
              {alertTab === "presets" && <AlertPresetGrid asset={selectedAsset} alerts={alerts} onCreate={createPresetAlert} />}
              {alertTab === "builder" && (
                <CustomAlertBuilder
                  asset={selectedAsset}
                  draft={customDraft}
                  duplicate={customDuplicate}
                  onChange={setCustomDraft}
                  onCreate={createCustomAlert}
                />
              )}
              {alertTab === "saved" && <MyAlertsTable alerts={alerts} filter={alertFilter} onFilter={setAlertFilter} onToggle={toggleAlert} />}
            </Panel>
          </>
        )}

        {view === "wallet" && (
          <>
            <PageHead title="Wallet Scanner" subtitle="Beta read-only scan. Public Hyperliquid address only." />
            <Panel title="Read-only wallet input" right="public address only">
              <form className="wallet-row" onSubmit={(event) => { event.preventDefault(); scanWallet(); }}>
                <input value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="0x..." />
                <button className="primary-action" disabled={walletLoading}>{walletLoading ? "Scanning..." : "Scan"}</button>
              </form>
              {walletError ? <div className="form-error">{walletError}</div> : null}
              {!walletResult && !walletError ? (
                <div className="compact-empty">
                  Paste a public Hyperliquid address to scan open positions and liquidation risk.
                  <small>Read-only scan. Public address lookup only; no approval or secret is requested.</small>
                </div>
              ) : null}
              {walletResult ? <WalletScanResult result={walletResult} /> : null}
            </Panel>
          </>
        )}

        {qaEnabled ? <QAPanel assets={assets} metricsByAsset={metricsByAsset} wsDebug={wsDebug} /> : null}
      </section>
    </main>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="radar-panel">
      <div className="panel-title">
        <h2>{title}</h2>
        {right ? <span>{right}</span> : null}
      </div>
      {children}
    </section>
  );
}

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-head">
      <div>
        <span>HypurrScope Trade Planner</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}

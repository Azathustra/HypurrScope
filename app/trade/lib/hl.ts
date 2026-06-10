// =====================================================================
// HypurrScope Risk Ticket — Hyperliquid trading core
// ---------------------------------------------------------------------
// Self-contained module. The only npm dependency is @nktkas/hyperliquid.
// The user's browser wallet (MetaMask, Rabby, ...) signs everything —
// no private key ever touches this code or any server.
// =====================================================================

import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
} from "@nktkas/hyperliquid";

// ----------------------------------------------------------------------
// Configuration (set these in Vercel > Settings > Environment Variables)
// ----------------------------------------------------------------------

/** Hyperliquid testnet mode. Set NEXT_PUBLIC_HL_TESTNET=1 while testing. */
export const IS_TESTNET = process.env.NEXT_PUBLIC_HL_TESTNET === "1";

/**
 * Your builder address (the wallet that collects builder fees).
 * Must hold at least 100 USDC in its Hyperliquid PERPS balance.
 * If unset, trades are placed WITHOUT a builder fee (everything else works).
 */
export const BUILDER_ADDRESS = (process.env.NEXT_PUBLIC_HL_BUILDER_ADDRESS ??
  "") as `0x${string}` | "";

/** Builder fee in tenths of a basis point. 10 = 1 bp = 0.01%. Perps max: 100. */
export const BUILDER_FEE_TENTH_BPS = Math.min(
  100,
  Math.max(0, Number(process.env.NEXT_PUBLIC_HL_BUILDER_FEE_TENTH_BPS ?? "10")),
);

/** Max fee rate string the user approves once, e.g. "0.01%". Matches the fee above. */
export const BUILDER_MAX_FEE_RATE = `${(BUILDER_FEE_TENTH_BPS / 1000).toFixed(4)}%`;

export const BUILDER_ENABLED =
  /^0x[0-9a-fA-F]{40}$/.test(BUILDER_ADDRESS) && BUILDER_FEE_TENTH_BPS > 0;

/** App URL for the "manage position" link. */
export const HL_APP_URL = IS_TESTNET
  ? "https://app.hyperliquid-testnet.xyz"
  : "https://app.hyperliquid.xyz";

/** Optional referral code used for outbound links to the Hyperliquid app. */
export const HL_REFERRAL_CODE = process.env.NEXT_PUBLIC_HL_REFERRAL_CODE ?? "";

export function hyperliquidTradeUrl(coin: string): string {
  return `${HL_APP_URL}/trade/${coin}`;
}

export function hyperliquidJoinUrl(): string {
  return HL_REFERRAL_CODE ? `${HL_APP_URL}/join/${HL_REFERRAL_CODE}` : HL_APP_URL;
}

// ----------------------------------------------------------------------
// Supported assets
// ----------------------------------------------------------------------

export const COINS = ["BTC", "ETH", "HYPE"] as const;
export type Coin = (typeof COINS)[number];

export type AssetMeta = {
  coin: Coin;
  /** Index in the perps universe (the `a` field of an order). */
  assetId: number;
  /** Size decimals: order sizes are rounded to this many decimals. */
  szDecimals: number;
  /** Protocol max leverage for this asset. */
  maxLeverage: number;
};

// ----------------------------------------------------------------------
// EIP-1193 wallet adapter
// ----------------------------------------------------------------------
// @nktkas/hyperliquid accepts any object shaped like a viem JSON-RPC
// account: signTypedData(params) + getAddresses() + getChainId().
// We build that directly on top of window.ethereum, so we do not need
// to ship viem/wagmi at all.

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

export type BrowserWallet = {
  address: `0x${string}`;
  signTypedData(params: {
    domain: { name: string; version: string; chainId: number; verifyingContract: `0x${string}` };
    types: Record<string, readonly { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
  getAddresses(): Promise<`0x${string}`[]>;
  getChainId(): Promise<number>;
};

/** Ask the injected wallet for access and wrap it for the SDK. */
export async function connectBrowserWallet(): Promise<BrowserWallet> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No browser wallet detected. Install MetaMask or Rabby, then reload this page.",
    );
  }
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as `0x${string}`[];
  if (!accounts?.length) throw new Error("The wallet returned no account.");
  const address = accounts[0];

  return {
    address,
    // NOTE: keep exactly one parameter — the SDK detects the wallet kind
    // from this function's arity.
    async signTypedData(params) {
      const hex = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(params)],
      })) as `0x${string}`;
      return hex;
    },
    async getAddresses() {
      const accs = (await provider.request({ method: "eth_accounts" })) as `0x${string}`[];
      return accs?.length ? accs : [address];
    },
    async getChainId() {
      const hex = (await provider.request({ method: "eth_chainId" })) as string;
      return Number.parseInt(hex, 16);
    },
  };
}

// ----------------------------------------------------------------------
// Clients
// ----------------------------------------------------------------------

const transport = new HttpTransport({ isTestnet: IS_TESTNET });

export const info = new InfoClient({ transport });

export function exchangeFor(wallet: BrowserWallet): ExchangeClient {
  // The SDK signs L1 actions (orders) and user-signed actions
  // (approveBuilderFee) through the wallet adapter above.
  return new ExchangeClient({ transport, wallet });
}

// ----------------------------------------------------------------------
// Perps metadata (asset ids, size decimals, max leverage)
// ----------------------------------------------------------------------

let metaCache: Record<Coin, AssetMeta> | null = null;

export async function loadMeta(): Promise<Record<Coin, AssetMeta>> {
  if (metaCache) return metaCache;
  const meta = await info.meta();
  const out = {} as Record<Coin, AssetMeta>;
  for (const coin of COINS) {
    const idx = meta.universe.findIndex((u) => u.name === coin);
    if (idx < 0) throw new Error(`${coin} not found in the perps universe.`);
    const u = meta.universe[idx];
    out[coin] = {
      coin,
      assetId: idx,
      szDecimals: u.szDecimals,
      maxLeverage: u.maxLeverage,
    };
  }
  metaCache = out;
  return out;
}

/** Mid prices for the three supported coins. */
export async function loadMids(): Promise<Record<Coin, number>> {
  const mids = await info.allMids();
  const out = {} as Record<Coin, number>;
  for (const coin of COINS) {
    const px = Number(mids[coin]);
    if (!Number.isFinite(px)) throw new Error(`No live price for ${coin}.`);
    out[coin] = px;
  }
  return out;
}

export type AccountSnapshot = {
  /** Total account equity (USDC). */
  accountValue: number;
  /** Withdrawable balance (USDC). */
  withdrawable: number;
};

export async function loadAccount(user: `0x${string}`): Promise<AccountSnapshot> {
  const st = await info.clearinghouseState({ user });
  return {
    accountValue: Number(st.marginSummary.accountValue),
    withdrawable: Number(st.withdrawable),
  };
}

/** Current approved builder fee for this user (tenths of bps), 0 if none. */
export async function loadBuilderApproval(user: `0x${string}`): Promise<number> {
  if (!BUILDER_ENABLED) return 0;
  try {
    const fee = await info.maxBuilderFee({
      user,
      builder: BUILDER_ADDRESS as `0x${string}`,
    });
    return Number(fee) || 0;
  } catch {
    return 0;
  }
}

// ----------------------------------------------------------------------
// Hyperliquid number formatting
// ----------------------------------------------------------------------
// Perp prices: at most 5 significant figures AND at most (6 - szDecimals)
// decimal places (integers are always allowed). Sizes: rounded to
// szDecimals. Both are sent as plain decimal strings.

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatPx(px: number, szDecimals: number): string {
  if (!Number.isFinite(px) || px <= 0) throw new Error("Invalid price.");
  const maxDecimals = Math.max(0, 6 - szDecimals);
  // 5 significant figures first…
  let p = Number(px.toPrecision(5));
  // …then cap decimals.
  const fixed = p.toFixed(maxDecimals);
  return trimZeros(fixed);
}

/** Round a size DOWN to szDecimals so the realized risk never exceeds the plan. */
export function formatSz(sz: number, szDecimals: number): string {
  if (!Number.isFinite(sz) || sz <= 0) throw new Error("Invalid size.");
  const factor = 10 ** szDecimals;
  const floored = Math.floor(sz * factor + 1e-9) / factor;
  return trimZeros(floored.toFixed(szDecimals));
}

// ----------------------------------------------------------------------
// Risk math
// ----------------------------------------------------------------------

export type TicketInput = {
  coin: Coin;
  side: "long" | "short";
  /** USDC the user accepts to lose if the stop is hit. */
  riskUsd: number;
  /** Stop distance from entry, in percent (e.g. 2 = 2%). */
  stopPct: number;
  /** Take-profit as a multiple of risk (e.g. 2 = 2R). 0 disables the TP. */
  rMultiple: number;
};

export type TicketPlan = {
  coin: Coin;
  side: "long" | "short";
  entryPx: number;
  stopPx: number;
  tpPx: number | null;
  /** Position size in base asset, already rounded for the exchange. */
  size: number;
  sizeStr: string;
  notionalUsd: number;
  /** Risk actually taken after size rounding. */
  effectiveRiskUsd: number;
  rewardUsd: number | null;
  /** Notional / account equity. */
  impliedLeverage: number | null;
  builderFeeUsd: number;
  warnings: string[];
};

export const MIN_NOTIONAL_USD = 10;

export function buildPlan(
  input: TicketInput,
  mid: number,
  meta: AssetMeta,
  account: AccountSnapshot | null,
): TicketPlan {
  const { coin, side, riskUsd, stopPct, rMultiple } = input;
  if (!(riskUsd > 0)) throw new Error("Enter the amount you are willing to risk.");
  if (!(stopPct > 0)) throw new Error("Enter a stop distance greater than 0%.");
  if (stopPct >= 80) throw new Error("Stop distance must be below 80%.");

  const dir = side === "long" ? 1 : -1;
  const entryPx = mid;
  const stopPxRaw = entryPx * (1 - dir * (stopPct / 100));
  const stopPx = Number(formatPx(stopPxRaw, meta.szDecimals));

  // Size from risk: risk = size × |entry − stop|
  const stopDistAbs = Math.abs(entryPx - stopPx);
  if (stopDistAbs <= 0) throw new Error("Stop is too close to the current price.");
  const sizeRaw = riskUsd / stopDistAbs;
  const sizeStr = formatSz(sizeRaw, meta.szDecimals);
  const size = Number(sizeStr);
  if (!(size > 0)) {
    throw new Error(
      "Risk too small for this asset: the position size rounds down to zero. Increase the risk or widen the stop.",
    );
  }

  const notionalUsd = size * entryPx;
  const effectiveRiskUsd = size * stopDistAbs;

  let tpPx: number | null = null;
  let rewardUsd: number | null = null;
  if (rMultiple > 0) {
    const tpRaw = entryPx + dir * stopDistAbs * rMultiple;
    if (tpRaw <= 0) throw new Error("Take-profit price would be negative; lower the R multiple.");
    tpPx = Number(formatPx(tpRaw, meta.szDecimals));
    rewardUsd = size * Math.abs(tpPx - entryPx);
  }

  const impliedLeverage =
    account && account.accountValue > 0 ? notionalUsd / account.accountValue : null;

  const builderFeeUsd = BUILDER_ENABLED
    ? (notionalUsd * BUILDER_FEE_TENTH_BPS) / 100000
    : 0;

  const warnings: string[] = [];
  if (notionalUsd < MIN_NOTIONAL_USD) {
    warnings.push(
      `Position value is $${notionalUsd.toFixed(2)} — Hyperliquid requires at least $${MIN_NOTIONAL_USD} per order. Increase the risk or tighten the stop.`,
    );
  }
  if (impliedLeverage !== null && impliedLeverage > meta.maxLeverage) {
    warnings.push(
      `This plan implies ${impliedLeverage.toFixed(1)}x leverage; ${coin} allows at most ${meta.maxLeverage}x. Reduce the risk or widen the stop.`,
    );
  } else if (impliedLeverage !== null && impliedLeverage > meta.maxLeverage * 0.5) {
    warnings.push(
      `High implied leverage (${impliedLeverage.toFixed(1)}x). A small adverse move could liquidate the position before the stop triggers.`,
    );
  }

  return {
    coin,
    side,
    entryPx,
    stopPx,
    tpPx,
    size,
    sizeStr,
    notionalUsd,
    effectiveRiskUsd,
    rewardUsd,
    impliedLeverage,
    builderFeeUsd,
    warnings,
  };
}

// ----------------------------------------------------------------------
// Placing the trade
// ----------------------------------------------------------------------

/** Entry slippage tolerance for the market entry (2%). */
const ENTRY_SLIPPAGE = 0.02;

export type PlacedLeg = {
  label: "Entry" | "Stop loss" | "Take profit";
  status: "filled" | "resting" | "error";
  detail: string;
};

export type PlaceResult = {
  legs: PlacedLeg[];
  ok: boolean;
};

type OrderWire = {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t:
    | { limit: { tif: "Gtc" | "Ioc" | "Alo" | "FrontendMarket" } }
    | { trigger: { isMarket: boolean; triggerPx: string; tpsl: "tp" | "sl" } };
};

/**
 * Places entry + stop (+ optional TP) in ONE signed action using
 * `grouping: "normalTpsl"` — a single wallet signature per trade.
 */
export async function placeRiskTrade(
  wallet: BrowserWallet,
  plan: TicketPlan,
  meta: AssetMeta,
): Promise<PlaceResult> {
  const exchange = exchangeFor(wallet);
  const isBuy = plan.side === "long";
  const dir = isBuy ? 1 : -1;

  // Market entry = aggressive limit, FrontendMarket time-in-force.
  const entryLimitPx = formatPx(plan.entryPx * (1 + dir * ENTRY_SLIPPAGE), meta.szDecimals);
  const stopPxStr = formatPx(plan.stopPx, meta.szDecimals);

  const orders: OrderWire[] = [
    {
      a: meta.assetId,
      b: isBuy,
      p: entryLimitPx,
      s: plan.sizeStr,
      r: false,
      t: { limit: { tif: "FrontendMarket" } },
    },
    {
      a: meta.assetId,
      b: !isBuy, // closes the position
      p: stopPxStr,
      s: plan.sizeStr,
      r: true,
      t: { trigger: { isMarket: true, triggerPx: stopPxStr, tpsl: "sl" } },
    },
  ];

  const labels: PlacedLeg["label"][] = ["Entry", "Stop loss"];

  if (plan.tpPx !== null) {
    const tpPxStr = formatPx(plan.tpPx, meta.szDecimals);
    orders.push({
      a: meta.assetId,
      b: !isBuy,
      p: tpPxStr,
      s: plan.sizeStr,
      r: true,
      t: { trigger: { isMarket: true, triggerPx: tpPxStr, tpsl: "tp" } },
    });
    labels.push("Take profit");
  }

  const result = await exchange.order({
    orders,
    grouping: "normalTpsl",
    ...(BUILDER_ENABLED
      ? { builder: { b: BUILDER_ADDRESS as `0x${string}`, f: BUILDER_FEE_TENTH_BPS } }
      : {}),
  });

  const statuses = result.response.data.statuses;
  const legs: PlacedLeg[] = statuses.map((st, i) => {
    const label = labels[i] ?? "Entry";
    if (typeof st === "object" && st !== null && "filled" in st) {
      const f = st.filled as { avgPx: string; totalSz: string };
      return { label, status: "filled", detail: `Filled ${f.totalSz} @ ${f.avgPx}` };
    }
    if (typeof st === "object" && st !== null && "resting" in st) {
      return { label, status: "resting", detail: "Armed and waiting on-chain" };
    }
    if (typeof st === "object" && st !== null && "error" in st) {
      return { label, status: "error", detail: String((st as { error: string }).error) };
    }
    return { label, status: "resting", detail: "Submitted" };
  });

  return { legs, ok: legs.every((l) => l.status !== "error") };
}

/** One-time builder fee approval, signed by the user's main wallet. */
export async function approveBuilder(wallet: BrowserWallet): Promise<void> {
  if (!BUILDER_ENABLED) return;
  const exchange = exchangeFor(wallet);
  await exchange.approveBuilderFee({
    builder: BUILDER_ADDRESS as `0x${string}`,
    maxFeeRate: BUILDER_MAX_FEE_RATE as `${string}%`,
  });
}

// ----------------------------------------------------------------------
// Small display helpers
// ----------------------------------------------------------------------

export function usd(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Wallet rejections come back with code 4001 / "User rejected".
    if (/user rejected|user denied|4001/i.test(err.message)) {
      return "Signature cancelled in the wallet. Nothing was sent.";
    }
    return err.message;
  }
  return String(err);
}

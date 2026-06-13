import { getHyperliquidConfig, isValidAddress } from "./config";

export type BuilderConfigStatus =
  | "disabled"
  | "invalid_config"
  | "wallet_required"
  | "approval_required"
  | "approved";

export type BuilderConfigResult = {
  enabled: boolean;
  valid: boolean;
  status: BuilderConfigStatus;
  builderAddress: string;
  feeTenthsBps: number;
  feeBps: number;
  error: string | null;
};

const MAX_PERP_BUILDER_FEE_TENTHS_BPS = 100;

export function getBuilderConfig(walletConnected = false, approvedFeeTenthsBps = 0): BuilderConfigResult {
  const config = getHyperliquidConfig();
  const feeTenthsBps = Math.min(Math.max(config.builderFeeTenthsBps || 10, 0), MAX_PERP_BUILDER_FEE_TENTHS_BPS);

  if (!config.enableBuilderCode) {
    return {
      enabled: false,
      valid: true,
      status: "disabled",
      builderAddress: config.builderAddress,
      feeTenthsBps,
      feeBps: feeTenthsBps / 10,
      error: null,
    };
  }

  if (!isValidAddress(config.builderAddress)) {
    return {
      enabled: true,
      valid: false,
      status: "invalid_config",
      builderAddress: config.builderAddress,
      feeTenthsBps,
      feeBps: feeTenthsBps / 10,
      error: "Builder config missing - execution disabled.",
    };
  }

  if (!walletConnected) {
    return {
      enabled: true,
      valid: true,
      status: "wallet_required",
      builderAddress: config.builderAddress,
      feeTenthsBps,
      feeBps: feeTenthsBps / 10,
      error: null,
    };
  }

  if (approvedFeeTenthsBps < feeTenthsBps) {
    return {
      enabled: true,
      valid: true,
      status: "approval_required",
      builderAddress: config.builderAddress,
      feeTenthsBps,
      feeBps: feeTenthsBps / 10,
      error: null,
    };
  }

  return {
    enabled: true,
    valid: true,
    status: "approved",
    builderAddress: config.builderAddress,
    feeTenthsBps,
    feeBps: feeTenthsBps / 10,
    error: null,
  };
}

export function validateBuilderConfig() {
  const config = getBuilderConfig();
  return config.valid ? null : config.error;
}

export function buildBuilderParam(userMaxApprovalTenthsBps: number) {
  const config = getBuilderConfig(true, userMaxApprovalTenthsBps);
  if (!config.enabled || !config.valid || config.status !== "approved") return null;
  return { b: config.builderAddress, f: config.feeTenthsBps };
}

export async function getMaxBuilderFee() {
  return 0;
}

export async function approveBuilderFee() {
  throw new Error("Builder fee approval must be signed by the user's main wallet. Wallet execution is not connected yet.");
}

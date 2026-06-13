export type HyperliquidExecutionConfig = {
  enableBuilderCode: boolean;
  enableRealExecution: boolean;
  builderAddress: string;
  builderFeeTenthsBps: number;
  apiUrl: string;
};

export function getHyperliquidConfig(): HyperliquidExecutionConfig {
  const rawFee = Number(process.env.NEXT_PUBLIC_BUILDER_FEE_TENTHS_BPS || "10");
  return {
    enableBuilderCode: process.env.NEXT_PUBLIC_ENABLE_BUILDER_CODE === "true",
    enableRealExecution: process.env.NEXT_PUBLIC_ENABLE_REAL_EXECUTION === "true",
    builderAddress: process.env.NEXT_PUBLIC_BUILDER_ADDRESS || "",
    builderFeeTenthsBps: Number.isFinite(rawFee) ? rawFee : 10,
    apiUrl: process.env.NEXT_PUBLIC_HYPERLIQUID_API_URL || "https://api.hyperliquid.xyz",
  };
}

export function isValidAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

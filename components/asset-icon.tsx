"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const iconPalette: Record<string, string> = {
  BTC: "bg-bitcoin text-black",
  ETH: "bg-[#627EEA] text-white",
  SOL: "bg-[#15F5BA] text-black",
  HYPE: "bg-cyan text-black",
  TAO: "bg-[#B48CFF] text-black",
  LINK: "bg-[#2A5ADA] text-white",
  BNB: "bg-[#F3BA2F] text-black",
  XRP: "bg-[#D7DEE8] text-black",
  GOLD: "bg-[#D7B45B] text-black",
  "^GSPC": "bg-[#6FA8FF] text-black",
  NVDA: "bg-[#76B900] text-black",
  USD: "bg-[#A7B0C0] text-black",
  SPX: "bg-[#6FA8FF] text-black"
};

const iconOverride: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  TRX: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  HYPE: "https://assets.coingecko.com/coins/images/50882/small/hyperliquid.jpg",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  TAO: "https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  TON: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  SHIB: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  BCH: "https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  NEAR: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  APT: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  ICP: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg"
};

function iconFromTicker(ticker: string) {
  const normalized = ticker.replace("$", "").replace("^", "").toUpperCase();
  return iconOverride[normalized] ?? `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${normalized.toLowerCase()}.svg`;
}

export function AssetIcon({ ticker, imageUrl, className }: { ticker: string; imageUrl?: string; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const candidateImage = imageUrl || iconFromTicker(ticker);

  if (candidateImage && !imageFailed) {
    return (
      <img
        src={candidateImage}
        alt={ticker}
        onError={() => setImageFailed(true)}
        className={cn("h-9 w-9 shrink-0 rounded-full bg-panelSoft object-cover ring-2 ring-ink", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-ink",
        iconPalette[ticker] ?? "bg-panelSoft text-white",
        className
      )}
    >
      {ticker.replace("^", "").slice(0, 4)}
    </span>
  );
}

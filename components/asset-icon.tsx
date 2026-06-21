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

export function AssetIcon({ ticker, imageUrl, className }: { ticker: string; imageUrl?: string; className?: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={ticker}
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

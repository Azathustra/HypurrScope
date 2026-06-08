export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const VALID_COINS = new Set(["HYPE", "BTC", "ETH"]);

type NormalizedTrade = {
  id: string;
  side: "Buy" | "Sell";
  price: string;
  size: string;
  notionalLabel: string;
  timeLabel: string;
  rawNotional: number;
};

function n(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "Insufficient data";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function normalizeTrade(row: any, index: number): NormalizedTrade {
  const price = n(row.px ?? row.price);
  const size = n(row.sz ?? row.size);
  const notional = price * size;
  const side: "Buy" | "Sell" = row.side === "B" || row.side === "Buy" ? "Buy" : "Sell";
  const time = n(row.time ?? row.t);
  return {
    id: String(row.hash ?? row.tid ?? row.id ?? `${time}-${index}`),
    side,
    price: price > 0 ? `$${price.toLocaleString("en-US", { maximumFractionDigits: price >= 100 ? 2 : 4 })}` : "Insufficient data",
    size: size > 0 ? size.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "Insufficient data",
    notionalLabel: notional > 0 ? formatUsd(notional) : "Insufficient data",
    timeLabel: time > 0 ? new Date(time).toLocaleTimeString("en-US", { hour12: false }) : "recent",
    rawNotional: notional,
  };
}

function buildTwapLikeCluster(trades: NormalizedTrade[], side: "Buy" | "Sell") {
  const sideTrades = trades.filter((trade) => trade.side === side && trade.rawNotional > 0);
  const rawNotional = sideTrades.reduce((sum, trade) => sum + trade.rawNotional, 0);
  if (rawNotional <= 0 || sideTrades.length < 3) return null;
  const avgPrice =
    sideTrades.reduce((sum, trade) => {
      const price = Number(trade.price.replace(/[$,]/g, ""));
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0) / sideTrades.length;
  return {
    side,
    notional: formatUsd(rawNotional),
    rawNotional,
    size: `${sideTrades.length} prints`,
    slices: sideTrades.length,
    avgPrice: avgPrice > 0 ? `$${avgPrice.toLocaleString("en-US", { maximumFractionDigits: avgPrice >= 100 ? 2 : 4 })}` : "Insufficient data",
    lastTrade: sideTrades[0]?.timeLabel || "recent",
    confidence: "TWAP-like activity",
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawCoin = (url.searchParams.get("coin") || "HYPE").toUpperCase();
    const coin = VALID_COINS.has(rawCoin) ? rawCoin : "HYPE";
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "recentTrades", coin }),
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json({ ok: false, trades: [], twaps: [], summary: null }, { status: response.status, headers: { "cache-control": "no-store" } });
    }

    const payload = await response.json();
    const trades = (Array.isArray(payload) ? payload : [])
      .map(normalizeTrade)
      .filter((trade) => trade.rawNotional > 0)
      .sort((a, b) => b.rawNotional - a.rawNotional)
      .slice(0, 30);
    const clusters = [buildTwapLikeCluster(trades, "Buy"), buildTwapLikeCluster(trades, "Sell")].filter(Boolean);
    const buy10m = trades.filter((trade) => trade.side === "Buy").reduce((sum, trade) => sum + trade.rawNotional, 0);
    const sell10m = trades.filter((trade) => trade.side === "Sell").reduce((sum, trade) => sum + trade.rawNotional, 0);

    return Response.json(
      {
        ok: true,
        source: "hyperliquid-recentTrades",
        trades,
        twaps: clusters,
        summary: {
          buy10m: formatUsd(buy10m),
          sell10m: formatUsd(sell10m),
          netLabel: formatUsd(buy10m - sell10m),
          netSide: buy10m >= sell10m ? "Buy" : "Sell",
          updatedAt: new Date().toISOString(),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false, trades: [], twaps: [], summary: null }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}

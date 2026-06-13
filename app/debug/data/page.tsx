import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_MAPPING = [
  ["raw Hyperliquid field", "normalized field", "frontend prop", "displayed label"],
  ["metaAndAssetCtxs ctx.markPx", "markPx / price", "state.market.price", "Price"],
  ["metaAndAssetCtxs ctx.funding", "fundingRaw -> fundingPctHourly", "state.market.fundingPct", "Hourly funding"],
  ["metaAndAssetCtxs ctx.openInterest", "openInterestRaw -> openInterestUsdComputed", "state.market.oiUsd", "Open interest"],
  ["metaAndAssetCtxs ctx.dayNtlVlm", "dayNtlVlm", "state.market.volume24hUsd", "24h volume"],
  ["candleSnapshot candle.c close", "priceChange15mPct", "metrics.price15m", "15m"],
  ["candleSnapshot candle.c close", "priceChange1hPct", "metrics.price1h", "1h"],
  ["l2Book levels", "spreadBps", "metrics.spreadBps", "Spread"],
  ["l2Book levels", "depth10bpsUsd", "metrics.depth10Bps", "Depth +/-10 bps"],
  ["market_snapshots open_interest_usd_computed", "oiChange15mPct", "metrics.oi15m", "OI 15m"],
  ["market_snapshots open_interest_usd_computed", "oiChange1hPct", "metrics.oi1h", "OI 1h"],
  ["market_snapshots open_interest_usd_computed", "oiChange4hPct", "metrics.oi4h", "OI 4h"],
];

async function loadMarkets() {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "https";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
  const serverNow = new Date().toISOString();

  try {
    const response = await fetch(`${baseUrl}/api/hl/markets`, { cache: "no-store" });
    const text = await response.text();
    try {
      const payload = JSON.parse(text);
      const dataUpdatedAt = payload?.updatedAt || payload?.assets?.[0]?.updatedAt || null;
      const dataAgeSeconds = dataUpdatedAt ? Math.max(0, Math.round((Date.parse(serverNow) - Date.parse(dataUpdatedAt)) / 1000)) : null;
      const freshness = dataAgeSeconds === null ? "error" : dataAgeSeconds < 30 ? "ready" : "stale";
      return {
        serverNow,
        dataUpdatedAt,
        dataAgeSeconds,
        freshness,
        json: JSON.stringify({
          serverNow,
          dataUpdatedAt,
          dataAgeSeconds,
          freshness,
          payload,
        }, null, 2),
      };
    } catch {
      return {
        serverNow,
        dataUpdatedAt: null,
        dataAgeSeconds: null,
        freshness: "error",
        json: text,
      };
    }
  } catch (error) {
    const payload = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        source: "/api/hl/markets",
      serverNow,
      dataUpdatedAt: null,
      dataAgeSeconds: null,
      freshness: "error",
    };
    return {
      serverNow,
      dataUpdatedAt: null,
      dataAgeSeconds: null,
      freshness: "error",
      json: JSON.stringify(payload, null, 2),
    };
  }
}

export default async function DebugDataPage() {
  const debug = await loadMarkets();

  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 24, background: "#050807", color: "#d7fbe9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>HypurrScope /api/hl/markets debug</h1>
      <section style={{ border: "1px solid #244338", padding: 16, marginBottom: 18 }}>
        <p><strong>serverNow:</strong> {debug.serverNow}</p>
        <p><strong>dataUpdatedAt:</strong> {debug.dataUpdatedAt || "missing"}</p>
        <p><strong>dataAgeSeconds:</strong> {debug.dataAgeSeconds === null ? "unknown" : debug.dataAgeSeconds}</p>
        <p><strong>freshness:</strong> {debug.freshness}</p>
      </section>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Data mapping audit</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 12 }}>
        <tbody>
          {DATA_MAPPING.map((row, index) => (
            <tr key={row.join("-")} style={{ background: index === 0 ? "#10221a" : "transparent" }}>
              {row.map((cell) => (
                <td key={cell} style={{ border: "1px solid #244338", padding: 8, verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Raw /api/hl/markets JSON</h2>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.5 }}>{debug.json}</pre>
    </main>
  );
}

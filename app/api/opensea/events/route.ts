import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

function headers(): HeadersInit {
  const apiKey = process.env.OPENSEA_API_KEY;
  const h: HeadersInit = { accept: "application/json" };
  if (apiKey) h["X-API-KEY"] = apiKey;
  return h;
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDisplayPrice(event: any) {
  if (typeof event.priceLabel === "string" && event.priceLabel.trim()) return event.priceLabel;
  if (typeof event.price === "string" && event.price.trim()) return event.price;

  const payment = event.payment || event.payment_token || event.price?.currency || {};
  const rawQuantity = event.payment?.quantity ?? event.closing_price ?? event.price?.quantity ?? event.quantity;
  const decimals = num(payment.decimals ?? event.price?.currency?.decimals ?? 18) || 18;
  const symbol = payment.symbol || event.price?.currency?.symbol || "WHYPE";
  const raw = num(rawQuantity);
  if (raw <= 0) return `-- ${symbol}`;
  const value = raw > 1_000_000_000 ? raw / 10 ** decimals : raw;
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K ${symbol}`;
  if (value >= 100) return `${value.toFixed(0)} ${symbol}`;
  if (value >= 1) return `${value.toFixed(2)} ${symbol}`;
  return `${value.toPrecision(3)} ${symbol}`;
}

function timeLabel(timestamp: unknown) {
  const date = timestamp ? new Date(String(timestamp)) : null;
  const t = date?.getTime();
  if (!t || !Number.isFinite(t)) return "recent";
  const delta = Math.max(0, Date.now() - t);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeSale(event: any, index: number) {
  const nft = event.nft || event.asset || event.item || {};
  const tokenId = firstString(nft.identifier, nft.token_id, event.token_id, event.tokenId, event.nft_id, String(index + 1));
  const name = firstString(nft.name, event.name, `Hypurr #${tokenId}`);
  const image = firstString(
    nft.image_url,
    nft.image,
    nft.display_image_url,
    nft.metadata?.image,
    event.image_url,
    event.image,
    event.display_image_url,
  );
  const contract = firstString(nft.contract, nft.contract_address, nft.asset_contract?.address, event.contract_address);
  const chain = firstString(nft.chain, event.chain, "hyperliquid");
  const permalink = firstString(nft.opensea_url, nft.permalink, event.permalink, event.url);

  return {
    id: tokenId || `${index + 1}`,
    name,
    price: toDisplayPrice(event),
    time: timeLabel(event.event_timestamp || event.created_date || event.timestamp || event.transaction?.timestamp),
    image,
    url: permalink || (contract && tokenId ? `https://opensea.io/assets/${chain}/${contract}/${tokenId}` : COLLECTION_URL),
    contract,
    chain,
  };
}

export async function GET() {
  try {
    const url = `${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=12`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers(),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, source: "opensea", error: `OpenSea events failed: ${response.status}`, detail: text.slice(0, 240), sales: [] },
        { status: 200, headers: { "Cache-Control": "s-maxage=45, stale-while-revalidate=90" } },
      );
    }

    const payload = await response.json();
    const events = Array.isArray(payload?.asset_events)
      ? payload.asset_events
      : Array.isArray(payload?.events)
        ? payload.events
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

    const sales = events
      .filter((event: any) => {
        const type = String(event.event_type || event.eventType || event.type || "sale").toLowerCase();
        return type.includes("sale") || type === "successful" || event.payment || event.price;
      })
      .map(normalizeSale)
      .filter((sale: any) => sale.id || sale.name)
      .slice(0, 12);

    return NextResponse.json(
      { ok: true, source: "opensea", updatedAt: new Date().toISOString(), sales },
      { headers: { "Cache-Control": "s-maxage=45, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, source: "opensea", error: "OpenSea events proxy failed", sales: [] },
      { status: 200, headers: { "Cache-Control": "s-maxage=45, stale-while-revalidate=120" } },
    );
  }
}

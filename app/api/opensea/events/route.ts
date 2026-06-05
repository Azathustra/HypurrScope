import { NextResponse } from "next/server";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";
const HYPURR_CHAIN = "hyperevm";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";

function getHeaders() {
  const apiKey = process.env.OPENSEA_API_KEY;
  const headers: HeadersInit = { accept: "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;
  return headers;
}

function normalizeImage(url: string | undefined | null) {
  if (!url) return "";
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.replace("ipfs://", "")}`;
  return url;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNative(value: number, symbol = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return `-- ${symbol}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${symbol}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${symbol}`;
  if (value >= 100) return `${value.toFixed(0)} ${symbol}`;
  if (value >= 1) return `${value.toFixed(2)} ${symbol}`;
  return `${value.toPrecision(3)} ${symbol}`;
}

function formatRelativeTime(timestamp: string | number | undefined) {
  if (!timestamp) return "--";
  const date = typeof timestamp === "number" ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000) : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff)) return "--";
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEvents(payload: any) {
  const events = payload?.asset_events || payload?.events || [];
  return Array.isArray(events) ? events : [];
}

function getNft(event: any) {
  return event?.nft || event?.asset || event?.item || {};
}

function getIdentifier(event: any) {
  const nft = getNft(event);
  const nftId = String(nft.identifier || nft.token_id || nft.tokenId || event?.token_id || event?.tokenId || event?.nft_id || "");
  const match = nftId.match(/(\d+)$/);
  return match ? match[1] : nftId;
}

function getEventImage(event: any) {
  const nft = getNft(event);
  return normalizeImage(
    nft.display_image_url ||
    nft.image_url ||
    nft.imageUrl ||
    nft.image ||
    event?.image_url ||
    event?.asset?.image_url ||
    event?.asset?.image_original_url ||
    event?.asset?.imageUrl ||
    ""
  );
}

function getPrice(event: any) {
  const payment = event.payment || event.payment_token || event.price?.currency || {};
  const symbol = payment.symbol || event.price?.currency?.symbol || "HYPE";
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? 18);
  const raw = event.payment?.quantity ?? event.closing_price ?? event.price?.quantity ?? event.quantity ?? event.sale_price;
  const value = toNumber(raw);
  if (!value) return `-- ${symbol}`;
  const normalized = value > 1_000_000_000 ? value / 10 ** decimals : value;
  return formatNative(normalized, symbol);
}

async function fetchJson(url: string, headers: HeadersInit) {
  const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.json();
}

async function fetchNftImage(identifier: string, headers: HeadersInit) {
  if (!identifier) return "";
  const urls = [
    `${OPENSEA_BASE_URL}/chain/${HYPURR_CHAIN}/contract/${HYPURR_CONTRACT}/nfts/${identifier}`,
    `${OPENSEA_BASE_URL}/chain/hyperevm/contract/${HYPURR_CONTRACT.toLowerCase()}/nfts/${identifier}`,
  ];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url, headers);
      const nft = payload?.nft || payload;
      const image = normalizeImage(nft?.display_image_url || nft?.image_url || nft?.imageUrl || nft?.image || "");
      if (image) return image;
    } catch (error) {
      // try next form
    }
  }
  return "";
}

async function fetchCollectionImageMap(headers: HeadersInit) {
  const map = new Map<string, string>();
  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/collection/${OPENSEA_COLLECTION_SLUG}/nfts?limit=200`, headers);
    const nfts = Array.isArray(payload?.nfts) ? payload.nfts : [];
    for (const nft of nfts) {
      const id = String(nft.identifier || nft.token_id || nft.tokenId || "");
      const image = normalizeImage(nft.display_image_url || nft.image_url || nft.imageUrl || nft.image || "");
      if (id && image) map.set(id, image);
    }
  } catch (error) {
    // optional improvement only
  }
  return map;
}

function buildOpenSeaUrl(identifier: string) {
  return identifier ? `https://opensea.io/assets/${HYPURR_CHAIN}/${HYPURR_CONTRACT}/${identifier}` : OPENSEA_COLLECTION_URL;
}

export async function GET() {
  const headers = getHeaders();
  try {
    const [eventsPayload, imageMap] = await Promise.all([
      fetchJson(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=30`, headers),
      fetchCollectionImageMap(headers),
    ]);

    const events = getEvents(eventsPayload).slice(0, 18);
    const sales = await Promise.all(events.map(async (event: any) => {
      const nft = getNft(event);
      const identifier = getIdentifier(event);
      const imageFromEvent = getEventImage(event);
      const imageFromMap = identifier ? imageMap.get(identifier) || "" : "";
      const image = imageFromEvent || imageFromMap || await fetchNftImage(identifier, headers);
      const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp;
      return {
        id: identifier || "?",
        name: nft.name || (identifier ? `Hypurr #${identifier}` : "Hypurr"),
        price: getPrice(event),
        time: formatRelativeTime(timestamp),
        timestamp,
        image,
        url: nft.permalink || buildOpenSeaUrl(identifier),
        buyer: event.buyer || event.to_account?.address || event.taker?.address || "",
        seller: event.seller || event.from_account?.address || event.maker?.address || "",
      };
    }));

    return NextResponse.json({ sales, events: sales, source: "opensea-rest-enriched", generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ sales: [], events: [], error: "OpenSea enriched events route failed" }, { status: 500 });
  }
}

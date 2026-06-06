import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const HYPURR_CHAIN = "hyperevm";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";

const CACHE_MS = 90 * 1000;

type SaleRow = {
  id: string;
  name: string;
  price: string;
  time: string;
  timestamp?: string | number;
  image: string;
  url: string;
  paymentSymbol: string;
};

type Payload = {
  sales: SaleRow[];
  events: SaleRow[];
  source: string;
  imageCount: number;
  message: string;
  generatedAt: string;
  errors?: string[];
};

let memoryCache: { expiresAt: number; payload: Payload } | null = null;

function normalizeImage(url: unknown) {
  if (!url) return "";
  const raw = String(url).trim();
  if (!raw) return "";
  if (raw.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${raw.replace("ipfs://", "").replace(/^ipfs\//, "")}`;
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw.replace(/\\u0026/g, "&").replace(/\\u002F/g, "/");
}

function num(value: unknown) {
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNative(value: number, symbol = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return `-- ${symbol}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${symbol}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${symbol}`;
  if (value >= 100) return `${value.toFixed(0)} ${symbol}`;
  if (value >= 1) return `${value.toFixed(2)} ${symbol}`;
  return `${value.toPrecision(3)} ${symbol}`;
}

function relativeTime(ts: string | number | undefined) {
  if (!ts) return "recent";
  const date = typeof ts === "number" ? new Date(ts > 10_000_000_000 ? ts : ts * 1000) : new Date(ts);
  const t = date.getTime();
  if (!Number.isFinite(t)) return "recent";
  const minutes = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEvents(payload: any) {
  const events = payload?.asset_events || payload?.events || payload?.results || [];
  return Array.isArray(events) ? events : [];
}

function getNft(event: any) {
  return event?.nft || event?.asset || event?.item || event?.asset_bundle?.assets?.[0] || {};
}

function getTokenId(event: any) {
  const nft = getNft(event);
  const raw = String(nft.identifier || nft.token_id || nft.tokenId || nft.id || event?.token_id || event?.tokenId || event?.nft_id || "");
  const contractPath = raw.match(/(?:^|\/)0x[a-fA-F0-9]{40}\/(\d+)$/);
  if (contractPath) return contractPath[1];
  const lastNumber = raw.match(/(\d+)$/);
  return lastNumber ? lastNumber[1] : raw;
}

function getImage(event: any) {
  const nft = getNft(event);
  return normalizeImage(
    nft.image_original_url ||
    nft.image_url ||
    nft.imageUrl ||
    nft.image ||
    nft.display_image_url ||
    event?.image_url ||
    event?.display_image_url ||
    event?.asset?.image_url ||
    event?.asset?.display_image_url ||
    "",
  );
}

function getPrice(event: any) {
  const payment = event.payment || event.payment_token || event.price?.currency || event?.asset_payment || {};
  const symbol = payment.symbol || event.price?.currency?.symbol || event?.payment_token?.symbol || "HYPE";
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? event?.payment_token?.decimals ?? 18);
  const raw = event.payment?.quantity ?? event.closing_price ?? event.total_price ?? event.price?.quantity ?? event.quantity ?? event.sale_price;
  const value = num(raw);
  if (!value) return { label: `-- ${symbol}`, symbol };
  const normalized = value > 1_000_000_000 ? value / 10 ** decimals : value;
  return { label: formatNative(normalized, symbol), symbol };
}

function itemUrl(id: string) {
  return id ? `https://opensea.io/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT.toLowerCase()}/${id}` : OPENSEA_COLLECTION_URL;
}

function buildSale(event: any, index: number): SaleRow | null {
  const nft = getNft(event);
  const id = getTokenId(event) || String(index + 1);
  if (!id) return null;
  const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp || event.closing_date;
  const price = getPrice(event);
  return {
    id,
    name: nft.name || `Hypurr #${id}`,
    price: price.label,
    paymentSymbol: price.symbol,
    time: relativeTime(timestamp),
    timestamp,
    image: getImage(event),
    url: nft.permalink || itemUrl(id),
  };
}

function json(payload: Payload) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=90, stale-while-revalidate=240" },
  });
}

export async function GET() {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return json({ ...memoryCache.payload, source: `${memoryCache.payload.source}-cache` });
  }

  const errors: string[] = [];
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "HypurrScope/1.0 (+https://hypurrscope.xyz)",
  };
  const key = process.env.OPENSEA_API_KEY?.trim();
  if (key) headers["X-API-KEY"] = key;

  try {
    const response = await fetch(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=12`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`OpenSea events failed ${response.status}`);
    const payload = await response.json();
    const sales = getEvents(payload).map(buildSale).filter(Boolean) as SaleRow[];
    const imageCount = sales.filter((sale) => Boolean(sale.image)).length;
    const result: Payload = {
      sales,
      events: sales,
      source: key ? "opensea-events-api-key" : "opensea-events-public",
      imageCount,
      message: `${sales.length} OpenSea sale events loaded; ${imageCount} with media.`,
      generatedAt: new Date().toISOString(),
      errors,
    };
    memoryCache = { expiresAt: Date.now() + CACHE_MS, payload: result };
    return json(result);
  } catch (error: any) {
    errors.push(error?.message || "OpenSea request failed");
    const empty: Payload = { sales: [], events: [], source: "empty", imageCount: 0, message: "OpenSea did not return usable sale data.", generatedAt: new Date().toISOString(), errors };
    memoryCache = { expiresAt: Date.now() + 30_000, payload: empty };
    return json(empty);
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";
const HYPURR_CONTRACT_LOWER = HYPURR_CONTRACT.toLowerCase();
const HYPURR_CHAIN = "hyperevm";
const CACHE_MS = 120_000;

type SaleRow = {
  id: string;
  name: string;
  price: string;
  time: string;
  timestamp?: string | number;
  image: string;
  url: string;
  buyer?: string;
  seller?: string;
  imageStatus: "raw" | "display" | "event" | "missing";
};

type ResponsePayload = {
  sales: SaleRow[];
  events: SaleRow[];
  source: string;
  apiKeyConfigured: boolean;
  imageCount: number;
  message: string;
  generatedAt: string;
  errors?: string[];
};

let memoryCache: { expiresAt: number; payload: ResponsePayload } | null = null;

function json(payload: ResponsePayload) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
    },
  });
}

function getHeaders() {
  const apiKey = process.env.OPENSEA_API_KEY;
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "HypurrScope/1.0 (+https://hypurrscope.xyz)",
  };
  if (apiKey) headers["X-API-KEY"] = apiKey;
  return headers;
}

function normalizeImage(url: string | undefined | null) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("ipfs://")) {
    const path = trimmed.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function toNumber(value: unknown) {
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }
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
  if (!timestamp) return "recent";
  const date = typeof timestamp === "number" ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000) : new Date(timestamp);
  const time = date.getTime();
  if (!Number.isFinite(time)) return "recent";
  const diff = Date.now() - time;
  const minutes = Math.max(0, Math.floor(diff / 60_000));
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

function getIdentifier(event: any) {
  const nft = getNft(event);
  const raw = String(
    nft.identifier ||
      nft.token_id ||
      nft.tokenId ||
      nft.id ||
      event?.token_id ||
      event?.tokenId ||
      event?.nft_id ||
      ""
  );
  const contractTokenMatch = raw.match(/(?:^|\/)0x[a-fA-F0-9]{40}\/(\d+)$/);
  if (contractTokenMatch) return contractTokenMatch[1];
  const trailingNumber = raw.match(/(\d+)$/);
  return trailingNumber ? trailingNumber[1] : raw;
}

function getEventImage(event: any) {
  const nft = getNft(event);

  // Prefer raw NFT media when OpenSea provides it. If it only provides a generated
  // display card, the frontend crops the left square so the OpenSea title/price area is hidden.
  const rawImage = normalizeImage(
    nft.image_original_url ||
      nft.image_url ||
      nft.imageUrl ||
      nft.image ||
      nft.metadata?.image ||
      event?.asset?.image_original_url ||
      event?.asset?.image_url ||
      event?.asset?.imageUrl ||
      event?.asset?.image ||
      ""
  );
  if (rawImage) return { image: rawImage, status: "raw" as const };

  const displayImage = normalizeImage(
    nft.display_image_url ||
      event?.display_image_url ||
      event?.image_url ||
      event?.asset?.display_image_url ||
      ""
  );
  if (displayImage) return { image: displayImage, status: "display" as const };

  return { image: "", status: "missing" as const };
}

function getPrice(event: any) {
  const payment = event.payment || event.payment_token || event.price?.currency || event?.asset_payment || {};
  const symbol = payment.symbol || event.price?.currency?.symbol || event?.payment_token?.symbol || "HYPE";
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? event?.payment_token?.decimals ?? 18);
  const raw =
    event.payment?.quantity ??
    event.closing_price ??
    event.total_price ??
    event.price?.quantity ??
    event.quantity ??
    event.sale_price ??
    event?.price;
  const value = toNumber(raw);
  if (!value) return `-- ${symbol}`;
  const normalized = value > 1_000_000_000 ? value / 10 ** decimals : value;
  return formatNative(normalized, symbol);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs = 3500) {
  const response = await fetchWithTimeout(url, { method: "GET", headers }, timeoutMs);
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.json();
}

function buildOpenSeaUrl(identifier: string) {
  return identifier ? `https://opensea.io/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/${identifier}` : OPENSEA_COLLECTION_URL;
}

function buildSaleFromApiEvent(event: any): SaleRow | null {
  const nft = getNft(event);
  const identifier = getIdentifier(event);
  if (!identifier) return null;

  const media = getEventImage(event);
  const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp || event.closing_date;

  return {
    id: identifier,
    name: nft.name || `Hypurr #${identifier}`,
    price: getPrice(event),
    time: formatRelativeTime(timestamp),
    timestamp,
    image: media.image,
    url: nft.permalink || buildOpenSeaUrl(identifier),
    buyer: event.buyer || event.to_account?.address || event.taker?.address || event.winner_account?.address || "",
    seller: event.seller || event.from_account?.address || event.maker?.address || event.seller_account?.address || "",
    imageStatus: media.status,
  };
}

function remember(payload: ResponsePayload) {
  memoryCache = { expiresAt: Date.now() + CACHE_MS, payload };
  return payload;
}

export async function GET() {
  const apiKeyConfigured = Boolean(process.env.OPENSEA_API_KEY);

  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return json({ ...memoryCache.payload, source: `${memoryCache.payload.source}-cache` });
  }

  const headers = getHeaders();
  const errors: string[] = [];

  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=12`, headers, 3500);
    const sales = getEvents(payload).map(buildSaleFromApiEvent).filter(Boolean) as SaleRow[];
    const imageCount = sales.filter((sale) => Boolean(sale.image)).length;

    return json(
      remember({
        sales,
        events: sales,
        source: "opensea-events-fast",
        apiKeyConfigured,
        imageCount,
        message: `${sales.length} OpenSea sales loaded; ${imageCount} with images.`,
        generatedAt: new Date().toISOString(),
        errors,
      })
    );
  } catch (error: any) {
    errors.push(error?.message || "OpenSea API request failed.");
  }

  return json(
    remember({
      sales: [],
      events: [],
      source: "empty",
      apiKeyConfigured,
      imageCount: 0,
      message: apiKeyConfigured
        ? "OpenSea did not return usable NFT sale data."
        : "OPENSEA_API_KEY is missing in Vercel or OpenSea rate-limited the request.",
      errors,
      generatedAt: new Date().toISOString(),
    })
  );
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const HYPURR_CHAIN = "hyperevm";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";
const HYPURR_CONTRACT_LOWER = HYPURR_CONTRACT.toLowerCase();
const CACHE_MS = 5 * 60 * 1000;
const INSTANT_KEY_CACHE_MS = 29 * 24 * 60 * 60 * 1000;

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
  imageStatus: "item-page" | "event" | "missing";
};

type ResponsePayload = {
  sales: SaleRow[];
  events: SaleRow[];
  source: string;
  apiKeyConfigured: boolean;
  apiKeyMode: "env" | "instant" | "none";
  imageCount: number;
  message: string;
  generatedAt: string;
  errors?: string[];
};

let memoryCache: { expiresAt: number; payload: ResponsePayload } | null = null;
let instantKeyCache: { expiresAt: number; key: string } | null = null;

function json(payload: ResponsePayload) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function normalizeImage(url: unknown) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("ipfs://")) {
    const path = trimmed.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.replace(/\\u0026/g, "&").replace(/\\u002F/g, "/");
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
    nft.identifier || nft.token_id || nft.tokenId || nft.id || event?.token_id || event?.tokenId || event?.nft_id || ""
  );
  const contractTokenMatch = raw.match(/(?:^|\/)0x[a-fA-F0-9]{40}\/(\d+)$/);
  if (contractTokenMatch) return contractTokenMatch[1];
  const trailingNumber = raw.match(/(\d+)$/);
  return trailingNumber ? trailingNumber[1] : raw;
}

function getEventImage(event: any) {
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
      ""
  );
}

function getPrice(event: any) {
  const payment = event.payment || event.payment_token || event.price?.currency || event?.asset_payment || {};
  const symbol = payment.symbol || event.price?.currency?.symbol || event?.payment_token?.symbol || "HYPE";
  const decimals = Number(payment.decimals ?? event.price?.currency?.decimals ?? event?.payment_token?.decimals ?? 18);
  const raw = event.payment?.quantity ?? event.closing_price ?? event.total_price ?? event.price?.quantity ?? event.quantity ?? event.sale_price ?? event?.price;
  const value = toNumber(raw);
  if (!value) return `-- ${symbol}`;
  const normalized = value > 1_000_000_000 ? value / 10 ** decimals : value;
  return formatNative(normalized, symbol);
}

function buildOpenSeaUrl(identifier: string) {
  return identifier ? `https://opensea.io/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/${identifier}` : OPENSEA_COLLECTION_URL;
}

function cleanSeaUrl(url: string) {
  return normalizeImage(url).replace(/&amp;/g, "&");
}

function extractItemMedia(html: string) {
  const normalized = html.replace(/\\u002F/g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
  const candidates: string[] = [];
  const regexes = [
    /https:\/\/i2c\.seadn\.io\/hyperevm\/0x9125e2d6827a00b0f8330d6ef7bef07730bac685\/[^"'\s<>\\]+?\.(?:png|jpg|jpeg|webp)(?:\?[^"'\s<>\\]*)?/gi,
    /https:\/\/[^"'\s<>\\]*seadn\.io\/[^"'\s<>\\]+?\.(?:png|jpg|jpeg|webp)(?:\?[^"'\s<>\\]*)?/gi,
  ];

  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      const url = cleanSeaUrl(match[0]);
      if (!url.includes("/collection/") && !candidates.includes(url)) candidates.push(url);
    }
  }

  const exact = candidates.find((url) => url.toLowerCase().includes(`/hyperevm/${HYPURR_CONTRACT_LOWER}/`));
  return exact || candidates[0] || "";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function requestInstantOpenSeaKey(errors: string[]) {
  const configured = process.env.OPENSEA_API_KEY?.trim();
  if (configured) return { key: configured, configured: true, mode: "env" as const };

  if (instantKeyCache && instantKeyCache.expiresAt > Date.now()) {
    return { key: instantKeyCache.key, configured: false, mode: "instant" as const };
  }

  try {
    const response = await fetchWithTimeout(`${OPENSEA_BASE_URL}/auth/keys`, {
      method: "POST",
      headers: { accept: "application/json", "user-agent": "HypurrScope/1.0 (+https://hypurrscope.xyz)" },
    }, 3500);
    if (!response.ok) throw new Error(`instant key failed ${response.status}`);
    const payload = await response.json();
    const key = String(payload?.api_key || payload?.apiKey || payload?.key || "").trim();
    if (!key) throw new Error("instant key empty");
    instantKeyCache = { key, expiresAt: Date.now() + INSTANT_KEY_CACHE_MS };
    return { key, configured: false, mode: "instant" as const };
  } catch (error: any) {
    errors.push(`OpenSea instant key unavailable: ${error?.message || "unknown error"}`);
    return { key: "", configured: false, mode: "none" as const };
  }
}

function openseaHeaders(key: string) {
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "HypurrScope/1.0 (+https://hypurrscope.xyz)",
  };
  if (key) headers["X-API-KEY"] = key;
  return headers;
}

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs = 4500) {
  const response = await fetchWithTimeout(url, { method: "GET", headers }, timeoutMs);
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.json();
}

async function fetchCleanImageFromItemPage(identifier: string) {
  if (!identifier) return "";
  const itemUrl = buildOpenSeaUrl(identifier);
  const response = await fetchWithTimeout(itemUrl, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 HypurrScope/1.0",
    },
  }, 4500);
  if (!response.ok) return "";
  const html = await response.text();
  return extractItemMedia(html);
}

function buildSaleFromApiEvent(event: any): SaleRow | null {
  const nft = getNft(event);
  const identifier = getIdentifier(event);
  if (!identifier) return null;
  const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp || event.closing_date;
  const image = getEventImage(event);
  return {
    id: identifier,
    name: nft.name || `Hypurr #${identifier}`,
    price: getPrice(event),
    time: formatRelativeTime(timestamp),
    timestamp,
    image,
    url: nft.permalink || buildOpenSeaUrl(identifier),
    buyer: event.buyer || event.to_account?.address || event.taker?.address || event.winner_account?.address || "",
    seller: event.seller || event.from_account?.address || event.maker?.address || event.seller_account?.address || "",
    imageStatus: image ? "event" : "missing",
  };
}

async function enrichWithCleanImages(sales: SaleRow[], errors: string[]) {
  const limited = sales.slice(0, 12);
  const enriched = await Promise.all(
    limited.map(async (sale) => {
      try {
        const cleanImage = await fetchCleanImageFromItemPage(sale.id);
        if (cleanImage) return { ...sale, image: cleanImage, imageStatus: "item-page" as const };
      } catch (error: any) {
        errors.push(`image ${sale.id}: ${error?.message || "failed"}`);
      }
      return sale;
    })
  );
  return enriched;
}

function remember(payload: ResponsePayload) {
  memoryCache = { expiresAt: Date.now() + CACHE_MS, payload };
  return payload;
}

export async function GET() {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return json({ ...memoryCache.payload, source: `${memoryCache.payload.source}-cache` });
  }

  const errors: string[] = [];
  const keyState = await requestInstantOpenSeaKey(errors);
  const headers = openseaHeaders(keyState.key);

  try {
    const eventsPayload = await fetchJson(
      `${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=12`,
      headers,
      5000
    );
    const basicSales = getEvents(eventsPayload).map(buildSaleFromApiEvent).filter(Boolean) as SaleRow[];
    const sales = await enrichWithCleanImages(basicSales, errors);
    const imageCount = sales.filter((sale) => Boolean(sale.image)).length;

    return json(
      remember({
        sales,
        events: sales,
        source: "opensea-events-clean-item-media",
        apiKeyConfigured: keyState.configured,
        apiKeyMode: keyState.mode,
        imageCount,
        message: `${sales.length} OpenSea sales loaded; ${imageCount} with item-page media.`,
        generatedAt: new Date().toISOString(),
        errors,
      })
    );
  } catch (error: any) {
    errors.push(error?.message || "OpenSea events request failed.");
  }

  return json(
    remember({
      sales: [],
      events: [],
      source: "empty",
      apiKeyConfigured: keyState.configured,
      apiKeyMode: keyState.mode,
      imageCount: 0,
      message: keyState.mode === "none" ? "OpenSea did not return data and no API key was available." : "OpenSea did not return usable NFT sale data.",
      errors,
      generatedAt: new Date().toISOString(),
    })
  );
}

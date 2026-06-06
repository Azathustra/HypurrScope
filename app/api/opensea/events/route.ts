import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const OPENSEA_ACTIVITY_URL = "https://opensea.io/collection/hypurr-hyperevm/activity";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";
const HYPURR_CONTRACT_LOWER = HYPURR_CONTRACT.toLowerCase();
const HYPURR_CHAIN = "hyperevm";
const CACHE_MS = 45_000;

type SaleRow = {
  id: string;
  name: string;
  price: string;
  priceVerified: boolean;
  priceSource: "opensea-sale-event" | "unavailable";
  time: string;
  timestamp?: string | number;
  image: string;
  url: string;
  buyer?: string;
  seller?: string;
  imageStatus: "collection_map" | "nft_api" | "event" | "item_page" | "missing";
};

type ResponsePayload = {
  sales: SaleRow[];
  events: SaleRow[];
  source: string;
  apiKeyConfigured: boolean;
  imageCount: number;
  verifiedPriceCount: number;
  message: string;
  generatedAt: string;
  errors?: string[];
};

let memoryCache: { expiresAt: number; payload: ResponsePayload } | null = null;

function json(payload: ResponsePayload) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=45, stale-while-revalidate=120" },
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

function getHtmlHeaders() {
  return {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.8",
    "user-agent": "Mozilla/5.0 (compatible; HypurrScope/1.0; +https://hypurrscope.xyz)",
  };
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
  return trimmed;
}

function num(value: unknown) {
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSymbol(symbol: unknown) {
  const raw = String(symbol || "HYPE").toUpperCase();
  return raw === "WHYPE" ? "HYPE" : raw;
}

function formatNative(value: number, symbol = "HYPE") {
  if (!Number.isFinite(value) || value <= 0) return "Sale price unavailable";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${symbol}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${symbol}`;
  if (value >= 100) return `${value.toFixed(0)} ${symbol}`;
  if (value >= 10) return `${value.toFixed(1)} ${symbol}`;
  if (value >= 1) return `${value.toFixed(2)} ${symbol}`;
  return `${value.toPrecision(3)} ${symbol}`;
}

function relativeTime(timestamp: string | number | undefined) {
  if (!timestamp) return "recent";
  const date = typeof timestamp === "number" ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000) : new Date(timestamp);
  const time = date.getTime();
  if (!Number.isFinite(time)) return "recent";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
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

function identifierFrom(event: any) {
  const nft = getNft(event);
  const raw = String(nft.identifier || nft.token_id || nft.tokenId || nft.id || event?.token_id || event?.tokenId || event?.nft_id || "");
  const contractTokenMatch = raw.match(/(?:^|\/)0x[a-fA-F0-9]{40}\/(\d+)$/);
  if (contractTokenMatch) return contractTokenMatch[1];
  const trailingNumber = raw.match(/(\d+)$/);
  return trailingNumber ? trailingNumber[1] : raw;
}

function eventImage(event: any) {
  const nft = getNft(event);
  return normalizeImage(
    nft.display_image_url ||
      nft.image_url ||
      nft.image_original_url ||
      nft.image ||
      event?.asset?.image_url ||
      event?.asset?.image_original_url ||
      event?.image_url ||
      "",
  );
}

function salePriceFromEvent(event: any) {
  const candidates = [
    { raw: event?.payment?.quantity, decimals: event?.payment?.decimals, symbol: event?.payment?.symbol },
    { raw: event?.price?.quantity, decimals: event?.price?.currency?.decimals, symbol: event?.price?.currency?.symbol },
    { raw: event?.total_price, decimals: event?.payment_token?.decimals, symbol: event?.payment_token?.symbol },
    { raw: event?.closing_price, decimals: event?.payment_token?.decimals, symbol: event?.payment_token?.symbol },
    { raw: event?.sale_price, decimals: event?.payment_token?.decimals, symbol: event?.payment_token?.symbol },
  ];

  for (const candidate of candidates) {
    if (candidate.raw === undefined || candidate.raw === null || typeof candidate.raw === "object") continue;
    const value = num(candidate.raw);
    if (!value) continue;
    const decimals = Number.isFinite(Number(candidate.decimals)) ? Number(candidate.decimals) : 18;
    const normalized = value > 1_000_000 ? value / 10 ** decimals : value;
    if (normalized > 0 && normalized < 100_000) {
      return {
        label: formatNative(normalized, normalizeSymbol(candidate.symbol)),
        verified: true,
      };
    }
  }

  return { label: "Sale price unavailable", verified: false };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs = 4_000) {
  const response = await fetchWithTimeout(url, { method: "GET", headers }, timeoutMs);
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.json();
}

async function fetchText(url: string, timeoutMs = 4_000) {
  const response = await fetchWithTimeout(url, { method: "GET", headers: getHtmlHeaders() }, timeoutMs);
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.text();
}

function extractMetaContent(html: string, names: string[]) {
  for (const name of names) {
    const propertyRegex = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const reversedRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
    const match = html.match(propertyRegex) || html.match(reversedRegex);
    if (match?.[1]) return match[1].replace(/&amp;/g, "&");
  }
  return "";
}

function openSeaItemUrl(identifier: string) {
  return identifier ? `https://opensea.io/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/${identifier}` : OPENSEA_COLLECTION_URL;
}

async function fetchItemMeta(identifier: string) {
  if (!identifier) return { image: "", title: "" };
  try {
    const html = await fetchText(openSeaItemUrl(identifier), 3_500);
    return {
      image: normalizeImage(extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"])),
      title: extractMetaContent(html, ["og:title", "twitter:title"]),
    };
  } catch {
    return { image: "", title: "" };
  }
}

async function fetchNftApiImage(identifier: string, headers: Record<string, string>) {
  if (!identifier) return "";
  const urls = [
    `${OPENSEA_BASE_URL}/chain/${HYPURR_CHAIN}/contract/${HYPURR_CONTRACT}/nfts/${identifier}`,
    `${OPENSEA_BASE_URL}/chain/${HYPURR_CHAIN}/contract/${HYPURR_CONTRACT_LOWER}/nfts/${identifier}`,
  ];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url, headers, 3_000);
      const nft = payload?.nft || payload;
      const image = normalizeImage(nft?.display_image_url || nft?.image_url || nft?.image_original_url || nft?.image || "");
      if (image) return image;
    } catch {
      // continue
    }
  }
  return "";
}

async function collectionImageMap(headers: Record<string, string>) {
  const map = new Map<string, string>();
  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/collection/${OPENSEA_COLLECTION_SLUG}/nfts?limit=200`, headers, 4_000);
    const nfts = Array.isArray(payload?.nfts) ? payload.nfts : [];
    for (const nft of nfts) {
      const id = String(nft.identifier || nft.token_id || nft.tokenId || "");
      const image = normalizeImage(nft.display_image_url || nft.image_url || nft.image_original_url || nft.image || "");
      if (id && image) map.set(id, image);
    }
  } catch {
    // optional
  }
  return map;
}

async function saleFromApiEvent(event: any, images: Map<string, string>, headers: Record<string, string>): Promise<SaleRow | null> {
  const nft = getNft(event);
  const id = identifierFrom(event);
  if (!id) return null;
  const apiImage = images.get(id) || (await fetchNftApiImage(id, headers));
  const fallbackImage = eventImage(event);
  const itemMeta = apiImage || fallbackImage ? { image: "", title: "" } : await fetchItemMeta(id);
  const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp || event.closing_date;
  const price = salePriceFromEvent(event);
  const image = apiImage || fallbackImage || itemMeta.image || "";

  return {
    id,
    name: nft.name || itemMeta.title?.split(" - ")?.[0] || `Hypurr #${id}`,
    price: price.label,
    priceVerified: price.verified,
    priceSource: price.verified ? "opensea-sale-event" : "unavailable",
    time: relativeTime(timestamp),
    timestamp,
    image,
    url: nft.opensea_url || nft.permalink || openSeaItemUrl(id),
    buyer: event.buyer || event.to_account?.address || event.taker?.address || "",
    seller: event.seller || event.from_account?.address || event.maker?.address || "",
    imageStatus: apiImage ? "nft_api" : fallbackImage ? "event" : itemMeta.image ? "item_page" : "missing",
  };
}

async function fetchSalesViaApi(headers: Record<string, string>) {
  const [eventsPayload, images] = await Promise.all([
    fetchJson(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=24`, headers, 4_000),
    collectionImageMap(headers),
  ]);
  const events = getEvents(eventsPayload).slice(0, 12);
  const rows = await Promise.all(events.map((event: any) => saleFromApiEvent(event, images, headers)));
  return rows.filter(Boolean) as SaleRow[];
}

function idsFromActivityHtml(html: string) {
  const ids = new Set<string>();
  const itemRegex = new RegExp(`/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/(\\d+)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(html)) !== null) {
    if (match[1]) ids.add(match[1]);
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const textRegex = /Hypurr\s*#\s*(\d+)/gi;
  while ((match = textRegex.exec(text)) !== null) {
    if (match[1]) ids.add(match[1]);
  }
  return Array.from(ids).slice(0, 12);
}

async function fetchSalesViaActivityPage() {
  const html = await fetchText(OPENSEA_ACTIVITY_URL, 4_000);
  const ids = idsFromActivityHtml(html);
  const rows = await Promise.all(
    ids.map(async (id) => {
      const meta = await fetchItemMeta(id);
      return {
        id,
        name: meta.title?.split(" - ")?.[0] || `Hypurr #${id}`,
        price: "Sale price unavailable",
        priceVerified: false,
        priceSource: "unavailable" as const,
        time: "recent",
        image: meta.image,
        url: openSeaItemUrl(id),
        imageStatus: meta.image ? ("item_page" as const) : ("missing" as const),
      };
    }),
  );
  return rows.filter((row) => row.id).slice(0, 12);
}

function remember(payload: ResponsePayload) {
  memoryCache = { expiresAt: Date.now() + CACHE_MS, payload };
  return payload;
}

export async function GET() {
  const apiKeyConfigured = Boolean(process.env.OPENSEA_API_KEY);
  if (memoryCache && memoryCache.expiresAt > Date.now()) return json({ ...memoryCache.payload, source: `${memoryCache.payload.source}-cache` });

  const headers = getHeaders();
  const errors: string[] = [];

  try {
    const sales = await fetchSalesViaApi(headers);
    if (sales.length) {
      const imageCount = sales.filter((sale) => Boolean(sale.image)).length;
      const verifiedPriceCount = sales.filter((sale) => sale.priceVerified).length;
      return json(
        remember({
          sales,
          events: sales,
          source: "opensea-sale-events",
          apiKeyConfigured,
          imageCount,
          verifiedPriceCount,
          message: `${sales.length} OpenSea sale events loaded; ${verifiedPriceCount} verified sale prices.`,
          generatedAt: new Date().toISOString(),
        }),
      );
    }
    errors.push("OpenSea API returned no sale events.");
  } catch (error: any) {
    errors.push(error?.message || "OpenSea API request failed.");
  }

  try {
    const sales = await fetchSalesViaActivityPage();
    const imageCount = sales.filter((sale) => Boolean(sale.image)).length;
    return json(
      remember({
        sales,
        events: sales,
        source: "opensea-html-artwork-fallback",
        apiKeyConfigured,
        imageCount,
        verifiedPriceCount: 0,
        message: sales.length
          ? `${sales.length} Hypurr items recovered from OpenSea pages. Prices hidden because this fallback cannot verify sale-event prices.`
          : "No live OpenSea sales recovered.",
        errors,
        generatedAt: new Date().toISOString(),
      }),
    );
  } catch (error: any) {
    errors.push(error?.message || "OpenSea HTML fallback failed.");
  }

  return json(
    remember({
      sales: [],
      events: [],
      source: "empty",
      apiKeyConfigured,
      imageCount: 0,
      verifiedPriceCount: 0,
      message: apiKeyConfigured ? "OpenSea did not return usable NFT sale data." : "OpenSea live sale data unavailable without API key.",
      errors,
      generatedAt: new Date().toISOString(),
    }),
  );
}

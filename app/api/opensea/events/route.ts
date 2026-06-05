import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/hypurr-hyperevm";
const OPENSEA_ACTIVITY_URL = "https://opensea.io/collection/hypurr-hyperevm/activity";
const HYPURR_CONTRACT = "0x9125E2d6827a00B0F8330D6ef7BEF07730Bac685";
const HYPURR_CONTRACT_LOWER = HYPURR_CONTRACT.toLowerCase();
const HYPURR_CHAIN = "hyperevm";
const CACHE_MS = 60_000;

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
  imageStatus: "event" | "collection_map" | "nft_api" | "item_page" | "missing";
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
      "Cache-Control": "public, max-age=0, s-maxage=45, stale-while-revalidate=120",
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

function getHtmlHeaders() {
  return {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.8",
    "user-agent": "Mozilla/5.0 (compatible; HypurrScope/1.0; +https://hypurrscope.xyz)",
  };
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
  return normalizeImage(
    nft.display_image_url ||
      nft.image_url ||
      nft.imageUrl ||
      nft.image_original_url ||
      nft.image ||
      event?.display_image_url ||
      event?.image_url ||
      event?.asset?.image_url ||
      event?.asset?.image_original_url ||
      event?.asset?.imageUrl ||
      ""
  );
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4_500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, headers: Record<string, string>, timeoutMs = 4_500) {
  const response = await fetchWithTimeout(url, { method: "GET", headers }, timeoutMs);
  if (!response.ok) throw new Error(`${url} failed ${response.status}`);
  return response.json();
}

async function fetchText(url: string, timeoutMs = 4_500) {
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

function buildOpenSeaUrl(identifier: string) {
  return identifier ? `https://opensea.io/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/${identifier}` : OPENSEA_COLLECTION_URL;
}

async function fetchOpenSeaItemMeta(identifier: string) {
  if (!identifier) return { image: "", title: "" };
  try {
    const html = await fetchText(buildOpenSeaUrl(identifier), 3_500);
    const image = normalizeImage(extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]));
    const title = extractMetaContent(html, ["og:title", "twitter:title"]);
    return { image, title };
  } catch {
    return { image: "", title: "" };
  }
}

async function fetchNftImage(identifier: string, headers: Record<string, string>) {
  if (!identifier) return "";
  const urls = [
    `${OPENSEA_BASE_URL}/chain/${HYPURR_CHAIN}/contract/${HYPURR_CONTRACT}/nfts/${identifier}`,
    `${OPENSEA_BASE_URL}/chain/${HYPURR_CHAIN}/contract/${HYPURR_CONTRACT_LOWER}/nfts/${identifier}`,
  ];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url, headers, 3_500);
      const nft = payload?.nft || payload;
      const image = normalizeImage(nft?.display_image_url || nft?.image_url || nft?.imageUrl || nft?.image_original_url || nft?.image || "");
      if (image) return image;
    } catch {
      // Try next format.
    }
  }
  return "";
}

async function fetchCollectionImageMap(headers: Record<string, string>) {
  const map = new Map<string, string>();
  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/collection/${OPENSEA_COLLECTION_SLUG}/nfts?limit=200`, headers, 4_500);
    const nfts = Array.isArray(payload?.nfts) ? payload.nfts : [];
    for (const nft of nfts) {
      const id = String(nft.identifier || nft.token_id || nft.tokenId || "");
      const image = normalizeImage(nft.display_image_url || nft.image_url || nft.imageUrl || nft.image_original_url || nft.image || "");
      if (id && image) map.set(id, image);
    }
  } catch {
    // Optional enrichment only.
  }
  return map;
}

async function buildSaleFromApiEvent(event: any, imageMap: Map<string, string>, headers: Record<string, string>): Promise<SaleRow | null> {
  const nft = getNft(event);
  const identifier = getIdentifier(event);
  if (!identifier) return null;
  const imageFromEvent = getEventImage(event);
  const imageFromMap = imageMap.get(identifier) || "";
  let imageFromApi = "";
  let itemMeta = { image: "", title: "" };

  if (!imageFromEvent && !imageFromMap) {
    imageFromApi = await fetchNftImage(identifier, headers);
  }
  if (!imageFromEvent && !imageFromMap && !imageFromApi) {
    itemMeta = await fetchOpenSeaItemMeta(identifier);
  }

  const image = imageFromEvent || imageFromMap || imageFromApi || itemMeta.image || "";
  const timestamp = event.event_timestamp || event.created_date || event.transaction?.timestamp || event.timestamp || event.closing_date;

  return {
    id: identifier,
    name: nft.name || itemMeta.title?.split(" - ")?.[0] || `Hypurr #${identifier}`,
    price: getPrice(event),
    time: formatRelativeTime(timestamp),
    timestamp,
    image,
    url: nft.permalink || buildOpenSeaUrl(identifier),
    buyer: event.buyer || event.to_account?.address || event.taker?.address || event.winner_account?.address || "",
    seller: event.seller || event.from_account?.address || event.maker?.address || event.seller_account?.address || "",
    imageStatus: imageFromEvent ? "event" : imageFromMap ? "collection_map" : imageFromApi ? "nft_api" : itemMeta.image ? "item_page" : "missing",
  };
}

async function fetchSalesViaApi(headers: Record<string, string>) {
  const [eventsPayload, imageMap] = await Promise.all([
    fetchJson(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=24`, headers, 4_500),
    fetchCollectionImageMap(headers),
  ]);
  const events = getEvents(eventsPayload).slice(0, 12);
  const rows = await Promise.all(events.map((event: any) => buildSaleFromApiEvent(event, imageMap, headers)));
  return rows.filter(Boolean) as SaleRow[];
}

function findPriceNearToken(plainText: string, identifier: string) {
  const index = plainText.indexOf(`Hypurr #${identifier}`);
  if (index === -1) return "-- HYPE";
  const windowText = plainText.slice(index, index + 260);
  const match = windowText.match(/([0-9][0-9,.]*(?:\.\d+)?)\s*(W?HYPE)/i);
  if (!match) return "-- HYPE";
  const amount = toNumber(match[1]);
  return amount ? formatNative(amount, match[2].toUpperCase()) : "-- HYPE";
}

function extractIdsFromActivityHtml(html: string) {
  const ids = new Set<string>();
  const itemRegex = new RegExp(`/item/${HYPURR_CHAIN}/${HYPURR_CONTRACT_LOWER}/(\\d+)`, "gi");
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(html)) !== null) {
    if (itemMatch[1]) ids.add(itemMatch[1]);
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const textRegex = /Hypurr\s*#\s*(\d+)/gi;
  let textMatch: RegExpExecArray | null;
  while ((textMatch = textRegex.exec(text)) !== null) {
    if (textMatch[1]) ids.add(textMatch[1]);
  }

  return { ids: Array.from(ids).slice(0, 12), text };
}

async function fetchSalesViaActivityPage() {
  const html = await fetchText(OPENSEA_ACTIVITY_URL, 4_500);
  const { ids, text } = extractIdsFromActivityHtml(html);
  const rows = await Promise.all(
    ids.map(async (identifier) => {
      const meta = await fetchOpenSeaItemMeta(identifier);
      return {
        id: identifier,
        name: meta.title?.split(" - ")?.[0] || `Hypurr #${identifier}`,
        price: findPriceNearToken(text, identifier),
        time: "recent",
        image: meta.image,
        url: buildOpenSeaUrl(identifier),
        imageStatus: meta.image ? "item_page" : "missing",
      } satisfies SaleRow;
    })
  );
  return rows.filter((row) => row.id).slice(0, 12);
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
    const apiSales = await fetchSalesViaApi(headers);
    if (apiSales.length) {
      const imageCount = apiSales.filter((sale) => Boolean(sale.image)).length;
      return json(
        remember({
          sales: apiSales,
          events: apiSales,
          source: "opensea-api-enriched",
          apiKeyConfigured,
          imageCount,
          message: `${apiSales.length} OpenSea sales loaded; ${imageCount} with images.`,
          generatedAt: new Date().toISOString(),
        })
      );
    }
    errors.push("OpenSea API returned no sale events.");
  } catch (error: any) {
    errors.push(error?.message || "OpenSea API request failed.");
  }

  try {
    const htmlSales = await fetchSalesViaActivityPage();
    const imageCount = htmlSales.filter((sale) => Boolean(sale.image)).length;
    return json(
      remember({
        sales: htmlSales,
        events: htmlSales,
        source: "opensea-html-fallback",
        apiKeyConfigured,
        imageCount,
        message: htmlSales.length
          ? `${htmlSales.length} sale/item rows recovered from OpenSea pages; ${imageCount} with images.`
          : apiKeyConfigured
            ? "OpenSea returned no recent sale rows."
            : "No live sales recovered. Add OPENSEA_API_KEY in Vercel for reliable sales and images.",
        errors,
        generatedAt: new Date().toISOString(),
      })
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
      message: apiKeyConfigured
        ? "OpenSea did not return usable NFT sale data."
        : "OPENSEA_API_KEY is missing in Vercel, and the HTML fallback did not recover sales.",
      errors,
      generatedAt: new Date().toISOString(),
    })
  );
}

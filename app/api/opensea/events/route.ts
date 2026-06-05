import { NextResponse } from "next/server";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

function getHeaders() {
  const apiKey = process.env.OPENSEA_API_KEY;
  const headers: HeadersInit = { accept: "application/json" };
  if (apiKey) headers["X-API-KEY"] = apiKey;
  return headers;
}

function getEvents(payload: any) {
  const events = payload?.asset_events || payload?.events || [];
  return Array.isArray(events) ? events : [];
}

function getIdentifier(event: any) {
  const nft = event?.nft || event?.asset || {};
  return String(nft.identifier || nft.token_id || event?.token_id || event?.nft_id || "");
}

function getExistingImage(event: any) {
  const nft = event?.nft || event?.asset || {};
  return nft.display_image_url || nft.image_url || nft.imageUrl || nft.image || event?.image_url || event?.asset?.image_url || event?.asset?.image_original_url || "";
}

function getContractAddress(event: any) {
  const nft = event?.nft || event?.asset || {};
  return (
    nft.contract ||
    nft.contract_address ||
    nft.contractAddress ||
    nft.asset_contract?.address ||
    event?.asset_contract?.address ||
    event?.asset?.asset_contract?.address ||
    ""
  );
}

function getChain(event: any) {
  const nft = event?.nft || event?.asset || {};
  return nft.chain || event?.chain || event?.asset?.chain || "hyperevm";
}

async function fetchJson(url: string, headers: HeadersInit) {
  const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}

async function fetchCollectionImageMap(headers: HeadersInit) {
  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/collection/${OPENSEA_COLLECTION_SLUG}/nfts?limit=200`, headers);
    const nfts = Array.isArray(payload?.nfts) ? payload.nfts : [];
    return new Map(
      nfts.map((nft: any) => [String(nft.identifier || nft.token_id || ""), nft.display_image_url || nft.image_url || nft.imageUrl || nft.image || ""]),
    );
  } catch (error) {
    return new Map<string, string>();
  }
}

async function fetchSingleNftImage(event: any, headers: HeadersInit) {
  const identifier = getIdentifier(event);
  const contract = getContractAddress(event);
  const chain = getChain(event);
  if (!identifier || !contract) return "";

  try {
    const payload = await fetchJson(`${OPENSEA_BASE_URL}/chain/${chain}/contract/${contract}/nfts/${identifier}`, headers);
    const nft = payload?.nft || payload;
    return nft?.display_image_url || nft?.image_url || nft?.imageUrl || nft?.image || "";
  } catch (error) {
    return "";
  }
}

export async function GET() {
  const headers = getHeaders();

  try {
    const eventsPayload = await fetchJson(`${OPENSEA_BASE_URL}/events/collection/${OPENSEA_COLLECTION_SLUG}?event_type=sale&limit=24`, headers);
    const events = getEvents(eventsPayload).slice(0, 18);
    const imageMap = await fetchCollectionImageMap(headers);

    const enrichedEvents = await Promise.all(
      events.map(async (event: any) => {
        const nft = event?.nft || event?.asset || {};
        const identifier = getIdentifier(event);
        const mappedImage = identifier ? imageMap.get(identifier) || "" : "";
        const existingImage = getExistingImage(event) || mappedImage;
        const recoveredImage = existingImage ? "" : await fetchSingleNftImage(event, headers);

        return {
          ...event,
          image_url: existingImage || recoveredImage || "",
          nft: {
            ...nft,
            identifier: identifier || nft.identifier,
            image_url: nft.image_url || existingImage || recoveredImage || "",
            display_image_url: nft.display_image_url || existingImage || recoveredImage || "",
          },
        };
      }),
    );

    return NextResponse.json(
      {
        events: enrichedEvents,
        generatedAt: new Date().toISOString(),
        source: "opensea-rest",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ events: [], error: "OpenSea events route failed" }, { status: 500 });
  }
}

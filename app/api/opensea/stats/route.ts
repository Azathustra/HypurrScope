import { NextResponse } from "next/server";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

export async function GET() {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    const headers: HeadersInit = { accept: "application/json" };
    if (apiKey) headers["X-API-KEY"] = apiKey;

    const response = await fetch(`${OPENSEA_BASE_URL}/collections/${OPENSEA_COLLECTION_SLUG}/stats`, {
      method: "GET",
      headers,
      cache: "no-store"
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "OpenSea stats proxy failed" }, { status: 500 });
  }
}

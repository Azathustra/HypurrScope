import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENSEA_COLLECTION_SLUG = "hypurr-hyperevm";
const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";

function headers(): HeadersInit {
  const apiKey = process.env.OPENSEA_API_KEY;
  const h: HeadersInit = { accept: "application/json" };
  if (apiKey) h["X-API-KEY"] = apiKey;
  return h;
}

export async function GET() {
  try {
    const response = await fetch(`${OPENSEA_BASE_URL}/collections/${OPENSEA_COLLECTION_SLUG}/stats`, {
      method: "GET",
      headers: headers(),
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "OpenSea stats proxy failed" }, { status: 200 });
  }
}

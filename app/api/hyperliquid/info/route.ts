import { NextRequest, NextResponse } from "next/server";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    return NextResponse.json({ error: "Hyperliquid info proxy failed" }, { status: 500 });
  }
}

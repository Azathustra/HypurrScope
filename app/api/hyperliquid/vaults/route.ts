import { NextResponse } from "next/server";

const HYPERLIQUID_VAULTS_ENDPOINT = "https://stats-data.hyperliquid.xyz/Mainnet/vaults";

export async function GET() {
  try {
    const response = await fetch(HYPERLIQUID_VAULTS_ENDPOINT, {
      method: "GET",
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
    return NextResponse.json({ error: "Hyperliquid vault proxy failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HYPERLIQUID_INFO_ENDPOINT = "https://api.hyperliquid.xyz/info";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = String(body?.user || body?.address || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(user)) {
      return NextResponse.json({ ok: false, error: "Invalid address" }, { status: 400 });
    }

    const response = await fetch(HYPERLIQUID_INFO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user }),
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Wallet scan failed" }, { status: 500 });
  }
}

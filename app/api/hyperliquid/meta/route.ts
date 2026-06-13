export const dynamic = "force-dynamic";
export const revalidate = 0;

const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export async function GET() {
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      cache: "no-store",
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Unable to reach Hyperliquid meta endpoint" }, { status: 502 });
  }
}

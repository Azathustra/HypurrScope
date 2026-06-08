export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      sales: [],
      source: "unavailable",
      note: "OpenSea event feed unavailable. No fallback NFT sales are shown.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

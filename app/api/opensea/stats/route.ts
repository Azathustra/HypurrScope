export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      total: {},
      intervals: [],
      source: "unavailable",
      note: "OpenSea data unavailable. No fallback NFT values are shown.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

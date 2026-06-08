export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      flows: [],
      dailyFlows: [],
      source: "unavailable",
      latestDate: "",
      note: "ETF and DAT flow feed unavailable. No fallback values are shown.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

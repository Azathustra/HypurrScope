import { listSignalEpisodes, migrateLegacySignalRows, signalEpisodeStats } from "../../../lib/signal-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 120);
    const migration = await migrateLegacySignalRows();
    const [rows, stats] = await Promise.all([
      listSignalEpisodes(limit),
      signalEpisodeStats(),
    ]);
    return Response.json({ ok: true, rows, stats, migration }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), rows: [] },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

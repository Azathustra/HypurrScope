import { signalEpisodeStats, updateSignalOutcomes } from "../../../lib/signal-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const outcomeUpdate = await updateSignalOutcomes(80);
    const stats = await signalEpisodeStats();
    return Response.json({
      ok: true,
      ...outcomeUpdate,
      stats,
      updatedAt: new Date().toISOString(),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString() },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

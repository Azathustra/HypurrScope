import fs from "node:fs";

const client = fs.readFileSync("app/hypurrscope-client.tsx", "utf8");
const lib = fs.readFileSync("app/lib/signal-history.ts", "utf8");
const recordRoute = fs.readFileSync("app/api/signal-history/record/route.ts", "utf8");
const listRoute = fs.readFileSync("app/api/signal-history/list/route.ts", "utf8");
const outcomeRoute = fs.readFileSync("app/api/cron/update-signal-outcomes/route.ts", "utf8");

const checks = [
  ["Episode table exists", lib.includes("create table if not exists signal_episodes")],
  ["No weak near logging", lib.includes("input.status === \"near\" && score >= 75") && client.includes("signal.finalScore >= 75")],
  ["Flow missing skipped", lib.includes("input.flowScore === null && !input.allowStructureFallback") && client.includes("signal.flowScore === null")],
  ["Cooldown dedupe", lib.includes("cooldownMinutes") && lib.includes("first_seen_at >= $3::timestamptz")],
  ["Episode update instead of duplicate", lib.includes("update signal_episodes") && lib.includes("last_seen_at = greatest") && lib.includes("peak_score = greatest")],
  ["Expired quiet near episodes", lib.includes("last_seen_at < now() - interval '15 minutes'") && lib.includes("expired before activation")],
  ["Legacy rows grouped", lib.includes("migrateLegacySignalRows") && lib.includes("groupedRows") && lib.includes("date_trunc('hour'")],
  ["Outcome cron route", outcomeRoute.includes("updateSignalOutcomes") && outcomeRoute.includes("updatedAt")],
  ["Outcome horizons", lib.includes("started + 60 * 60 * 1000") && lib.includes("started + 4 * 60 * 60 * 1000") && lib.includes("started + 24 * 60 * 60 * 1000")],
  ["Directional outcomes", lib.includes("long_squeeze_risk") && lib.includes("short_squeeze_risk") && lib.includes("directionalPct")],
  ["Clean default UI", client.includes('useState<SignalHistoryTab>("resolved")') && client.includes("No resolved signals yet")],
  ["Actions cleaned", client.includes("Create alert") && client.includes("View details") && client.includes("active episode")],
  ["Routes return stats", recordRoute.includes("signalEpisodeStats") && listRoute.includes("signalEpisodeStats")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Signal history test failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Signal history test passed.");

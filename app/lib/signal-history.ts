import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocalDb = connectionString ? /localhost|127\.0\.0\.1/i.test(connectionString) : false;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;
let memoryRows: SignalHistoryRow[] = [];

export type SignalAsset = "BTC" | "ETH" | "HYPE";
export type SignalSetup = "Fresh Long" | "Fresh Short" | "Crowded Long" | "Crowded Short";
export type SignalEpisodeStatus = "pending" | "resolved" | "expired";
export type SignalOutcomeStatus = "pending" | "partial" | "ready" | "unavailable";

export type SignalHistoryInput = {
  timestamp: string;
  asset: SignalAsset;
  setupType: SignalSetup;
  status: "active" | "near" | string;
  finalScore: number | null;
  structureScore: number | null;
  flowScore: number | null;
  priceAtSignal: number | null;
  triggerPrice?: number | null;
  oi15m: number | null;
  oi4h: number | null;
  funding: number | null;
  takerRatio: number | null;
  netFlow: number | null;
  cvd: number | null;
  liquidityState: string;
  category?: "trade_setup" | "risk_warning";
  direction?: "long" | "short" | "long_squeeze_risk" | "short_squeeze_risk";
  reason?: string;
  mainBlocker?: string;
  rawSnapshotJson?: unknown;
  allowStructureFallback?: boolean;
};

export type SignalHistoryRow = {
  id: string;
  asset: SignalAsset;
  setupType: SignalSetup;
  category: "trade_setup" | "risk_warning";
  direction: "long" | "short" | "long_squeeze_risk" | "short_squeeze_risk";
  statusGroup: "near" | "active";
  firstSeenAt: string;
  lastSeenAt: string;
  activeAt: string | null;
  closedAt: string | null;
  timestamp: string;
  status: SignalEpisodeStatus;
  initialScore: number | null;
  peakScore: number | null;
  latestScore: number | null;
  finalScore: number | null;
  structureScore: number | null;
  flowScore: number | null;
  referencePrice: number | null;
  priceAtSignal: number | null;
  triggerPrice: number | null;
  reason: string;
  mainBlocker: string;
  rawSnapshotJson: unknown;
  result1h: number | null;
  result4h: number | null;
  result24h: number | null;
  maxFavorableMove: number | null;
  maxAdverseMove: number | null;
  outcomeStatus: SignalOutcomeStatus;
  outcomeError: string | null;
  outcomeRawJson: unknown;
};

export type SignalHistoryStats = {
  episodesTracked: number;
  pending: number;
  resolved: number;
  expired: number;
  activeSignalsLogged: number;
  nearSignalsLogged: number;
  averagePeakScore: number | null;
  resolvedEpisodes: number;
  historicalFavorableMoveRate: number | null;
};

function db() {
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function categoryFor(setupType: SignalSetup): "trade_setup" | "risk_warning" {
  return setupType === "Crowded Long" || setupType === "Crowded Short" ? "risk_warning" : "trade_setup";
}

function directionFor(setupType: SignalSetup): SignalHistoryRow["direction"] {
  if (setupType === "Fresh Long") return "long";
  if (setupType === "Fresh Short") return "short";
  if (setupType === "Crowded Long") return "long_squeeze_risk";
  return "short_squeeze_risk";
}

function groupFor(status: string): "near" | "active" {
  return status === "active" ? "active" : "near";
}

function eligible(input: SignalHistoryInput) {
  if (input.finalScore === null || !Number.isFinite(input.finalScore)) return false;
  if (input.flowScore === null && !input.allowStructureFallback) return false;
  if (input.status === "active") return true;
  return input.status === "near" && input.finalScore >= 75;
}

function rowFromInput(input: SignalHistoryInput): SignalHistoryRow {
  const firstSeenAt = new Date(input.timestamp || Date.now()).toISOString();
  const statusGroup = groupFor(input.status);
  return {
    id: crypto.randomUUID(),
    asset: input.asset,
    setupType: input.setupType,
    category: input.category || categoryFor(input.setupType),
    direction: input.direction || directionFor(input.setupType),
    statusGroup,
    firstSeenAt,
    lastSeenAt: firstSeenAt,
    activeAt: statusGroup === "active" ? firstSeenAt : null,
    closedAt: null,
    timestamp: firstSeenAt,
    status: "pending",
    initialScore: input.finalScore,
    peakScore: input.finalScore,
    latestScore: input.finalScore,
    finalScore: input.finalScore,
    structureScore: input.structureScore,
    flowScore: input.flowScore,
    referencePrice: input.priceAtSignal,
    priceAtSignal: input.priceAtSignal,
    triggerPrice: input.triggerPrice ?? null,
    reason: input.reason || "Signal episode started.",
    mainBlocker: input.mainBlocker || "No blocker captured.",
    rawSnapshotJson: input.rawSnapshotJson ?? input,
    result1h: null,
    result4h: null,
    result24h: null,
    maxFavorableMove: null,
    maxAdverseMove: null,
    outcomeStatus: "pending",
    outcomeError: null,
    outcomeRawJson: null,
  };
}

function rowFromDb(row: Record<string, unknown>): SignalHistoryRow {
  const firstSeenAt = new Date(String(row.first_seen_at || row.timestamp || Date.now())).toISOString();
  const setupType = String(row.setup_type || "Fresh Long") as SignalSetup;
  const statusGroup = row.status_group === "active" ? "active" : "near";
  return {
    id: String(row.id),
    asset: String(row.asset || "BTC") as SignalAsset,
    setupType,
    category: row.category === "risk_warning" ? "risk_warning" : "trade_setup",
    direction: String(row.direction || directionFor(setupType)) as SignalHistoryRow["direction"],
    statusGroup,
    firstSeenAt,
    lastSeenAt: new Date(String(row.last_seen_at || firstSeenAt)).toISOString(),
    activeAt: row.active_at ? new Date(String(row.active_at)).toISOString() : null,
    closedAt: row.closed_at ? new Date(String(row.closed_at)).toISOString() : null,
    timestamp: firstSeenAt,
    status: row.status === "resolved" ? "resolved" : row.status === "expired" ? "expired" : "pending",
    initialScore: numberOrNull(row.initial_score),
    peakScore: numberOrNull(row.peak_score),
    latestScore: numberOrNull(row.latest_score),
    finalScore: numberOrNull(row.final_score),
    structureScore: numberOrNull(row.structure_score),
    flowScore: numberOrNull(row.flow_score),
    referencePrice: numberOrNull(row.reference_price),
    priceAtSignal: numberOrNull(row.reference_price),
    triggerPrice: numberOrNull(row.trigger_price),
    reason: String(row.reason || "Signal episode tracked."),
    mainBlocker: String(row.main_blocker || "No blocker captured."),
    rawSnapshotJson: row.raw_snapshot_json ?? null,
    result1h: numberOrNull(row.result_1h),
    result4h: numberOrNull(row.result_4h),
    result24h: numberOrNull(row.result_24h),
    maxFavorableMove: numberOrNull(row.max_favorable_move),
    maxAdverseMove: numberOrNull(row.max_adverse_move),
    outcomeStatus: row.outcome_status === "ready" ? "ready" : row.outcome_status === "partial" ? "partial" : row.outcome_status === "unavailable" ? "unavailable" : "pending",
    outcomeError: row.outcome_error ? String(row.outcome_error) : null,
    outcomeRawJson: row.outcome_raw_json ?? null,
  };
}

export async function ensureSignalHistoryTable() {
  const pool = db();
  if (!pool) return;
  if (!schemaReady) {
    schemaReady = pool.query(`
      create table if not exists signal_episodes (
        id uuid primary key,
        legacy_key text unique,
        asset text not null,
        setup_type text not null,
        category text not null,
        direction text not null,
        status_group text not null,
        first_seen_at timestamptz not null,
        last_seen_at timestamptz not null,
        active_at timestamptz,
        closed_at timestamptz,
        status text not null default 'pending',
        initial_score numeric,
        peak_score numeric,
        latest_score numeric,
        structure_score numeric,
        flow_score numeric,
        final_score numeric,
        reference_price numeric,
        trigger_price numeric,
        reason text,
        main_blocker text,
        raw_snapshot_json jsonb,
        result_1h numeric,
        result_4h numeric,
        result_24h numeric,
        max_favorable_move numeric,
        max_adverse_move numeric,
        outcome_status text default 'pending',
        outcome_error text,
        outcome_raw_json jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      create index if not exists signal_episodes_asset_seen_idx on signal_episodes (asset, first_seen_at desc);
    `).then(() => undefined);
  }
  await schemaReady;
}

function upsertMemory(row: SignalHistoryRow) {
  const cutoffMs = row.statusGroup === "active" ? 30 * 60_000 : 60 * 60_000;
  const existing = memoryRows.find((candidate) =>
    candidate.status === "pending" &&
    candidate.asset === row.asset &&
    candidate.setupType === row.setupType &&
    candidate.statusGroup === row.statusGroup &&
    Date.parse(row.firstSeenAt) - Date.parse(candidate.firstSeenAt) < cutoffMs
  );
  if (existing) {
    existing.lastSeenAt = row.lastSeenAt;
    existing.latestScore = row.latestScore;
    existing.finalScore = row.finalScore;
    existing.peakScore = Math.max(existing.peakScore || 0, row.peakScore || 0);
    existing.reason = row.reason;
    existing.mainBlocker = row.mainBlocker;
    return [existing];
  }
  memoryRows = [row, ...memoryRows].slice(0, 120);
  return [row];
}

export async function recordSignalEpisode(input: SignalHistoryInput) {
  if (!eligible(input)) return [];
  const row = rowFromInput(input);
  const pool = db();
  if (!pool) return upsertMemory(row);

  await ensureSignalHistoryTable();
  const existing = await pool.query(
    `
      select *
      from signal_episodes
      where status = 'pending'
        and asset = $1
        and setup_type = $2
        and status_group = $3
        and first_seen_at >= now() - ($4::int * interval '1 minute')
      order by first_seen_at desc
      limit 1
    `,
    [row.asset, row.setupType, row.statusGroup, row.statusGroup === "active" ? 30 : 60],
  );
  if (existing.rows[0]) {
    const updated = await pool.query(
      `
        update signal_episodes
        set
          last_seen_at = $2,
          active_at = case when $3 = 'active' then coalesce(active_at, $2) else active_at end,
          latest_score = $4,
          peak_score = greatest(coalesce(peak_score, $4), $4),
          structure_score = $5,
          flow_score = $6,
          final_score = $4,
          reason = $7,
          main_blocker = $8,
          raw_snapshot_json = $9::jsonb,
          updated_at = now()
        where id = $1
        returning *
      `,
      [existing.rows[0].id, row.lastSeenAt, row.statusGroup, row.finalScore, row.structureScore, row.flowScore, row.reason, row.mainBlocker, JSON.stringify(row.rawSnapshotJson)],
    );
    return updated.rows.map(rowFromDb);
  }

  const inserted = await pool.query(
    `
      insert into signal_episodes (
        id, asset, setup_type, category, direction, status_group,
        first_seen_at, last_seen_at, active_at, status,
        initial_score, peak_score, latest_score, structure_score, flow_score, final_score,
        reference_price, trigger_price, reason, main_blocker, raw_snapshot_json
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb)
      returning *
    `,
    [
      row.id,
      row.asset,
      row.setupType,
      row.category,
      row.direction,
      row.statusGroup,
      row.firstSeenAt,
      row.lastSeenAt,
      row.activeAt,
      row.initialScore,
      row.peakScore,
      row.latestScore,
      row.structureScore,
      row.flowScore,
      row.finalScore,
      row.referencePrice,
      row.triggerPrice,
      row.reason,
      row.mainBlocker,
      JSON.stringify(row.rawSnapshotJson),
    ],
  );
  return inserted.rows.map(rowFromDb);
}

export async function migrateLegacySignalRows() {
  return { migrated: false, insertedCount: 0 };
}

export async function listSignalEpisodes(limit = 100) {
  const pool = db();
  if (!pool) return memoryRows.slice(0, limit);
  await ensureSignalHistoryTable();
  const result = await pool.query(
    `
      select *
      from signal_episodes
      order by first_seen_at desc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 250)],
  );
  return result.rows.map(rowFromDb);
}

export async function signalEpisodeStats(): Promise<SignalHistoryStats> {
  const rows = await listSignalEpisodes(250);
  const resolved = rows.filter((row) => row.status === "resolved");
  const favorable = resolved.filter((row) => (row.maxFavorableMove || 0) > 0).length;
  const averagePeakScore = rows.length
    ? rows.reduce((sum, row) => sum + (row.peakScore || 0), 0) / rows.length
    : null;
  return {
    episodesTracked: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    resolved: resolved.length,
    expired: rows.filter((row) => row.status === "expired").length,
    activeSignalsLogged: rows.filter((row) => row.statusGroup === "active").length,
    nearSignalsLogged: rows.filter((row) => row.statusGroup === "near").length,
    averagePeakScore,
    resolvedEpisodes: resolved.length,
    historicalFavorableMoveRate: resolved.length >= 30 ? favorable / resolved.length : null,
  };
}

export async function updateSignalOutcomes() {
  const rows = await listSignalEpisodes(120);
  return {
    ok: true,
    checkedCount: rows.length,
    updatedCount: 0,
    rows,
    note: "Outcome updater is in safe mode. Signal episodes are grouped; 1h/4h/24h enrichment can be re-enabled after build logs are available.",
  };
}

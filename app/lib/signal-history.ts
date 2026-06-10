import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocalDb = connectionString ? /localhost|127\.0\.0\.1/i.test(connectionString) : false;
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;
let legacyMigrated = false;

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
  if (!connectionString) throw new Error("DATABASE_URL or POSTGRES_URL is required for signal history");
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

function n(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function categoryFor(setupType: SignalSetup): "trade_setup" | "risk_warning" {
  return setupType === "Crowded Long" || setupType === "Crowded Short" ? "risk_warning" : "trade_setup";
}

function directionFor(setupType: SignalSetup): "long" | "short" | "long_squeeze_risk" | "short_squeeze_risk" {
  if (setupType === "Fresh Long") return "long";
  if (setupType === "Fresh Short") return "short";
  if (setupType === "Crowded Long") return "long_squeeze_risk";
  return "short_squeeze_risk";
}

function statusGroup(status: string): "near" | "active" {
  return status === "active" ? "active" : "near";
}

function rowToSignal(row: Record<string, unknown>): SignalHistoryRow {
  const firstSeenAt = new Date(String(row.first_seen_at)).toISOString();
  return {
    id: String(row.id),
    asset: row.asset as SignalAsset,
    setupType: row.setup_type as SignalSetup,
    category: row.category === "risk_warning" ? "risk_warning" : "trade_setup",
    direction: ["long", "short", "long_squeeze_risk", "short_squeeze_risk"].includes(String(row.direction)) ? row.direction as SignalHistoryRow["direction"] : "long",
    statusGroup: row.status_group === "active" ? "active" : "near",
    firstSeenAt,
    lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    activeAt: row.active_at ? new Date(String(row.active_at)).toISOString() : null,
    closedAt: row.closed_at ? new Date(String(row.closed_at)).toISOString() : null,
    timestamp: firstSeenAt,
    status: row.status === "resolved" ? "resolved" : row.status === "expired" ? "expired" : "pending",
    initialScore: n(row.initial_score),
    peakScore: n(row.peak_score),
    latestScore: n(row.latest_score),
    finalScore: n(row.final_score),
    structureScore: n(row.structure_score),
    flowScore: n(row.flow_score),
    referencePrice: n(row.reference_price),
    priceAtSignal: n(row.reference_price),
    triggerPrice: n(row.trigger_price),
    reason: text(row.reason, "No reason captured."),
    mainBlocker: text(row.main_blocker, "No blocker captured."),
    rawSnapshotJson: row.raw_snapshot_json ?? null,
    result1h: n(row.result_1h),
    result4h: n(row.result_4h),
    result24h: n(row.result_24h),
    maxFavorableMove: n(row.max_favorable_move),
    maxAdverseMove: n(row.max_adverse_move),
    outcomeStatus: row.outcome_status === "ready" ? "ready" : row.outcome_status === "partial" ? "partial" : row.outcome_status === "unavailable" ? "unavailable" : "pending",
    outcomeError: row.outcome_error ? String(row.outcome_error) : null,
    outcomeRawJson: row.outcome_raw_json ?? null,
  };
}

export async function ensureSignalHistoryTable() {
  if (!schemaReady) {
    schemaReady = db().query(`
      create table if not exists signal_history (
        id uuid primary key,
        timestamp timestamptz not null,
        minute_bucket timestamptz not null,
        asset text not null,
        setup_type text not null,
        status text not null,
        final_score numeric,
        structure_score numeric,
        flow_score numeric,
        price_at_signal numeric,
        oi_15m numeric,
        oi_4h numeric,
        funding numeric,
        taker_ratio numeric,
        net_flow numeric,
        cvd numeric,
        liquidity_state text,
        direction text,
        result_1h numeric,
        result_4h numeric,
        result_24h numeric,
        max_favorable_move numeric,
        max_adverse_move numeric,
        outcome_status text default 'pending',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      create table if not exists signal_episodes (
        id uuid primary key,
        legacy_key text unique,
        asset text not null,
        setup_type text not null,
        category text not null,
        direction text not null,
        status_group text not null,
        episode_bucket timestamptz not null,
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

      create index if not exists signal_episodes_asset_seen_idx
        on signal_episodes (asset, first_seen_at desc);
      create index if not exists signal_episodes_open_idx
        on signal_episodes (asset, setup_type, status, last_seen_at desc);
      create index if not exists signal_episodes_status_idx
        on signal_episodes (status, outcome_status, first_seen_at desc);
    `).then(() => undefined);
  }
  return schemaReady;
}

async function expireQuietNearEpisodes() {
  await ensureSignalHistoryTable();
  await db().query(`
    update signal_episodes
    set
      status = 'expired',
      closed_at = coalesce(closed_at, now()),
      outcome_status = 'unavailable',
      outcome_error = coalesce(outcome_error, 'expired before activation'),
      updated_at = now()
    where status = 'pending'
      and status_group = 'near'
      and active_at is null
      and last_seen_at < now() - interval '15 minutes'
  `);
}

function isEligible(input: SignalHistoryInput) {
  const score = input.finalScore;
  if (score === null || !Number.isFinite(score)) return false;
  if (input.flowScore === null && !input.allowStructureFallback) return false;
  if (input.status === "active") return true;
  if (input.status === "near" && score >= 75) return true;
  return false;
}

export async function recordSignalEpisode(input: SignalHistoryInput) {
  await ensureSignalHistoryTable();
  await expireQuietNearEpisodes();
  if (!isEligible(input)) return [];

  const seenAt = new Date(input.timestamp);
  const group = statusGroup(input.status);
  const cooldownMinutes = group === "active" ? 30 : 60;
  const baseParams = [input.asset, input.setupType, seenAt.toISOString(), cooldownMinutes];
  const existing = await db().query(
    `
      select *
      from signal_episodes
      where asset = $1
        and setup_type = $2
        and status = 'pending'
        and first_seen_at >= $3::timestamptz - ($4::int * interval '1 minute')
        and ($5::text = 'active' or status_group = $5)
      order by case when status_group = 'near' then 0 else 1 end, first_seen_at desc
      limit 1
    `,
    [...baseParams, group],
  );

  const rawSnapshotJson = JSON.stringify(input.rawSnapshotJson ?? input);
  if (existing.rows[0]) {
    const row = existing.rows[0];
    const nextPeak = Math.max(Number(row.peak_score ?? input.finalScore ?? 0), Number(input.finalScore ?? 0));
    const updated = await db().query(
      `
        update signal_episodes
        set
          status_group = case when $5 = 'active' then 'active' else status_group end,
          last_seen_at = greatest(last_seen_at, $1::timestamptz),
          active_at = case when $5 = 'active' then coalesce(active_at, $1::timestamptz) else active_at end,
          latest_score = $2,
          peak_score = greatest(coalesce(peak_score, $2), $2),
          structure_score = $3,
          flow_score = $4,
          final_score = $2,
          trigger_price = coalesce($6, trigger_price),
          reason = $7,
          main_blocker = $8,
          raw_snapshot_json = $9::jsonb,
          updated_at = now()
        where id = $10
        returning *
      `,
      [
        seenAt.toISOString(),
        input.finalScore,
        input.structureScore,
        input.flowScore,
        group,
        input.triggerPrice ?? null,
        input.reason || "Signal remains in the same episode.",
        input.mainBlocker || "No blocker captured.",
        rawSnapshotJson,
        row.id,
      ],
    );
    updated.rows[0].peak_score = nextPeak;
    return updated.rows.map(rowToSignal);
  }

  const inserted = await db().query(
    `
      insert into signal_episodes (
        id, asset, setup_type, category, direction, status_group, episode_bucket,
        first_seen_at, last_seen_at, active_at, status,
        initial_score, peak_score, latest_score, structure_score, flow_score, final_score,
        reference_price, trigger_price, reason, main_blocker, raw_snapshot_json
      )
      values (
        $1, $2, $3, $4, $5, $6, date_trunc('hour', $7::timestamptz),
        $7, $7, $8, 'pending',
        $9, $9, $9, $10, $11, $9,
        $12, $13, $14, $15, $16::jsonb
      )
      returning *
    `,
    [
      crypto.randomUUID(),
      input.asset,
      input.setupType,
      input.category || categoryFor(input.setupType),
      input.direction || directionFor(input.setupType),
      group,
      seenAt.toISOString(),
      group === "active" ? seenAt.toISOString() : null,
      input.finalScore,
      input.structureScore,
      input.flowScore,
      input.priceAtSignal,
      input.triggerPrice ?? null,
      input.reason || "Signal episode started.",
      input.mainBlocker || "No blocker captured.",
      rawSnapshotJson,
    ],
  );
  return inserted.rows.map(rowToSignal);
}

async function legacyRowsExist() {
  const result = await db().query(`
    select exists (
      select 1
      from information_schema.tables
      where table_name = 'signal_history'
    ) as exists
  `);
  return result.rows[0]?.exists === true;
}

export async function migrateLegacySignalRows() {
  await ensureSignalHistoryTable();
  if (legacyMigrated) return { migrated: false, insertedCount: 0 };
  legacyMigrated = true;
  if (!await legacyRowsExist()) return { migrated: false, insertedCount: 0 };

  const legacy = await db().query(`
    select *
    from signal_history
    where final_score is not null
      and flow_score is not null
      and (status = 'active' or (status = 'near' and final_score >= 75))
      and asset in ('BTC', 'ETH', 'HYPE')
      and setup_type in ('Fresh Long', 'Fresh Short', 'Crowded Long', 'Crowded Short')
    order by timestamp asc
    limit 2000
  `);

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of legacy.rows) {
    const ts = new Date(String(row.timestamp));
    const bucket = new Date(ts);
    bucket.setUTCMinutes(0, 0, 0);
    const key = `${row.asset}|${row.setup_type}|${bucket.toISOString()}`;
    const rows = groups.get(key) || [];
    rows.push(row);
    groups.set(key, rows);
  }

  let insertedCount = 0;
  for (const [key, rows] of groups) {
    const first = rows[0];
    const last = rows[rows.length - 1];
    const setupType = first.setup_type as SignalSetup;
    const activeRow = rows.find((row) => row.status === "active");
    const peakScore = Math.max(...rows.map((row) => Number(row.final_score || 0)).filter(Number.isFinite));
    const result = await db().query(
      `
        insert into signal_episodes (
          id, legacy_key, asset, setup_type, category, direction, status_group, episode_bucket,
          first_seen_at, last_seen_at, active_at, status,
          initial_score, peak_score, latest_score, structure_score, flow_score, final_score,
          reference_price, reason, main_blocker, raw_snapshot_json
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, date_trunc('hour', $8::timestamptz),
          $8, $9, $10, 'pending',
          $11, $12, $13, $14, $15, $13,
          $16, $17, $18, $19::jsonb
        )
        on conflict (legacy_key) do nothing
        returning id
      `,
      [
        crypto.randomUUID(),
        `legacy|${key}`,
        first.asset,
        setupType,
        categoryFor(setupType),
        directionFor(setupType),
        activeRow ? "active" : "near",
        new Date(String(first.timestamp)).toISOString(),
        new Date(String(last.timestamp)).toISOString(),
        activeRow ? new Date(String(activeRow.timestamp)).toISOString() : null,
        n(first.final_score),
        peakScore,
        n(last.final_score),
        n(last.structure_score),
        n(last.flow_score),
        n(first.price_at_signal),
        "Migrated from older raw signal rows.",
        "Legacy rows were grouped into a 60-minute episode.",
        JSON.stringify({ migratedFrom: "signal_history", groupedRows: rows.length, firstId: first.id, lastId: last.id }),
      ],
    );
    insertedCount += result.rowCount || 0;
  }
  return { migrated: true, insertedCount };
}

export async function listSignalEpisodes(limit = 100) {
  await ensureSignalHistoryTable();
  await migrateLegacySignalRows();
  await expireQuietNearEpisodes();
  const result = await db().query(
    `
      select *
      from signal_episodes
      order by first_seen_at desc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 250)],
  );
  return result.rows.map(rowToSignal);
}

export async function signalEpisodeStats(): Promise<SignalHistoryStats> {
  await ensureSignalHistoryTable();
  const result = await db().query(`
    select
      count(*)::int as episodes_tracked,
      count(*) filter (where status = 'pending')::int as pending,
      count(*) filter (where status = 'resolved')::int as resolved,
      count(*) filter (where status = 'expired')::int as expired,
      count(*) filter (where status_group = 'active')::int as active_signals_logged,
      count(*) filter (where status_group = 'near')::int as near_signals_logged,
      avg(peak_score) as average_peak_score,
      count(*) filter (where status = 'resolved')::int as resolved_episodes,
      avg(case when status = 'resolved' and max_favorable_move is not null and max_favorable_move > 0 then 1 else 0 end) filter (where status = 'resolved') as historical_favorable_move_rate
    from signal_episodes
  `);
  const row = result.rows[0] || {};
  const resolvedEpisodes = Number(row.resolved_episodes || 0);
  return {
    episodesTracked: Number(row.episodes_tracked || 0),
    pending: Number(row.pending || 0),
    resolved: Number(row.resolved || 0),
    expired: Number(row.expired || 0),
    activeSignalsLogged: Number(row.active_signals_logged || 0),
    nearSignalsLogged: Number(row.near_signals_logged || 0),
    averagePeakScore: n(row.average_peak_score),
    resolvedEpisodes,
    historicalFavorableMoveRate: resolvedEpisodes >= 30 ? n(row.historical_favorable_move_rate) : null,
  };
}

function pct(from: number | null, to: number | null) {
  if (from === null || to === null || from <= 0) return null;
  return ((to - from) / from) * 100;
}

function directionalPct(direction: SignalHistoryRow["direction"], from: number | null, to: number | null) {
  const move = pct(from, to);
  if (move === null) return null;
  return direction === "short" || direction === "long_squeeze_risk" ? -move : move;
}

function closeAtOrAfter(candles: Array<Record<string, unknown>>, target: number) {
  for (const candle of candles) {
    const time = n(candle.t ?? candle.time);
    const close = n(candle.c ?? candle.close);
    if (time !== null && close !== null && time >= target) return close;
  }
  return null;
}

async function candlesFor(row: SignalHistoryRow) {
  const start = Date.parse(row.firstSeenAt);
  const now = Date.now();
  const end = Math.min(now, start + 24 * 60 * 60 * 1000 + 5 * 60_000);
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: {
        coin: row.asset,
        interval: "1m",
        startTime: start,
        endTime: end,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [];
}

async function updateEpisodeOutcome(row: SignalHistoryRow) {
  if (row.status !== "pending" || row.referencePrice === null) return { row, changed: false };
  const started = Date.parse(row.firstSeenAt);
  const age = Date.now() - started;
  if (age < 60 * 60 * 1000) return { row, changed: false };

  const candles = await candlesFor(row);
  if (!candles.length) {
    const markResolved = age >= 24 * 60 * 60 * 1000;
    const result = await db().query(
      `
        update signal_episodes
        set
          status = case when $2 then 'resolved' else status end,
          closed_at = case when $2 then coalesce(closed_at, now()) else closed_at end,
          outcome_status = 'unavailable',
          outcome_error = 'price data unavailable',
          updated_at = now()
        where id = $1
        returning *
      `,
      [row.id, markResolved],
    );
    return { row: rowToSignal(result.rows[0]), changed: true };
  }

  const close1h = age >= 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 60 * 60 * 1000) : null;
  const close4h = age >= 4 * 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 4 * 60 * 60 * 1000) : null;
  const close24h = age >= 24 * 60 * 60 * 1000 ? closeAtOrAfter(candles, started + 24 * 60 * 60 * 1000) : null;
  const prices = candles.map((candle) => n(candle.c ?? candle.close)).filter((value): value is number => value !== null);
  const moves = prices.map((price) => directionalPct(row.direction, row.referencePrice, price)).filter((value): value is number => value !== null);
  const maxFavorableMove = moves.length ? Math.max(...moves) : null;
  const maxAdverseMove = moves.length ? Math.min(...moves) : null;
  const outcomeStatus: SignalOutcomeStatus =
    age >= 24 * 60 * 60 * 1000 ? (close24h === null ? "unavailable" : "ready") :
    close1h === null ? "unavailable" :
    "partial";
  const status: SignalEpisodeStatus = age >= 24 * 60 * 60 * 1000 ? "resolved" : "pending";
  const raw = {
    direction: row.direction,
    referencePrice: row.referencePrice,
    close1h,
    close4h,
    close24h,
    candlesCount: candles.length,
  };
  const result = await db().query(
    `
      update signal_episodes
      set
        result_1h = coalesce($2, result_1h),
        result_4h = coalesce($3, result_4h),
        result_24h = coalesce($4, result_24h),
        max_favorable_move = coalesce($5, max_favorable_move),
        max_adverse_move = coalesce($6, max_adverse_move),
        outcome_status = $7,
        outcome_error = case when $7 = 'unavailable' then 'price data unavailable' else null end,
        outcome_raw_json = $8::jsonb,
        status = $9,
        closed_at = case when $9 = 'resolved' then coalesce(closed_at, now()) else closed_at end,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      row.id,
      directionalPct(row.direction, row.referencePrice, close1h),
      directionalPct(row.direction, row.referencePrice, close4h),
      directionalPct(row.direction, row.referencePrice, close24h),
      maxFavorableMove,
      maxAdverseMove,
      outcomeStatus,
      JSON.stringify(raw),
      status,
    ],
  );
  return { row: rowToSignal(result.rows[0]), changed: true };
}

export async function updateSignalOutcomes(limit = 80) {
  await ensureSignalHistoryTable();
  await migrateLegacySignalRows();
  const result = await db().query(
    `
      select *
      from signal_episodes
      where status = 'pending'
        and reference_price is not null
        and first_seen_at <= now() - interval '1 hour'
      order by first_seen_at asc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 120)],
  );
  const rows = result.rows.map(rowToSignal);
  const updated = [];
  for (const row of rows) {
    updated.push(await updateEpisodeOutcome(row));
  }
  return {
    ok: true,
    checkedCount: rows.length,
    updatedCount: updated.filter((item) => item.changed).length,
    rows: updated.map((item) => item.row),
  };
}

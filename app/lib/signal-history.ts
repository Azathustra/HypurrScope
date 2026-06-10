import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocalDb = connectionString ? /localhost|127\.0\.0\.1/i.test(connectionString) : false;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export type SignalAsset = "BTC" | "ETH" | "HYPE";
export type SignalSetup = "Fresh Long" | "Fresh Short" | "Crowded Long" | "Crowded Short";

export type SignalHistoryInput = {
  timestamp: string;
  asset: SignalAsset;
  setupType: SignalSetup;
  status: string;
  finalScore: number | null;
  structureScore: number | null;
  flowScore: number | null;
  priceAtSignal: number | null;
  oi15m: number | null;
  oi4h: number | null;
  funding: number | null;
  takerRatio: number | null;
  netFlow: number | null;
  cvd: number | null;
  liquidityState: string;
  direction: "long" | "short";
};

export type SignalHistoryRow = SignalHistoryInput & {
  id: string;
  result1h: number | null;
  result4h: number | null;
  result24h: number | null;
  maxFavorableMove: number | null;
  maxAdverseMove: number | null;
  outcomeStatus: "pending" | "ready" | "unavailable";
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
      create index if not exists signal_history_asset_ts_idx
        on signal_history (asset, timestamp desc);
      create unique index if not exists signal_history_unique_minute_idx
        on signal_history (asset, setup_type, status, minute_bucket);
    `).then(() => undefined);
  }
  return schemaReady;
}

function n(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToSignal(row: Record<string, unknown>): SignalHistoryRow {
  return {
    id: String(row.id),
    timestamp: new Date(String(row.timestamp)).toISOString(),
    asset: row.asset as SignalAsset,
    setupType: row.setup_type as SignalSetup,
    status: String(row.status),
    finalScore: n(row.final_score),
    structureScore: n(row.structure_score),
    flowScore: n(row.flow_score),
    priceAtSignal: n(row.price_at_signal),
    oi15m: n(row.oi_15m),
    oi4h: n(row.oi_4h),
    funding: n(row.funding),
    takerRatio: n(row.taker_ratio),
    netFlow: n(row.net_flow),
    cvd: n(row.cvd),
    liquidityState: String(row.liquidity_state || "unknown"),
    direction: row.direction === "short" ? "short" : "long",
    result1h: n(row.result_1h),
    result4h: n(row.result_4h),
    result24h: n(row.result_24h),
    maxFavorableMove: n(row.max_favorable_move),
    maxAdverseMove: n(row.max_adverse_move),
    outcomeStatus: row.outcome_status === "ready" ? "ready" : row.outcome_status === "unavailable" ? "unavailable" : "pending",
  };
}

export async function insertSignalHistory(input: SignalHistoryInput) {
  await ensureSignalHistoryTable();
  const result = await db().query(
    `
      insert into signal_history (
        id, timestamp, minute_bucket, asset, setup_type, status,
        final_score, structure_score, flow_score, price_at_signal,
        oi_15m, oi_4h, funding, taker_ratio, net_flow, cvd,
        liquidity_state, direction
      )
      values (
        $1, $2, date_trunc('minute', $2::timestamptz), $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17
      )
      on conflict (asset, setup_type, status, minute_bucket)
      do update set
        final_score = excluded.final_score,
        structure_score = excluded.structure_score,
        flow_score = excluded.flow_score,
        price_at_signal = coalesce(signal_history.price_at_signal, excluded.price_at_signal),
        oi_15m = excluded.oi_15m,
        oi_4h = excluded.oi_4h,
        funding = excluded.funding,
        taker_ratio = excluded.taker_ratio,
        net_flow = excluded.net_flow,
        cvd = excluded.cvd,
        liquidity_state = excluded.liquidity_state,
        updated_at = now()
      returning *
    `,
    [
      crypto.randomUUID(),
      input.timestamp,
      input.asset,
      input.setupType,
      input.status,
      input.finalScore,
      input.structureScore,
      input.flowScore,
      input.priceAtSignal,
      input.oi15m,
      input.oi4h,
      input.funding,
      input.takerRatio,
      input.netFlow,
      input.cvd,
      input.liquidityState,
      input.direction,
    ],
  );
  return result.rows.map(rowToSignal);
}

export async function listSignalHistory(limit = 100) {
  await ensureSignalHistoryTable();
  const result = await db().query(
    `
      select *
      from signal_history
      order by timestamp desc
      limit $1
    `,
    [Math.min(Math.max(limit, 1), 250)],
  );
  return result.rows.map(rowToSignal);
}

export async function updateSignalOutcome(id: string, values: Partial<Pick<SignalHistoryRow, "result1h" | "result4h" | "result24h" | "maxFavorableMove" | "maxAdverseMove" | "outcomeStatus">>) {
  await ensureSignalHistoryTable();
  await db().query(
    `
      update signal_history
      set
        result_1h = coalesce($2, result_1h),
        result_4h = coalesce($3, result_4h),
        result_24h = coalesce($4, result_24h),
        max_favorable_move = coalesce($5, max_favorable_move),
        max_adverse_move = coalesce($6, max_adverse_move),
        outcome_status = coalesce($7, outcome_status),
        updated_at = now()
      where id = $1
    `,
    [id, values.result1h ?? null, values.result4h ?? null, values.result24h ?? null, values.maxFavorableMove ?? null, values.maxAdverseMove ?? null, values.outcomeStatus ?? null],
  );
}

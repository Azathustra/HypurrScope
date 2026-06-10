import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocalDb = connectionString ? /localhost|127\.0\.0\.1/i.test(connectionString) : false;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export type SnapshotAsset = "BTC" | "ETH" | "HYPE";

export type MarketSnapshotInput = {
  ts: string;
  asset: SnapshotAsset;
  markPx: number | null;
  fundingRaw: number | null;
  fundingPctHourly: number | null;
  openInterestRaw: number | null;
  openInterestUsdComputed: number | null;
  dayNtlVlm: number | null;
  rawCtx: unknown;
  source: string;
};

export type SnapshotRow = {
  ts: string;
  asset: SnapshotAsset;
  open_interest_usd_computed: string | number | null;
};

export function getSnapshotPool() {
  if (!connectionString) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for persistent market snapshots");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export async function ensureMarketSnapshotsTable() {
  if (!schemaReady) {
    schemaReady = getSnapshotPool().query(`
      create table if not exists market_snapshots (
        id uuid primary key,
        ts timestamptz not null,
        asset text not null,
        minute_bucket timestamptz,
        mark_px numeric,
        funding_raw numeric,
        funding_pct_hourly numeric,
        open_interest_raw numeric,
        open_interest_usd_computed numeric,
        day_ntl_vlm numeric,
        raw_ctx jsonb,
        source text,
        created_at timestamptz default now()
      );
      create index if not exists market_snapshots_asset_ts_desc_idx
        on market_snapshots (asset, ts desc);
      create unique index if not exists market_snapshots_asset_ts_unique_idx
        on market_snapshots (asset, ts);
      alter table market_snapshots
        add column if not exists minute_bucket timestamptz;
      create unique index if not exists market_snapshots_asset_minute_unique_idx
        on market_snapshots (asset, minute_bucket)
        where minute_bucket is not null;
    `).then(() => undefined);
  }
  return schemaReady;
}

export async function insertMarketSnapshot(input: MarketSnapshotInput) {
  await ensureMarketSnapshotsTable();
  return getSnapshotPool().query(
    `
      insert into market_snapshots (
        id,
        ts,
        asset,
        minute_bucket,
        mark_px,
        funding_raw,
        funding_pct_hourly,
        open_interest_raw,
        open_interest_usd_computed,
        day_ntl_vlm,
        raw_ctx,
        source
      )
      values ($1, $2, $3, date_trunc('minute', $2::timestamptz), $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
      on conflict (asset, minute_bucket) where minute_bucket is not null do nothing
    `,
    [
      crypto.randomUUID(),
      input.ts,
      input.asset,
      input.markPx,
      input.fundingRaw,
      input.fundingPctHourly,
      input.openInterestRaw,
      input.openInterestUsdComputed,
      input.dayNtlVlm,
      JSON.stringify(input.rawCtx ?? null),
      input.source,
    ],
  );
}

export async function latestSnapshot(asset: SnapshotAsset) {
  await ensureMarketSnapshotsTable();
  const result = await getSnapshotPool().query<SnapshotRow>(
    `
      select ts, asset, open_interest_usd_computed
      from market_snapshots
      where asset = $1
        and open_interest_usd_computed is not null
      order by ts desc
      limit 1
    `,
    [asset],
  );
  return result.rows[0] || null;
}

export async function earliestSnapshot(asset: SnapshotAsset) {
  await ensureMarketSnapshotsTable();
  const result = await getSnapshotPool().query<SnapshotRow>(
    `
      select ts, asset, open_interest_usd_computed
      from market_snapshots
      where asset = $1
        and open_interest_usd_computed is not null
      order by ts asc
      limit 1
    `,
    [asset],
  );
  return result.rows[0] || null;
}

export async function snapshotAtOrBefore(asset: SnapshotAsset, referenceTs: string, minutesAgo: number) {
  await ensureMarketSnapshotsTable();
  const result = await getSnapshotPool().query<SnapshotRow>(
    `
      select ts, asset, open_interest_usd_computed
      from market_snapshots
      where asset = $1
        and open_interest_usd_computed is not null
        and ts <= ($2::timestamptz - ($3::text || ' minutes')::interval)
      order by ts desc
      limit 1
    `,
    [asset, referenceTs, minutesAgo],
  );
  return result.rows[0] || null;
}

export async function snapshotCount(asset: SnapshotAsset) {
  await ensureMarketSnapshotsTable();
  const result = await getSnapshotPool().query<{ count: string }>(
    `
      select count(*)::text as count
      from (
        select distinct coalesce(minute_bucket, date_trunc('minute', ts)) as minute_bucket
        from market_snapshots
        where asset = $1
          and open_interest_usd_computed is not null
      ) distinct_minutes
    `,
    [asset],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function snapshotTimeline(asset: SnapshotAsset) {
  await ensureMarketSnapshotsTable();
  const result = await getSnapshotPool().query<{ ts: string }>(
    `
      select max(ts) as ts
      from market_snapshots
      where asset = $1
        and open_interest_usd_computed is not null
      group by coalesce(minute_bucket, date_trunc('minute', ts))
      order by max(ts) asc
    `,
    [asset],
  );
  return result.rows.map((row) => new Date(row.ts).toISOString());
}

export function numeric(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

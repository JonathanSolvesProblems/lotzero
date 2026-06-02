import "server-only";
import { newId } from "../ids";

/**
 * Active-active proof: write through one Regional endpoint of a multi-Region
 * *peered* Aurora DSQL cluster, then immediately read it back through the OTHER
 * Region's endpoint. Strong consistency means the value is there, identical, with
 * no replication lag to wait out.
 *
 * Enable by setting DSQL_CLUSTER_ENDPOINT_2 (+ DSQL_REGION_2) to the second peered
 * endpoint. Until then the endpoint reports `configured: false` and the UI explains
 * how to turn it on — nothing here runs against the single-Region demo.
 */

const regionA = () => process.env.DSQL_REGION || process.env.AWS_REGION || "us-east-1";
const regionB = () => process.env.DSQL_REGION_2 || "eu-west-1";
const configured = () => !!(process.env.DSQL_CLUSTER_ENDPOINT && process.env.DSQL_CLUSTER_ENDPOINT_2);

type Pool = {
  query: (t: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};
let pools: { a: Pool; b: Pool } | null = null;

async function getPools(): Promise<{ a: Pool; b: Pool }> {
  if (pools) return pools;
  const { AuroraDSQLPool } = await import("@aws/aurora-dsql-node-postgres-connector");
  const mk = (host: string, region: string) =>
    new (AuroraDSQLPool as unknown as new (cfg: unknown) => Pool)({
      host,
      hostname: host,
      region,
      user: process.env.DSQL_USER || "admin",
      database: process.env.DSQL_DATABASE || "postgres",
      port: 5432,
      ssl: { rejectUnauthorized: true },
      max: 5,
    });
  const a = mk(process.env.DSQL_CLUSTER_ENDPOINT as string, regionA());
  const b = mk(process.env.DSQL_CLUSTER_ENDPOINT_2 as string, regionB());
  // One DDL statement, idempotent.
  await a.query(
    "CREATE TABLE IF NOT EXISTS region_probe (id TEXT PRIMARY KEY, value TEXT, written_region TEXT, written_at TIMESTAMPTZ DEFAULT now())",
  );
  pools = { a, b };
  return pools;
}

export function regionDemoStatus() {
  return { configured: configured(), regionA: regionA(), regionB: regionB() };
}

export interface RegionProbeResult {
  id: string;
  regionA: string;
  regionB: string;
  written: string;
  readBack: string | null;
  consistent: boolean;
  writeMs: number;
  readMs: number;
}

export async function crossRegionProbe(): Promise<RegionProbeResult> {
  if (!configured()) throw new Error("Two-Region demo is not configured");
  const { a, b } = await getPools();
  const id = newId("probe");
  const value = newId("v").replace("v_", "");

  const t0 = Date.now();
  await a.query("INSERT INTO region_probe (id, value, written_region) VALUES ($1,$2,$3)", [id, value, regionA()]);
  const writeMs = Date.now() - t0;

  const t1 = Date.now();
  const { rows } = await b.query("SELECT value FROM region_probe WHERE id = $1", [id]);
  const readMs = Date.now() - t1;

  const readBack = rows[0] ? String(rows[0].value) : null;
  return {
    id,
    regionA: regionA(),
    regionB: regionB(),
    written: value,
    readBack,
    consistent: readBack === value,
    writeMs,
    readMs,
  };
}

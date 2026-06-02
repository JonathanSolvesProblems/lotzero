import "server-only";
import { SCHEMA_SQL, LOCAL_INDEXES_SQL } from "./schema";

/**
 * One data-access surface, two backends:
 *
 *   - Aurora DSQL (production): the official `@aws/aurora-dsql-node-postgres-connector`
 *     gives a drop-in pg Pool that mints IAM auth tokens automatically (works with
 *     Vercel OIDC, no static secrets). DSQL uses optimistic concurrency control:
 *     conflicting transactions fail with an OCC error and MUST be retried. `tx()`
 *     does exactly that via the connector's `isOCCError`.
 *
 *   - PGlite (local dev / CI): an embedded WASM Postgres. It runs the identical SQL
 *     and transaction logic with zero setup, so the bid/settlement code you read is
 *     the code that runs in production.
 *
 * Switch is purely by env: set DSQL_CLUSTER_ENDPOINT to use Aurora DSQL.
 */

export type SqlParam = string | number | boolean | null;
export interface Querier {
  query(text: string, params?: SqlParam[]): Promise<{ rows: Record<string, unknown>[] }>;
}
export interface Db extends Querier {
  tx<T>(fn: (q: Querier) => Promise<T>): Promise<T>;
  mode: "dsql" | "pglite";
}

const MAX_OCC_RETRIES = 8;
const usingDsql = () => !!process.env.DSQL_CLUSTER_ENDPOINT;

// ---- singleton (survives Next.js HMR) ------------------------------------
const g = globalThis as unknown as { __lotzeroDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__lotzeroDb) g.__lotzeroDb = usingDsql() ? initDsql() : initPglite();
  return g.__lotzeroDb;
}

// ---- Aurora DSQL backend --------------------------------------------------
async function initDsql(): Promise<Db> {
  const { AuroraDSQLPool, isOCCError } = await import(
    "@aws/aurora-dsql-node-postgres-connector"
  );

  // The connector accepts pg.Pool config plus DSQL coordinates. It generates a
  // fresh IAM token per connection using the ambient AWS credentials.
  const pool = new (AuroraDSQLPool as unknown as new (cfg: unknown) => {
    query: (t: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
    connect: () => Promise<{
      query: (t: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
      release: () => void;
    }>;
  })({
    host: process.env.DSQL_CLUSTER_ENDPOINT,
    hostname: process.env.DSQL_CLUSTER_ENDPOINT,
    region: process.env.AWS_REGION || process.env.DSQL_REGION || "us-east-1",
    user: process.env.DSQL_USER || "admin",
    database: process.env.DSQL_DATABASE || "postgres",
    port: 5432,
    ssl: { rejectUnauthorized: true },
    max: 20,
  });

  const db: Db = {
    mode: "dsql",
    query: (text, params) => pool.query(text, params),
    async tx<T>(fn: (q: Querier) => Promise<T>): Promise<T> {
      for (let attempt = 0; ; attempt++) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("COMMIT");
          return result;
        } catch (err) {
          try {
            await client.query("ROLLBACK");
          } catch {
            /* connection already gone */
          }
          // OCC conflict => safe to retry the whole transaction.
          if (isOCCError(err) && attempt < MAX_OCC_RETRIES) {
            await sleep(2 ** attempt + Math.floor(jitter()));
            continue;
          }
          throw err;
        } finally {
          client.release();
        }
      }
    },
  };

  await db.query(SCHEMA_SQL);
  return db;
}

// ---- PGlite backend -------------------------------------------------------
async function initPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(); // in-memory

  await pg.exec(SCHEMA_SQL);
  await pg.exec(LOCAL_INDEXES_SQL);

  const db: Db = {
    mode: "pglite",
    query: (text, params) =>
      pg.query(text, params as unknown[]) as Promise<{
        rows: Record<string, unknown>[];
      }>,
    async tx<T>(fn: (q: Querier) => Promise<T>): Promise<T> {
      // PGlite serializes transactions; OCC retry is a no-op but kept for parity.
      return (await pg.transaction(async (txn) => {
        return fn({
          query: (t, p) =>
            txn.query(t, p as unknown[]) as Promise<{
              rows: Record<string, unknown>[];
            }>,
        });
      })) as T;
    },
  };

  // Auto-seed so the app is alive on first load with zero setup.
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Tiny deterministic-ish jitter without Math.random (kept import-safe).
let jitterState = 7;
function jitter(): number {
  jitterState = (jitterState * 1103515245 + 12345) & 0x7fffffff;
  return jitterState % 5;
}

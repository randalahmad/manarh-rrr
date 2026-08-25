/**
 * Server-side Neon database client.
 *
 * Uses `@neondatabase/serverless`'s HTTP-based `neon()` client — a single
 * query is a single HTTPS request with no connection pool to manage, which
 * fits Next.js's serverless/edge-friendly Route Handlers and Server
 * Actions. For writes that touch more than one table and must be atomic
 * (e.g. "assign an evaluator AND move the idea to UNDER_EVALUATION"), the
 * `transaction()` helper wraps the driver's own non-interactive
 * `sql.transaction()`.
 *
 * This module is the ONLY place that constructs a database connection.
 * Every service imports `query` / `queryOne` / `transaction` from here
 * rather than importing `@neondatabase/serverless` directly, so tests can
 * mock this module's exports instead of talking to a real database.
 */
import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";
import { getEnv } from "./env";

// Route through fetch (not WebSockets) — the right default for short-lived
// serverless invocations; avoids holding an open socket across requests.
neonConfig.poolQueryViaFetch = true;

let sqlClient: NeonQueryFunction<false, false> | undefined;

function getClient(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    sqlClient = neon(getEnv().DATABASE_URL);
  }
  return sqlClient;
}

/**
 * Run a parameterized SQL statement (`$1, $2, ...` placeholders — never
 * string-interpolate values into `sqlText`) and return all rows.
 */
export async function query<T = Record<string, unknown>>(
  sqlText: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getClient();
  const rows = await client.query(sqlText, params);
  return rows as unknown as T[];
}

/** Run a query and return the first row, or null if there were none. */
export async function queryOne<T = Record<string, unknown>>(
  sqlText: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows[0] ?? null;
}

/**
 * Run a batch of parameterized statements as a single atomic,
 * non-interactive Postgres transaction (all-or-nothing). Use for
 * multi-table writes where partial application would leave data
 * inconsistent — e.g. inserting an `idea_status_history` row alongside the
 * `ideas.status` update, or writing an `audit_logs` row alongside the
 * mutation it's auditing.
 *
 * Statements run in array order and see each other's writes within the
 * same transaction, but (per the underlying driver) later statements
 * cannot branch on earlier statements' *results* — this is a batch, not an
 * interactive session. That's sufficient for every write in this codebase:
 * callers compute any values a later statement needs (ids, timestamps)
 * before calling `transaction()`, rather than reading a prior statement's
 * result mid-transaction.
 */
export async function transaction<T extends unknown[] = Record<string, unknown>[][]>(
  statements: { sql: string; params?: unknown[] }[]
): Promise<T> {
  const client = getClient();
  const results = await client.transaction((txn) =>
    statements.map((s) => txn.query(s.sql, s.params ?? []))
  );
  return results as unknown as T;
}

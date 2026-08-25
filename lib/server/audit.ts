/**
 * Audit logging for sensitive mutations, writing into the append-only
 * `audit_logs` table (Phase 4). Mirrors the fields the mock's `logAction`
 * already writes (lib/store.tsx) — action, actionAr, entityType, entityId,
 * previousState, newState, permissionSnapshot — plus the request metadata
 * columns Phase 4's schema added (ip_address, device) that the mock never
 * populated (it had no real request to read them from).
 *
 * Call `writeAuditLog` from within the SAME transaction as the mutation it
 * describes wherever the service uses `transaction()` for its write, so
 * the audit row can never exist without the mutation (or vice versa).
 * Where a service's write is a single statement, call it immediately
 * after the write succeeds.
 */
import { query, transaction } from "@/lib/server/db";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface AuditLogInput {
  organizationId: string;
  actor: Actor;
  /** Short machine/human action label, e.g. "Idea Status Changed". */
  action: string;
  actionAr: string;
  entityType: string;
  entityId: string;
  previousState?: string | null;
  newState?: string | null;
  permissionSnapshot?: string | null;
  decisionDetails?: string | null;
  sensitiveView?: boolean;
  /** Request metadata — pass through from the Server Action / Route Handler when available. */
  ipAddress?: string;
  device?: string;
}

const UNKNOWN = "unknown";

export function auditLogStatement(input: AuditLogInput): { sql: string; params: unknown[] } {
  return {
    sql: `
      INSERT INTO audit_logs (
        organization_id, user_id, user_name, action, action_ar, entity_type, entity_id,
        previous_state, new_state, permission_snapshot, decision_details, sensitive_view,
        ip_address, device, readonly
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)
    `,
    params: [
      input.organizationId,
      input.actor.userId,
      input.actor.email,
      input.action,
      input.actionAr,
      input.entityType,
      input.entityId,
      input.previousState ?? null,
      input.newState ?? null,
      input.permissionSnapshot ?? null,
      input.decisionDetails ?? null,
      input.sensitiveView ?? false,
      input.ipAddress ?? UNKNOWN,
      input.device ?? UNKNOWN,
    ],
  };
}

/** Fire-and-included write for the (less common) case a service isn't already inside a `transaction()` call for its mutation. */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const stmt = auditLogStatement(input);
  await query(stmt.sql, stmt.params);
}

/** Run a mutation and its audit log entry atomically. `mutate` receives nothing and returns the statements needed for the mutation itself; this helper appends the audit statement and runs everything as one transaction. */
export async function withAudit<T extends unknown[]>(
  mutationStatements: { sql: string; params?: unknown[] }[],
  auditInput: AuditLogInput
): Promise<T> {
  const audit = auditLogStatement(auditInput);
  return transaction<T>([...mutationStatements, audit]);
}

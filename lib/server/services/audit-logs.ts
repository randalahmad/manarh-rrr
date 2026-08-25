/**
 * Audit log read service. The `audit_logs` table itself is append-only —
 * every write to it happens as a statement embedded in another service's
 * own transaction (via lib/server/audit.ts), never through a standalone
 * "create audit log" mutation exposed here. This file is read-only by
 * design, matching the catalog's AUDIT area having only a VIEW action
 * (p48) — there is no AUDIT:CREATE/EDIT because nothing should ever
 * directly author an audit entry outside of another action's own side
 * effect.
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface AuditLogRow {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  action: string;
  action_ar: string;
  entity_type: string;
  entity_id: string;
  previous_state: string | null;
  new_state: string | null;
  permission_snapshot: string | null;
  sensitive_view: boolean;
  decision_details: string | null;
  ip_address: string;
  device: string;
  readonly: boolean;
  timestamp: string;
}

export interface ListAuditLogsFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

export async function listAuditLogs(
  actor: Actor,
  organizationId: string,
  filters: ListAuditLogsFilters = {}
): Promise<AuditLogRow[]> {
  requirePermission(actor, organizationId, "AUDIT", "VIEW");

  const conditions = ["organization_id = $1"];
  const params: unknown[] = [organizationId];
  if (filters.entityType) {
    params.push(filters.entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (filters.entityId) {
    params.push(filters.entityId);
    conditions.push(`entity_id = $${params.length}`);
  }
  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`user_id = $${params.length}`);
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);

  return query<AuditLogRow>(
    `SELECT * FROM audit_logs WHERE ${conditions.join(" AND ")} ORDER BY "timestamp" DESC LIMIT ${limit}`,
    params
  );
}

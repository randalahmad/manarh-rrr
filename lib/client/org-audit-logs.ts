/**
 * Client-side data layer for the Org Admin Audit Logs page
 * (`app/org/audit-logs/page.tsx`). Mirrors `lib/client/org-notifications.ts`'s
 * pattern: a narrow, additive data source backed by the already-real,
 * already-tested `listAuditLogsAction` (lib/server/actions/audit-logs.ts) —
 * this file adds no backend logic, only maps the existing DB row shape to
 * the UI's existing `AuditLog` type (lib/types.ts), which already matches
 * the mock shape this page used to render.
 */
import type { AuditLog } from "@/lib/types";
import { listAuditLogsAction } from "@/lib/mock-server/actions/audit-logs";
import type { AuditLogRow } from "@/lib/server/services/audit-logs";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    actionAr: row.action_ar,
    entityType: row.entity_type,
    entityId: row.entity_id,
    previousState: row.previous_state ?? undefined,
    newState: row.new_state ?? undefined,
    permissionSnapshot: row.permission_snapshot ?? undefined,
    sensitiveView: row.sensitive_view,
    decisionDetails: row.decision_details ?? undefined,
    ipAddress: row.ip_address,
    device: row.device,
    readonly: row.readonly,
  };
}

export async function fetchOrgAuditLogs(organizationId: string): Promise<AuditLog[]> {
  const rows = unwrap(await listAuditLogsAction({ organizationId, limit: 500 }));
  return rows.map(mapAuditLogRow);
}

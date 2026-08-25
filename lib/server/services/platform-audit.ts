/**
 * Platform-level audit read — Super Admin minimal implementation
 * (Phase 6). Reuses the EXISTING `audit_logs` table (no new table — every
 * platform-admin mutation in lib/server/services/platform-organizations.ts
 * already writes into it via lib/server/audit.ts's writeAuditLog) rather
 * than building a dedicated platform-audit table, since every approved
 * platform action has a natural target organization_id and audit_logs
 * already models exactly that shape.
 *
 * Rows written by a platform-admin action are tagged with a
 * "PLATFORM:"-prefixed permission_snapshot (e.g. "PLATFORM:ORG_CREATE") —
 * this is the ONLY filter used here. It lets a platform admin see a
 * cross-organization feed of platform-scoped actions WITHOUT exposing an
 * organization's full internal audit trail (idea reviews, evaluations,
 * decisions — every org-scoped mutation's own audit rows have a
 * permission_snapshot like "IDEA:EDIT" or no prefix at all, and are simply
 * never matched by the LIKE below). Selects a conservative column set —
 * deliberately omits decision_details/sensitive_view/attachment_ids, which
 * exist on this table for org-scoped entity actions and are never
 * populated by platform actions, per "do not expose confidential entity
 * content unnecessarily."
 */
import { query } from "@/lib/server/db";
import { requirePlatformAdmin } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface PlatformAuditLogRow {
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
  timestamp: string;
}

const PLATFORM_AUDIT_COLUMNS =
  'id, organization_id, user_id, user_name, action, action_ar, entity_type, entity_id, previous_state, new_state, permission_snapshot, "timestamp"';

export async function listPlatformAuditLogs(actor: Actor, limit = 100): Promise<PlatformAuditLogRow[]> {
  requirePlatformAdmin(actor);

  const cappedLimit = Math.min(Math.max(limit, 1), 500);

  return query<PlatformAuditLogRow>(
    `
    SELECT ${PLATFORM_AUDIT_COLUMNS}
    FROM audit_logs
    WHERE permission_snapshot LIKE 'PLATFORM:%'
    ORDER BY "timestamp" DESC
    LIMIT $1
    `,
    [cappedLimit]
  );
}

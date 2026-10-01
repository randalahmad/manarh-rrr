/**
 * Org Admin dashboard — a single, additive, read-only aggregate needed by
 * the dashboard that no existing service exposes: an organization-wide
 * impact-measurement count. Every other dashboard stat (total ideas,
 * approval rate, active projects, pending decisions, overdue evaluations,
 * open information requests) is computed client-side from data already
 * fetched through existing, unmodified real actions
 * (listIdeasAction/listProjectsAction/etc. via lib/client/org-*.ts).
 *
 * `impact_measurements` has no organization_id column — it hangs off a
 * project or an idea (lib/server/services/measurements.ts's own
 * resolveSubjectOrg does the same one-row lookup for a single subject; this
 * is the same join, applied across the whole organization instead of one
 * subject at a time). Mirrors that file's permission gate (IMPACT:VIEW)
 * exactly — no new permission invented.
 */
import { queryOne } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";

export async function getOrgImpactMeasurementCount(actor: Actor, organizationId: string): Promise<number> {
  requirePermission(actor, organizationId, "IMPACT", "VIEW");

  const row = await queryOne<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM impact_measurements im
    LEFT JOIN projects p ON im.project_id = p.id
    LEFT JOIN ideas i ON im.idea_id = i.id
    WHERE COALESCE(p.organization_id, i.organization_id) = $1
    `,
    [organizationId]
  );
  return Number(row?.count ?? 0);
}

/**
 * Org-wide impact-measurement listing for the Org Admin Impact page
 * (`app/org/impact/page.tsx`). Same join pattern as
 * lib/server/services/org-dashboard.ts's count (that one only needed a
 * COUNT for a stat card; this page needs the full rows), gated by the same
 * IMPACT:VIEW permission.
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ImpactMeasurementRow } from "@/lib/server/services/measurements";

export async function listImpactMeasurementsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<ImpactMeasurementRow[]> {
  requirePermission(actor, organizationId, "IMPACT", "VIEW");
  return query<ImpactMeasurementRow>(
    `SELECT im.* FROM impact_measurements im
     LEFT JOIN projects p ON p.id = im.project_id
     LEFT JOIN ideas i ON i.id = im.idea_id
     WHERE COALESCE(p.organization_id, i.organization_id) = $1
     ORDER BY im.measured_at DESC`,
    [organizationId]
  );
}

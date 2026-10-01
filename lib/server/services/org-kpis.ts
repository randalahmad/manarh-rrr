/**
 * Org-wide KPI listing for the Org Admin KPIs page (`app/org/kpis/page.tsx`).
 * `lib/server/services/measurements.ts`'s `listKpisForSubject` requires a
 * specific project/idea/strategic-goal id — this aggregates the same rows
 * across every subject in the organization via a join, gated by the same
 * KPI:VIEW permission (no new permission).
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { KpiRow } from "@/lib/server/services/measurements";

export async function listKpisForOrganization(actor: Actor, organizationId: string): Promise<KpiRow[]> {
  requirePermission(actor, organizationId, "KPI", "VIEW");
  return query<KpiRow>(
    `SELECT k.* FROM kpis k
     LEFT JOIN projects p ON p.id = k.project_id
     LEFT JOIN ideas i ON i.id = k.idea_id
     LEFT JOIN strategic_goals g ON g.id = k.strategic_goal_id
     WHERE COALESCE(p.organization_id, i.organization_id, g.organization_id) = $1
     ORDER BY k.created_at DESC`,
    [organizationId]
  );
}

/**
 * Client-side data layer for the Org Admin KPIs page (`app/org/kpis/page.tsx`).
 * `baselineValue`/`description`/`measurementPeriod*` have no column on the
 * real `kpis` table (db/migrations/0006) — left undefined, not fabricated.
 */
import type { KPI } from "@/lib/types";
import { listOrgKpisAction } from "@/lib/server/actions/org-kpis";
import type { KpiRow } from "@/lib/server/services/measurements";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapKpiRow(row: KpiRow): KPI {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    ideaId: row.idea_id ?? undefined,
    strategicGoalId: row.strategic_goal_id ?? undefined,
    name: row.name,
    unit: row.unit,
    targetValue: Number(row.target_value),
    currentValue: Number(row.current_value),
    ownerId: row.owner_id ?? undefined,
    progressPercentage: row.target_value ? Math.round((Number(row.current_value) / Number(row.target_value)) * 100) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOrgKpis(organizationId: string): Promise<KPI[]> {
  const rows = unwrap(await listOrgKpisAction({ organizationId }));
  return rows.map(mapKpiRow);
}

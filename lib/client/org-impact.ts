/**
 * Client-side data layer for the Org Admin Impact page (`app/org/impact/page.tsx`).
 */
import type { ImpactMeasurement } from "@/lib/types";
import { listOrgImpactMeasurementsAction } from "@/lib/server/actions/org-impact";
import type { ImpactMeasurementRow } from "@/lib/server/services/measurements";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapImpactRow(row: ImpactMeasurementRow): ImpactMeasurement {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    ideaId: row.idea_id ?? undefined,
    type: row.type,
    description: row.description,
    baselineValue: row.baseline_value ?? undefined,
    targetValue: row.target_value ?? undefined,
    actualValue: row.actual_value ?? undefined,
    unit: row.unit ?? undefined,
    measuredAt: row.measured_at,
    measuredBy: row.measured_by,
  };
}

export async function fetchOrgImpactMeasurements(organizationId: string): Promise<ImpactMeasurement[]> {
  const rows = unwrap(await listOrgImpactMeasurementsAction({ organizationId }));
  return rows.map(mapImpactRow);
}

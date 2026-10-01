/**
 * Client-side data layer for the Org Admin Innovation Register page
 * (`app/org/innovation-register/page.tsx`).
 */
import type { InnovationRecord } from "@/lib/types";
import { listInnovationRecordsAction } from "@/lib/mock-server/actions/innovation-register";
import type { InnovationRecordWithImpact } from "@/lib/server/services/innovation-register";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapRecordRow(row: InnovationRecordWithImpact): InnovationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ideaId: row.idea_id,
    projectId: row.project_id ?? undefined,
    finalStatus: row.final_status,
    outcome: row.outcome ?? undefined,
    impactMeasurementIds: row.impact_measurement_ids,
    closedAt: row.closed_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}

export async function fetchOrgInnovationRegister(organizationId: string): Promise<InnovationRecord[]> {
  const rows = unwrap(await listInnovationRecordsAction({ organizationId }));
  return rows.map(mapRecordRow);
}

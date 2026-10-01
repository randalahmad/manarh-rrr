/**
 * Client-side data layer for the Org Admin Risks page (`app/org/risks/page.tsx`).
 * Reuses the existing, unmodified updateRiskAction for the "close" mutation.
 */
import type { ProjectRisk } from "@/lib/types";
import { listOrgRisksAction } from "@/lib/mock-server/actions/org-risks";
import { updateRiskAction } from "@/lib/mock-server/actions/risks";
import type { ProjectRiskRow } from "@/lib/server/services/risks";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapRiskRow(row: ProjectRiskRow): ProjectRisk {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    level: row.level,
    status: row.status,
    ownerId: row.owner_id ?? undefined,
    mitigationPlan: row.mitigation_plan ?? undefined,
    blocker: row.blocker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOrgRisks(organizationId: string): Promise<ProjectRisk[]> {
  const rows = unwrap(await listOrgRisksAction({ organizationId }));
  return rows.map(mapRiskRow);
}

export async function closeOrgRisk(riskId: string): Promise<ProjectRisk> {
  return mapRiskRow(unwrap(await updateRiskAction({ riskId, status: "CLOSED" })));
}

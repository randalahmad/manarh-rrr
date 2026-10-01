/**
 * Client-side data layer for the Org Admin Reports page (`app/org/reports/page.tsx`).
 */
import type { IdeaStatusHistory } from "@/lib/types";
import { listOrgIdeaStatusHistoryAction } from "@/lib/server/actions/org-reports";
import type { IdeaStatusHistoryRow } from "@/lib/server/services/ideas";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapHistoryRow(row: IdeaStatusHistoryRow): IdeaStatusHistory {
  return {
    id: row.id,
    ideaId: row.idea_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    note: row.note ?? undefined,
  };
}

export async function fetchOrgIdeaStatusHistory(organizationId: string): Promise<IdeaStatusHistory[]> {
  const rows = unwrap(await listOrgIdeaStatusHistoryAction({ organizationId }));
  return rows.map(mapHistoryRow);
}

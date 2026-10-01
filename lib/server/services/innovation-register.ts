/**
 * Innovation Register — read-only listing for the Org Admin Innovation
 * Register page (`app/org/innovation-register/page.tsx`), which only ever
 * displayed records (no create/edit UI existed in the mock version — a
 * record there was created automatically as a side effect of an idea
 * reaching a terminal status, which stays out of scope here since that
 * would mean changing the existing, already-tested idea-transition service
 * rather than adding new code). Gated by REPORT:VIEW (this is a read-only
 * register/report view, same category as app/org/reports).
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaStatus } from "@/lib/types";

export interface InnovationRecordRow {
  id: string;
  organization_id: string;
  idea_id: string;
  project_id: string | null;
  final_status: IdeaStatus;
  outcome: string | null;
  closed_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface InnovationRecordWithImpact extends InnovationRecordRow {
  impact_measurement_ids: string[];
}

export async function listInnovationRecordsForOrganization(
  actor: Actor,
  organizationId: string
): Promise<InnovationRecordWithImpact[]> {
  requirePermission(actor, organizationId, "REPORT", "VIEW");

  const [records, impactRows] = await Promise.all([
    query<InnovationRecordRow>(
      `SELECT * FROM innovation_records WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    ),
    query<{ innovation_record_id: string; impact_measurement_id: string }>(
      `SELECT irim.innovation_record_id, irim.impact_measurement_id
       FROM innovation_record_impact_measurements irim
       JOIN innovation_records ir ON ir.id = irim.innovation_record_id
       WHERE ir.organization_id = $1`,
      [organizationId]
    ),
  ]);

  const impactByRecord = new Map<string, string[]>();
  for (const row of impactRows) {
    impactByRecord.set(row.innovation_record_id, [
      ...(impactByRecord.get(row.innovation_record_id) ?? []),
      row.impact_measurement_id,
    ]);
  }

  return records.map((r) => ({ ...r, impact_measurement_ids: impactByRecord.get(r.id) ?? [] }));
}

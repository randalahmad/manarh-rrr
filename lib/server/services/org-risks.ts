/**
 * Org-wide risk listing for the Org Admin Risks page
 * (`app/org/risks/page.tsx`). `lib/server/services/risks.ts` only lists
 * risks for a single project (`listRisksForProject`) — this is the same
 * read, aggregated across every project in the organization via a join,
 * gated by the same RISK area (VIEW, per the seeded catalog) rather than a
 * new permission. Mutating a risk (the page's "إغلاق"/close action) reuses
 * the existing, unmodified `updateRiskAction` — no new write path here.
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRiskRow } from "@/lib/server/services/risks";

export async function listRisksForOrganization(actor: Actor, organizationId: string): Promise<ProjectRiskRow[]> {
  requirePermission(actor, organizationId, "RISK", "VIEW");
  return query<ProjectRiskRow>(
    `SELECT pr.* FROM project_risks pr
     JOIN projects p ON p.id = pr.project_id
     WHERE p.organization_id = $1
     ORDER BY pr.created_at DESC`,
    [organizationId]
  );
}

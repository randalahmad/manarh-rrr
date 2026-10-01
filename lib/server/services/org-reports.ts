/**
 * Org-wide idea-status-history listing for the Org Admin Reports page
 * (`app/org/reports/page.tsx`), which feeds `lib/selectors.ts`'s
 * `averageStageDays` (a pure function over the whole array, grouped by
 * idea id internally — it needs every idea's history at once, not one
 * idea at a time like the existing `listStatusHistoryForIdea`). Gated by
 * REPORT:VIEW, the same permission this whole page already requires.
 */
import { query } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaStatusHistoryRow } from "@/lib/server/services/ideas";

export async function listIdeaStatusHistoryForOrganization(
  actor: Actor,
  organizationId: string
): Promise<IdeaStatusHistoryRow[]> {
  requirePermission(actor, organizationId, "REPORT", "VIEW");
  return query<IdeaStatusHistoryRow>(
    `SELECT ish.* FROM idea_status_history ish
     JOIN ideas i ON i.id = ish.idea_id
     WHERE i.organization_id = $1
     ORDER BY ish.changed_at ASC`,
    [organizationId]
  );
}

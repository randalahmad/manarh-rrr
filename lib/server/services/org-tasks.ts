/**
 * Org-wide project-task listing for the Org Admin "My Tasks" page
 * (`app/org/my-tasks/page.tsx`), which for ORG_ADMIN shows every task
 * across the organization (not just the signed-in user's own — see the
 * mock's own `t.assigneeId===currentUser.id||currentUser.role==="ORG_ADMIN"`
 * condition). Mirrors `lib/server/services/tasks.ts`'s `listTasksForProject`
 * exactly — same `requireOrgMembership`-only gate (TASK has no dedicated
 * VIEW permission in the catalog; that existing function doesn't check one
 * either), just aggregated across every project in the org via a join.
 */
import { query } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectTaskRow } from "@/lib/server/services/tasks";

export async function listTasksForOrganization(actor: Actor, organizationId: string): Promise<ProjectTaskRow[]> {
  requireOrgMembership(actor, organizationId);
  return query<ProjectTaskRow>(
    `SELECT pt.* FROM project_tasks pt
     JOIN projects p ON p.id = pt.project_id
     WHERE p.organization_id = $1
     ORDER BY pt.created_at DESC`,
    [organizationId]
  );
}

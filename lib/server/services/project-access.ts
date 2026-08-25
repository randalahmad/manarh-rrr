/**
 * Project-level authorization helper — the ownership/membership boundary
 * for INTERNAL_INNOVATOR / EXTERNAL_INNOVATOR writes to a project or its
 * sub-resources (Final QA / Full Integration Audit, Critical Issue 1:
 * `docs/architecture/manarah-final-integration-audit.md` §11, §16).
 *
 * Problem: `projects.ts`, `tasks.ts`, `milestones.ts`, `requirements.ts`,
 * `project-members.ts`, and `project-updates.ts` all gated mutations on a
 * class-level `requirePermission(actor, orgId, "PROJECT"/"TASK", action)`
 * with no per-row check against the SPECIFIC project — unlike `ideas.ts`,
 * which additionally requires `idea.submitter_id === actor.userId`
 * (ideas.ts:172-174) before letting a plain-role actor mutate a specific
 * row. Because INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR hold org-wide
 * `PROJECT:CREATE/EDIT` and `TASK:CREATE/EDIT` grants (see
 * db/migrations/0010_rbac_seed.sql), an innovator could mutate ANY project
 * in their organization, not just one connected to their own idea.
 *
 * Fix: mirror the ideas.ts pattern. For ORG_ADMIN, INNOVATION_SPECIALIST,
 * and PROJECT_MANAGER — who are meant to manage projects org-wide, exactly
 * as before — nothing changes: `requirePermission` alone still authorizes
 * them. For INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR specifically, this adds
 * one more check: the actor must have a REAL, non-fabricated relationship
 * to the specific project being mutated — either they submitted the idea
 * the project was converted from (`projects.idea_id` -> `ideas.submitter_id`,
 * the exact same relationship the Innovator interface's own "my projects"
 * list already uses — see
 * components/innovator-src/features/projects/services/projectService.ts's
 * `NeonProjectService.list()` comment), or they are a `project_members` row
 * for it (the real "stakeholder" relationship — see
 * db/migrations/0005_project_delivery.sql). No new role, no new permission,
 * no schema change — this only adds an existing-data instance check on top
 * of the existing (area, action) class check.
 */
import { queryOne } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth/guards";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor, ActorMembership, PermissionArea, PermissionAction } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

/** Roles that require a per-project ownership/membership check in addition to the org-wide (area, action) grant. ORG_ADMIN/INNOVATION_SPECIALIST/PROJECT_MANAGER are unaffected — their existing org-wide access to these areas is unchanged. */
const ROLES_REQUIRING_PROJECT_ASSOCIATION: ReadonlySet<ActorMembership["role"]> = new Set([
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
]);

/**
 * True if `actor` submitted the idea that `projectId` was converted from,
 * or is a `project_members` row on it. Two queries, not a join, so each
 * check independently short-circuits and is easy to unit test in
 * isolation (mirrors how evaluations.ts checks `idea_evaluator_assignments`
 * as its own separate query rather than folding it into the idea lookup).
 */
async function isProjectAssociate(actor: Actor, project: ProjectRow): Promise<boolean> {
  const idea = await queryOne<{ submitter_id: string }>(`SELECT submitter_id FROM ideas WHERE id = $1`, [
    project.idea_id,
  ]);
  if (idea && idea.submitter_id === actor.userId) return true;

  const member = await queryOne<{ id: string }>(
    `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [project.id, actor.userId]
  );
  return Boolean(member);
}

/**
 * Authorization for a mutation against an EXISTING project or one of its
 * sub-resources. Same class-level `requirePermission` check as before,
 * PLUS — only for INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR — a per-row
 * ownership/membership check against `project`. Throws ForbiddenError
 * (never a different error) so callers can't distinguish "wrong org",
 * "wrong permission", and "not your project" by error type, matching how
 * ideas.ts's ownership check also throws a plain ForbiddenError.
 */
export async function requireProjectAccess(
  actor: Actor,
  project: ProjectRow,
  area: PermissionArea,
  action: PermissionAction
): Promise<ActorMembership> {
  const membership = requirePermission(actor, project.organization_id, area, action);
  if (ROLES_REQUIRING_PROJECT_ASSOCIATION.has(membership.role)) {
    const associated = await isProjectAssociate(actor, project);
    if (!associated) {
      throw new ForbiddenError("You do not have access to this project.");
    }
  }
  return membership;
}

/**
 * Authorization for CONVERTING an idea into a new project
 * (`createProjectFromIdea`) — there is no `ProjectRow` yet, so the
 * per-row check is against the idea being converted instead: an
 * INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR may only convert their OWN idea,
 * mirroring `ideas.ts`'s `submitter_id !== actor.userId` ownership rule
 * exactly (idea.submitter_id is the same field, same check).
 */
export function requireIdeaOwnershipForProjectCreation(
  membership: ActorMembership,
  actor: Actor,
  idea: { submitter_id: string }
): void {
  if (ROLES_REQUIRING_PROJECT_ASSOCIATION.has(membership.role) && idea.submitter_id !== actor.userId) {
    throw new ForbiddenError("You can only convert your own idea into a project.");
  }
}

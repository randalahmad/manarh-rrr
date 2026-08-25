/**
 * Projects domain service — creation from an approved idea, reads, and the
 * canonical project status workflow (the user's explicitly-supplied graph
 * in lib/server/workflow/project-status.ts).
 *
 * Conversion precondition (createProjectFromIdea): the mock's
 * `convertToProject` enforces NO status precondition in code at all — it's
 * UI-gated only (only reachable from a button shown on APPROVED-ish ideas).
 * Rather than invent a new rule here, this reuses the ALREADY-APPROVED idea
 * transition graph (lib/server/workflow/idea-status.ts): `IDEA_TRANSITIONS`
 * already defines the only three legal predecessors of CONVERTED_TO_PROJECT
 * as APPROVED, CONDITIONALLY_APPROVED, and IDEA_DEVELOPMENT. Gating
 * conversion on `canTransitionIdea(idea.status, "CONVERTED_TO_PROJECT")` is
 * simply applying that existing, approved graph to this action — the same
 * function transitionIdeaStatus() already uses — not a new invented rule.
 * This resolves the "idea->project conversion precondition" open question
 * from the Phase 5 research notes without guessing a rule that isn't
 * already on the books.
 *
 * Archiving deviates from the mock deliberately: the mock's
 * `archiveProject` calls `updateProjectStatus(id, "ARCHIVED", ...)`
 * unconditionally from any status. The user's explicit, later-supplied
 * project transition graph makes ARCHIVED reachable only from CLOSED (via
 * the linear chain). Per "do not allow arbitrary project status changes,"
 * the user's graph is authoritative here and supersedes the mock's
 * permissive behavior — `archiveProject` below is a thin, permission-
 * scoped wrapper over the same graph-checked `transitionProjectStatus`, so
 * archiving from any other status is correctly rejected.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requirePermission, requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError, InvalidTransitionError } from "@/lib/server/errors";
import { canTransitionIdea } from "@/lib/server/workflow/idea-status";
import { resolveProjectTransition } from "@/lib/server/workflow/project-status";
import { auditLogStatement } from "@/lib/server/audit";
import { createNotificationStatement } from "@/lib/server/services/notifications";
import { requireProjectAccess, requireIdeaOwnershipForProjectCreation } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { ProjectStatus } from "@/lib/types";

export interface ProjectRow {
  id: string;
  organization_id: string;
  idea_id: string;
  challenge_id: string | null;
  opportunity_id: string | null;
  name: string;
  description: string;
  owner_id: string;
  status: ProjectStatus;
  previous_active_status: ProjectStatus | null;
  progress: number;
  budget: number | null;
  baseline: number | null;
  actual_cost: number | null;
  start_date: string;
  expected_completion_date: string;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProjectById(actor: Actor, projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  requireOrgMembership(actor, project.organization_id);
  return project;
}

export async function listProjectsForOrganization(
  actor: Actor,
  organizationId: string,
  filters: { status?: ProjectStatus; ownerId?: string } = {}
): Promise<ProjectRow[]> {
  requireOrgMembership(actor, organizationId);
  const conditions = ["organization_id = $1"];
  const params: unknown[] = [organizationId];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.ownerId) {
    params.push(filters.ownerId);
    conditions.push(`owner_id = $${params.length}`);
  }
  return query<ProjectRow>(
    `SELECT * FROM projects WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
}

export interface ProjectOwnerCandidate {
  id: string;
  fullName: string;
}

/**
 * Phase 6, Group D addition — candidate project owners for the "تحويل إلى
 * مشروع" modal (app/org/decisions/[id]/page.tsx), which previously read the
 * mock `d.users.filter(u => ["PROJECT_MANAGER","INNOVATION_SPECIALIST","ORG_ADMIN"].includes(u.role))`
 * (see the removed mock modal, pre-Group-C-rewrite). That role list is
 * copied verbatim here — not a newly invented rule — mirroring how
 * `listEvaluatorCandidates` (evaluator-assignments.ts) ported its own
 * mock role filter. Gated on PROJECT:CREATE, the same permission
 * `createProjectFromIdea` itself requires.
 */
export async function listProjectOwnerCandidates(
  actor: Actor,
  organizationId: string
): Promise<ProjectOwnerCandidate[]> {
  requirePermission(actor, organizationId, "PROJECT", "CREATE");
  return query<ProjectOwnerCandidate>(
    `
    SELECT om.user_id AS id, COALESCE(u.name, u.email) AS "fullName"
    FROM organization_memberships om
    JOIN neon_auth.user u ON u.id = om.user_id
    WHERE om.organization_id = $1
      AND om.membership_status = 'ACTIVE'
      AND om.role IN ('PROJECT_MANAGER', 'INNOVATION_SPECIALIST', 'ORG_ADMIN')
    ORDER BY "fullName"
    `,
    [organizationId]
  );
}

export interface CreateProjectFromIdeaInput {
  organizationId: string;
  ideaId: string;
  name: string;
  description: string;
  ownerId: string;
  startDate: string;
  expectedCompletionDate: string;
  budget?: number;
}

/**
 * Authorization: PROJECT:CREATE in the idea's organization.
 * Enforces: idea belongs to the target organization (cross-org guard),
 * idea's status legally transitions to CONVERTED_TO_PROJECT (see file
 * header), and UNIQUE(projects.idea_id) — one idea converts to at most one
 * project (schema-enforced; surfaced here as a clean ConflictError).
 */
export async function createProjectFromIdea(
  actor: Actor,
  input: CreateProjectFromIdeaInput
): Promise<ProjectRow> {
  const membership = requirePermission(actor, input.organizationId, "PROJECT", "CREATE");

  const idea = await queryOne<IdeaRow>(`SELECT * FROM ideas WHERE id = $1`, [input.ideaId]);
  if (!idea) throw new NotFoundError("Idea", input.ideaId);
  if (idea.organization_id !== input.organizationId) {
    throw new NotFoundError("Idea", input.ideaId);
  }
  // Final QA audit, Critical Issue 1: an innovator holding org-wide
  // PROJECT:CREATE may only convert their OWN idea — see
  // lib/server/services/project-access.ts's header for the full rationale.
  requireIdeaOwnershipForProjectCreation(membership, actor, idea);

  if (!canTransitionIdea(idea.status, "CONVERTED_TO_PROJECT")) {
    throw new InvalidTransitionError(
      `An idea in status ${idea.status} cannot be converted to a project.`,
      { from: idea.status }
    );
  }

  const existingProject = await queryOne(`SELECT id FROM projects WHERE idea_id = $1`, [input.ideaId]);
  if (existingProject) {
    throw new ConflictError("This idea has already been converted to a project.");
  }

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `
        INSERT INTO projects (
          organization_id, idea_id, challenge_id, opportunity_id, name, description,
          owner_id, status, progress, budget, baseline, actual_cost,
          start_date, expected_completion_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PROJECT_CREATED',0,$8,0,0,$9,$10)
        RETURNING *
      `,
      params: [
        input.organizationId,
        input.ideaId,
        idea.challenge_id,
        idea.opportunity_id,
        input.name,
        input.description,
        input.ownerId,
        input.budget ?? null,
        input.startDate,
        input.expectedCompletionDate,
      ],
    },
  ];

  const results = await transaction<[ProjectRow[], ...unknown[]]>(statements);
  const project = results[0][0];
  if (!project) throw new ConflictError("Project creation did not apply.");

  // Idea side effect (status + project_id link) is written as a second
  // atomic group keyed off the now-known project id, mirroring the mock's
  // convertToProject which updates both the new project and the source
  // idea as one logical operation.
  await transaction([
    {
      sql: `UPDATE ideas SET project_id = $1, status = 'CONVERTED_TO_PROJECT', updated_at = now() WHERE id = $2`,
      params: [project.id, input.ideaId],
    },
    {
      sql: `INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, note) VALUES ($1,$2,'CONVERTED_TO_PROJECT',$3,$4)`,
      params: [input.ideaId, idea.status, actor.userId, `Converted to project: ${input.name}`],
    },
    createNotificationStatement({
      organizationId: input.organizationId,
      recipientId: idea.submitter_id,
      title: "Your idea became a project",
      message: `Your idea "${idea.title}" has been converted into the project "${input.name}".`,
      entityType: "PROJECT",
      entityId: project.id,
    }),
    auditLogStatement({
      organizationId: input.organizationId,
      actor,
      action: "Project Created",
      actionAr: "إنشاء مشروع من فكرة",
      entityType: "PROJECT",
      entityId: project.id,
      newState: idea.id,
      permissionSnapshot: "PROJECT:CREATE",
    }),
  ]);

  return project;
}

export interface UpdateProjectDetailsInput {
  name?: string;
  description?: string;
  ownerId?: string;
  budget?: number;
  baseline?: number;
  actualCost?: number;
  startDate?: string;
  expectedCompletionDate?: string;
}

/** Non-status field updates. Authorization: PROJECT:EDIT. */
export async function updateProjectDetails(
  actor: Actor,
  projectId: string,
  patch: UpdateProjectDetailsInput
): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const sets: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, unknown> = {
    name: patch.name,
    description: patch.description,
    owner_id: patch.ownerId,
    budget: patch.budget,
    baseline: patch.baseline,
    actual_cost: patch.actualCost,
    start_date: patch.startDate,
    expected_completion_date: patch.expectedCompletionDate,
  };
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) return project;

  params.push(projectId);
  const [rows] = await transaction<[ProjectRow[], unknown[]]>([
    {
      sql: `UPDATE projects SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params,
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Project Updated",
      actionAr: "تعديل بيانات مشروع",
      entityType: "PROJECT",
      entityId: projectId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Project update did not apply.");
  return updated;
}

/**
 * The canonical project status transition, per lib/server/workflow/project-status.ts
 * (the user's explicit graph). Authorization: PROJECT:ARCHIVE when the
 * destination is ARCHIVED (matching the permission catalog's dedicated
 * p29 ARCHIVE action for exactly this transition), PROJECT:EDIT otherwise.
 * Persists `previous_active_status` per the approved decision that leaving
 * BLOCKED/ON_HOLD must restore the exact prior status.
 */
export async function transitionProjectStatus(
  actor: Actor,
  projectId: string,
  toStatus: ProjectStatus,
  note?: string
): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);

  const permissionAction = toStatus === "ARCHIVED" ? "ARCHIVE" : "EDIT";
  await requireProjectAccess(actor, project, "PROJECT", permissionAction);

  const resolution = resolveProjectTransition(project.status, toStatus, project.previous_active_status);
  if (!resolution) {
    throw new InvalidTransitionError(
      `Cannot move a project from ${project.status} to ${toStatus}.`,
      { from: project.status, to: toStatus, previousActiveStatus: project.previous_active_status }
    );
  }

  const isCompleting = resolution.nextStatus === "COMPLETED";
  const setClauses = ["status = $1", "updated_at = now()"];
  const params: unknown[] = [resolution.nextStatus];

  if (resolution.nextPreviousActiveStatus !== undefined) {
    params.push(resolution.nextPreviousActiveStatus);
    setClauses.push(`previous_active_status = $${params.length}`);
  }
  if (isCompleting) {
    setClauses.push(`progress = 100`, `actual_completion_date = now()`);
  }

  params.push(projectId);

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `UPDATE projects SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params,
    },
    {
      sql: `
        INSERT INTO project_updates (project_id, author_id, update_type, content)
        VALUES ($1,$2,'STATUS_CHANGE',$3)
      `,
      params: [projectId, actor.userId, note ?? `Status changed to ${resolution.nextStatus}`],
    },
    createNotificationStatement({
      organizationId: project.organization_id,
      recipientId: project.owner_id,
      title: "Project status updated",
      message: `The project "${project.name}" status changed to ${resolution.nextStatus}.`,
      entityType: "PROJECT",
      entityId: projectId,
    }),
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Project Status Updated",
      actionAr: "تحديث حالة مشروع",
      entityType: "PROJECT",
      entityId: projectId,
      previousState: project.status,
      newState: resolution.nextStatus,
      permissionSnapshot: `PROJECT:${permissionAction}`,
    }),
  ];

  const results = await transaction<[ProjectRow[], ...unknown[]]>(statements);
  const updated = results[0][0];
  if (!updated) throw new ConflictError("Project status update did not apply.");
  return updated;
}

/** Convenience wrapper: archive a project. Only legal from CLOSED per the canonical graph (see file header re: deviation from the mock's unconditional archive). */
export async function archiveProject(actor: Actor, projectId: string): Promise<ProjectRow> {
  return transitionProjectStatus(actor, projectId, "ARCHIVED", "Project archived.");
}

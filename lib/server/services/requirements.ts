/**
 * Project requirements domain service.
 * Authorization: PROJECT:EDIT — no dedicated REQUIREMENT permission area
 * exists in the catalog (the mock never wires an add/update form for this
 * at all, see Phase 5 research notes); per the approved Phase 5 decision,
 * ungated project sub-resources use PROJECT:EDIT.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { requireProjectAccess } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectRequirementRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

async function loadProjectOrThrow(projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export interface CreateRequirementInput {
  projectId: string;
  title: string;
  description: string;
  dueDate?: string;
}

export async function createRequirement(
  actor: Actor,
  input: CreateRequirementInput
): Promise<ProjectRequirementRow> {
  const project = await loadProjectOrThrow(input.projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const [rows] = await transaction<[ProjectRequirementRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO project_requirements (project_id, title, description, due_date)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      params: [input.projectId, input.title, input.description, input.dueDate ?? null],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Requirement Created",
      actionAr: "إضافة متطلب",
      entityType: "PROJECT",
      entityId: input.projectId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const requirement = rows[0];
  if (!requirement) throw new ConflictError("Requirement creation did not apply.");
  return requirement;
}

export async function updateRequirementStatus(
  actor: Actor,
  requirementId: string,
  status: ProjectRequirementRow["status"]
): Promise<ProjectRequirementRow> {
  const requirement = await queryOne<ProjectRequirementRow>(
    `SELECT * FROM project_requirements WHERE id = $1`,
    [requirementId]
  );
  if (!requirement) throw new NotFoundError("Requirement", requirementId);
  const project = await loadProjectOrThrow(requirement.project_id);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const [rows] = await transaction<[ProjectRequirementRow[], unknown[]]>([
    {
      sql: `UPDATE project_requirements SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [status, requirementId],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Requirement Updated",
      actionAr: "تحديث متطلب",
      entityType: "PROJECT",
      entityId: requirement.project_id,
      previousState: requirement.status,
      newState: status,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Requirement update did not apply.");
  return updated;
}

export async function listRequirementsForProject(
  actor: Actor,
  projectId: string
): Promise<ProjectRequirementRow[]> {
  const project = await loadProjectOrThrow(projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectRequirementRow>(
    `SELECT * FROM project_requirements WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );
}

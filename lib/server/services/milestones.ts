/**
 * Project milestones domain service.
 * Authorization: PROJECT:EDIT — no dedicated MILESTONE permission area
 * exists in the approved catalog (this is dead code in the mock — zero
 * call sites anywhere, see Phase 5 research notes), so per the approved
 * Phase 5 decision, project sub-resources with no existing gate use
 * PROJECT:EDIT rather than inventing a new area.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { requireProjectAccess } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectMilestoneRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  created_at: string;
  updated_at: string;
}

async function loadProjectOrThrow(projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
}

export async function createMilestone(actor: Actor, input: CreateMilestoneInput): Promise<ProjectMilestoneRow> {
  const project = await loadProjectOrThrow(input.projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const [rows] = await transaction<[ProjectMilestoneRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO project_milestones (project_id, title, description, due_date)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      params: [input.projectId, input.title, input.description ?? null, input.dueDate],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Milestone Created",
      actionAr: "إضافة معلم رئيسي",
      entityType: "PROJECT",
      entityId: input.projectId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const milestone = rows[0];
  if (!milestone) throw new ConflictError("Milestone creation did not apply.");
  return milestone;
}

export async function updateMilestoneStatus(
  actor: Actor,
  milestoneId: string,
  status: ProjectMilestoneRow["status"]
): Promise<ProjectMilestoneRow> {
  const milestone = await queryOne<ProjectMilestoneRow>(`SELECT * FROM project_milestones WHERE id = $1`, [
    milestoneId,
  ]);
  if (!milestone) throw new NotFoundError("Milestone", milestoneId);
  const project = await loadProjectOrThrow(milestone.project_id);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const [rows] = await transaction<[ProjectMilestoneRow[], unknown[]]>([
    {
      sql: `UPDATE project_milestones SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [status, milestoneId],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Milestone Updated",
      actionAr: "تحديث معلم رئيسي",
      entityType: "PROJECT",
      entityId: milestone.project_id,
      previousState: milestone.status,
      newState: status,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Milestone update did not apply.");
  return updated;
}

export async function listMilestonesForProject(actor: Actor, projectId: string): Promise<ProjectMilestoneRow[]> {
  const project = await loadProjectOrThrow(projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectMilestoneRow>(
    `SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date ASC`,
    [projectId]
  );
}

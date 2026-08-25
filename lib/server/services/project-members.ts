/**
 * Project members domain service.
 *
 * Authorization (approved Phase 5 decision): project sub-resources with no
 * existing permission gate in the mock (members, requirements, milestones,
 * updates) are gated under PROJECT:EDIT — the catalog's existing "managing
 * the project" permission (p28, "إدارة المشروع") — rather than inventing a
 * new permission area.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { requireProjectAccess } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role_in_project: string;
  added_at: string;
}

async function loadProjectOrThrow(projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export async function addProjectMember(
  actor: Actor,
  projectId: string,
  userId: string,
  roleInProject: string
): Promise<ProjectMemberRow> {
  const project = await loadProjectOrThrow(projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const existing = await queryOne(`SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`, [
    projectId,
    userId,
  ]);
  if (existing) throw new ConflictError("This user is already a member of this project.");

  const [rows] = await transaction<[ProjectMemberRow[], unknown[]]>([
    {
      sql: `INSERT INTO project_members (project_id, user_id, role_in_project) VALUES ($1,$2,$3) RETURNING *`,
      params: [projectId, userId, roleInProject],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Project Member Added",
      actionAr: "إضافة عضو للمشروع",
      entityType: "PROJECT",
      entityId: projectId,
      newState: userId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const member = rows[0];
  if (!member) throw new ConflictError("Adding the project member did not apply.");
  return member;
}

export async function removeProjectMember(actor: Actor, projectId: string, userId: string): Promise<void> {
  const project = await loadProjectOrThrow(projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  await transaction([
    { sql: `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, params: [projectId, userId] },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Project Member Removed",
      actionAr: "إزالة عضو من المشروع",
      entityType: "PROJECT",
      entityId: projectId,
      previousState: userId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);
}

export async function listProjectMembers(actor: Actor, projectId: string): Promise<ProjectMemberRow[]> {
  const project = await loadProjectOrThrow(projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectMemberRow>(`SELECT * FROM project_members WHERE project_id = $1 ORDER BY added_at ASC`, [
    projectId,
  ]);
}

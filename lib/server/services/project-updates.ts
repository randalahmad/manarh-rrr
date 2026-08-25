/**
 * Project updates/notes domain service ("project_updates" table).
 * Authorization: PROJECT:EDIT — no dedicated permission area exists for
 * this either (the mock's `addProjectUpdateNote` has no live call site),
 * per the approved Phase 5 decision for ungated project sub-resources.
 * `transitionProjectStatus` in projects.ts already writes its own
 * STATUS_CHANGE row directly as part of its atomic transaction — this
 * service covers the other update_type values (NOTE, MILESTONE,
 * TIMELINE_CHANGE) added directly by a project member.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { requireProjectAccess } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectUpdateRow {
  id: string;
  project_id: string;
  author_id: string;
  update_type: "STATUS_CHANGE" | "NOTE" | "MILESTONE" | "TIMELINE_CHANGE";
  content: string;
  created_at: string;
}

export interface AddProjectUpdateInput {
  projectId: string;
  updateType: "NOTE" | "MILESTONE" | "TIMELINE_CHANGE";
  content: string;
}

export async function addProjectUpdate(actor: Actor, input: AddProjectUpdateInput): Promise<ProjectUpdateRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [input.projectId]);
  if (!project) throw new NotFoundError("Project", input.projectId);
  await requireProjectAccess(actor, project, "PROJECT", "EDIT");

  const [rows] = await transaction<[ProjectUpdateRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO project_updates (project_id, author_id, update_type, content)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      params: [input.projectId, actor.userId, input.updateType, input.content],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Project Update Added",
      actionAr: "إضافة تحديث مشروع",
      entityType: "PROJECT",
      entityId: input.projectId,
      permissionSnapshot: "PROJECT:EDIT",
    }),
  ]);

  const update = rows[0];
  if (!update) throw new ConflictError("Adding the project update did not apply.");
  return update;
}

export async function listProjectUpdates(actor: Actor, projectId: string): Promise<ProjectUpdateRow[]> {
  const project = await queryOne<ProjectRow>(`SELECT organization_id FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectUpdateRow>(`SELECT * FROM project_updates WHERE project_id = $1 ORDER BY created_at DESC`, [
    projectId,
  ]);
}

/**
 * Project tasks domain service.
 *
 * Authorization: TASK:CREATE / TASK:EDIT / TASK:ASSIGN — these ARE real,
 * dedicated permission areas already in the approved catalog (p30-p33),
 * unlike requirements/milestones/updates/members which have none. Using
 * them directly (rather than falling back to PROJECT:EDIT) is applying
 * already-approved grants, not inventing anything, even though the mock's
 * UI never actually calls a permission check before addProjectTask /
 * updateProjectTask (see Phase 5 research notes) — the same posture already
 * taken for ideas.ts/evaluations.ts: the catalog entry existing and being
 * seeded with real role grants is itself the approval.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ConflictError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { createNotificationStatement } from "@/lib/server/services/notifications";
import { requireProjectAccess } from "@/lib/server/services/project-access";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { ProjectRow } from "@/lib/server/services/projects";

export interface ProjectTaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

async function loadProjectOrThrow(projectId: string): Promise<ProjectRow> {
  const project = await queryOne<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: ProjectTaskRow["priority"];
  dueDate?: string;
}

export async function createTask(actor: Actor, input: CreateTaskInput): Promise<ProjectTaskRow> {
  const project = await loadProjectOrThrow(input.projectId);
  await requireProjectAccess(actor, project, "TASK", "CREATE");

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `
        INSERT INTO project_tasks (project_id, title, description, assignee_id, priority, due_date)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      params: [
        input.projectId,
        input.title,
        input.description ?? null,
        input.assigneeId ?? null,
        input.priority ?? "MEDIUM",
        input.dueDate ?? null,
      ],
    },
  ];
  if (input.assigneeId) {
    statements.push(
      createNotificationStatement({
        organizationId: project.organization_id,
        recipientId: input.assigneeId,
        title: "A task has been assigned to you",
        message: `You've been assigned the task "${input.title}" on "${project.name}".`,
        entityType: "TASK",
        entityId: input.projectId,
      })
    );
  }
  statements.push(
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Task Created",
      actionAr: "إنشاء مهمة",
      entityType: "PROJECT",
      entityId: input.projectId,
      permissionSnapshot: "TASK:CREATE",
    })
  );

  const results = await transaction<[ProjectTaskRow[], ...unknown[]]>(statements);
  const task = results[0][0];
  if (!task) throw new ConflictError("Task creation did not apply.");
  return task;
}

/** Generic field update (title/description/priority/dueDate). Authorization: TASK:EDIT. */
export async function updateTaskStatus(
  actor: Actor,
  taskId: string,
  status: ProjectTaskRow["status"]
): Promise<ProjectTaskRow> {
  const task = await queryOne<ProjectTaskRow>(`SELECT * FROM project_tasks WHERE id = $1`, [taskId]);
  if (!task) throw new NotFoundError("Task", taskId);
  const project = await loadProjectOrThrow(task.project_id);
  await requireProjectAccess(actor, project, "TASK", "EDIT");

  const [rows] = await transaction<[ProjectTaskRow[], unknown[]]>([
    {
      sql: `UPDATE project_tasks SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [status, taskId],
    },
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Task Status Updated",
      actionAr: "تحديث حالة مهمة",
      entityType: "PROJECT",
      entityId: task.project_id,
      previousState: task.status,
      newState: status,
      permissionSnapshot: "TASK:EDIT",
    }),
  ]);

  const updated = rows[0];
  if (!updated) throw new ConflictError("Task status update did not apply.");
  return updated;
}

/** Reassign a task's assignee. Authorization: TASK:ASSIGN (distinct from generic EDIT, matching the catalog's dedicated p33 action). */
export async function assignTask(actor: Actor, taskId: string, assigneeId: string | null): Promise<ProjectTaskRow> {
  const task = await queryOne<ProjectTaskRow>(`SELECT * FROM project_tasks WHERE id = $1`, [taskId]);
  if (!task) throw new NotFoundError("Task", taskId);
  const project = await loadProjectOrThrow(task.project_id);
  await requireProjectAccess(actor, project, "TASK", "ASSIGN");

  const statements: { sql: string; params?: unknown[] }[] = [
    {
      sql: `UPDATE project_tasks SET assignee_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      params: [assigneeId, taskId],
    },
  ];
  if (assigneeId) {
    statements.push(
      createNotificationStatement({
        organizationId: project.organization_id,
        recipientId: assigneeId,
        title: "A task has been assigned to you",
        message: `You've been assigned the task "${task.title}".`,
        entityType: "TASK",
        entityId: task.project_id,
      })
    );
  }
  statements.push(
    auditLogStatement({
      organizationId: project.organization_id,
      actor,
      action: "Task Assigned",
      actionAr: "تعيين مهمة",
      entityType: "PROJECT",
      entityId: task.project_id,
      newState: assigneeId,
      permissionSnapshot: "TASK:ASSIGN",
    })
  );

  const results = await transaction<[ProjectTaskRow[], ...unknown[]]>(statements);
  const updated = results[0][0];
  if (!updated) throw new ConflictError("Task assignment did not apply.");
  return updated;
}

export async function listTasksForProject(actor: Actor, projectId: string): Promise<ProjectTaskRow[]> {
  const project = await loadProjectOrThrow(projectId);
  requireOrgMembership(actor, project.organization_id);
  return query<ProjectTaskRow>(`SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY created_at DESC`, [
    projectId,
  ]);
}

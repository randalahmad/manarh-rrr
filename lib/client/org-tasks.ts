/**
 * Client-side data layer for the Org Admin "My Tasks" page
 * (`app/org/my-tasks/page.tsx`).
 */
import type { ProjectTask } from "@/lib/types";
import { listOrgTasksAction } from "@/lib/mock-server/actions/org-tasks";
import type { ProjectTaskRow } from "@/lib/server/services/tasks";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapTaskRow(row: ProjectTaskRow): ProjectTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOrgTasks(organizationId: string): Promise<ProjectTask[]> {
  const rows = unwrap(await listOrgTasksAction({ organizationId }));
  return rows.map(mapTaskRow);
}

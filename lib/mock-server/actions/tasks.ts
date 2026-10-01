"use server";
import { ok } from "@/lib/mock-server/result";
import { projectTaskRows } from "@/lib/mock-server/fixtures";

export async function createTaskAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectTaskRows[0], ...i, id: `task-mock-${Date.now()}`, status: "TODO" as const });
}

export async function updateTaskStatusAction(input: unknown) {
  const { taskId, id, status } = (input ?? {}) as { taskId?: string; id?: string; status?: string };
  const found = projectTaskRows.find((t) => t.id === (taskId ?? id)) ?? projectTaskRows[0];
  return ok({ ...found, status: (status as typeof found.status) ?? found.status });
}

export async function assignTaskAction(input: unknown) {
  const { taskId, id, assigneeId } = (input ?? {}) as { taskId?: string; id?: string; assigneeId?: string };
  const found = projectTaskRows.find((t) => t.id === (taskId ?? id)) ?? projectTaskRows[0];
  return ok({ ...found, assignee_id: assigneeId ?? found.assignee_id });
}

export async function listTasksForProjectAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectTaskRows.filter((t) => !projectId || t.project_id === projectId));
}

"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  listTasksForProjectSchema,
} from "@/lib/server/validation/schemas";
import {
  createTask,
  updateTaskStatus,
  assignTask,
  listTasksForProject,
  type ProjectTaskRow,
} from "@/lib/server/services/tasks";

export async function createTaskAction(input: unknown): Promise<ActionResult<ProjectTaskRow>> {
  return runAction(async () => {
    const parsed = createTaskSchema.parse(input);
    const actor = await requireActiveUser();
    return createTask(actor, parsed);
  });
}

export async function updateTaskStatusAction(input: unknown): Promise<ActionResult<ProjectTaskRow>> {
  return runAction(async () => {
    const parsed = updateTaskStatusSchema.parse(input);
    const actor = await requireActiveUser();
    return updateTaskStatus(actor, parsed.taskId, parsed.status);
  });
}

export async function assignTaskAction(input: unknown): Promise<ActionResult<ProjectTaskRow>> {
  return runAction(async () => {
    const parsed = assignTaskSchema.parse(input);
    const actor = await requireActiveUser();
    return assignTask(actor, parsed.taskId, parsed.assigneeId);
  });
}

/** Phase 6, Group E addition — Phase 5 built listTasksForProject as a service only; no UI consumed it yet. */
export async function listTasksForProjectAction(input: unknown): Promise<ActionResult<ProjectTaskRow[]>> {
  return runAction(async () => {
    const parsed = listTasksForProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listTasksForProject(actor, parsed.projectId);
  });
}

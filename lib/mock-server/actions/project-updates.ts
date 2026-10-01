"use server";
import { ok } from "@/lib/mock-server/result";
import { projectUpdateRows } from "@/lib/mock-server/fixtures";

export async function addProjectUpdateAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectUpdateRows[0], ...i, id: `upd-mock-${Date.now()}` });
}

export async function listProjectUpdatesAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectUpdateRows.filter((u) => !projectId || u.project_id === projectId));
}

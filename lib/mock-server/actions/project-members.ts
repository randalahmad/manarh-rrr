"use server";
import { ok } from "@/lib/mock-server/result";
import { projectMemberRows } from "@/lib/mock-server/fixtures";

export async function addProjectMemberAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectMemberRows[0], ...i, id: `pm-mock-${Date.now()}` });
}

export async function removeProjectMemberAction(_input: unknown) {
  return ok(null);
}

export async function listProjectMembersAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectMemberRows.filter((m) => !projectId || m.project_id === projectId));
}

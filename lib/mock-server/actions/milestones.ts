"use server";
import { ok } from "@/lib/mock-server/result";
import { projectMilestoneRows } from "@/lib/mock-server/fixtures";

export async function createMilestoneAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectMilestoneRows[0], ...i, id: `ms-mock-${Date.now()}`, status: "PENDING" as const });
}

export async function updateMilestoneStatusAction(input: unknown) {
  const { milestoneId, id, status } = (input ?? {}) as { milestoneId?: string; id?: string; status?: string };
  const found = projectMilestoneRows.find((m) => m.id === (milestoneId ?? id)) ?? projectMilestoneRows[0];
  return ok({ ...found, status: (status as typeof found.status) ?? found.status });
}

export async function listMilestonesForProjectAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectMilestoneRows.filter((m) => !projectId || m.project_id === projectId));
}

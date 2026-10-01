"use server";
import { ok } from "@/lib/mock-server/result";
import { projectRequirementRows } from "@/lib/mock-server/fixtures";

export async function createRequirementAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectRequirementRows[0], ...i, id: `req-mock-${Date.now()}`, status: "PENDING" as const });
}

export async function updateRequirementStatusAction(input: unknown) {
  const { requirementId, id, status } = (input ?? {}) as { requirementId?: string; id?: string; status?: string };
  const found = projectRequirementRows.find((r) => r.id === (requirementId ?? id)) ?? projectRequirementRows[0];
  return ok({ ...found, status: (status as typeof found.status) ?? found.status });
}

export async function listRequirementsForProjectAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectRequirementRows.filter((r) => !projectId || r.project_id === projectId));
}

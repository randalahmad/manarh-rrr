"use server";
import { ok } from "@/lib/mock-server/result";
import { projectRiskRows } from "@/lib/mock-server/fixtures";

export async function createRiskAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...projectRiskRows[0], ...i, id: `risk-mock-${Date.now()}`, status: "OPEN" as const });
}

export async function updateRiskAction(input: unknown) {
  const { riskId, id, ...rest } = (input ?? {}) as Record<string, unknown> & { riskId?: string; id?: string };
  const found = projectRiskRows.find((r) => r.id === (riskId ?? id)) ?? projectRiskRows[0];
  return ok({ ...found, ...rest });
}

export async function listRisksForProjectAction(input: unknown) {
  const { projectId } = (input ?? {}) as { projectId?: string };
  return ok(projectRiskRows.filter((r) => !projectId || r.project_id === projectId));
}

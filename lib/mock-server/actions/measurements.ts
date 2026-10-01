"use server";
import { ok } from "@/lib/mock-server/result";
import { kpiRows, impactMeasurementRows } from "@/lib/mock-server/fixtures";

export async function createKpiAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...kpiRows[0], ...i, id: `kpi-mock-${Date.now()}` });
}

export async function updateKpiValueAction(input: unknown) {
  const { kpiId, id, currentValue } = (input ?? {}) as { kpiId?: string; id?: string; currentValue?: number };
  const found = kpiRows.find((k) => k.id === (kpiId ?? id)) ?? kpiRows[0];
  return ok({ ...found, current_value: currentValue ?? found.current_value });
}

export async function createImpactMeasurementAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...impactMeasurementRows[0], ...i, id: `impact-mock-${Date.now()}` });
}

export async function listKpisForSubjectAction(input: unknown) {
  const { projectId, ideaId } = (input ?? {}) as { projectId?: string; ideaId?: string };
  return ok(kpiRows.filter((k) => (!projectId || k.project_id === projectId) && (!ideaId || k.idea_id === ideaId)));
}

export async function listImpactMeasurementsForSubjectAction(input: unknown) {
  const { projectId, ideaId } = (input ?? {}) as { projectId?: string; ideaId?: string };
  return ok(impactMeasurementRows.filter((m) => (!projectId || m.project_id === projectId) && (!ideaId || m.idea_id === ideaId)));
}

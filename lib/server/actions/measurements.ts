"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createKpiSchema,
  updateKpiValueSchema,
  createImpactMeasurementSchema,
  listKpisForSubjectSchema,
  listImpactMeasurementsForSubjectSchema,
} from "@/lib/server/validation/schemas";
import {
  createKpi,
  updateKpiValue,
  createImpactMeasurement,
  listKpisForSubject,
  listImpactMeasurementsForSubject,
  type KpiRow,
  type ImpactMeasurementRow,
} from "@/lib/server/services/measurements";

export async function createKpiAction(input: unknown): Promise<ActionResult<KpiRow>> {
  return runAction(async () => {
    const parsed = createKpiSchema.parse(input);
    const actor = await requireActiveUser();
    return createKpi(actor, parsed);
  });
}

export async function updateKpiValueAction(input: unknown): Promise<ActionResult<KpiRow>> {
  return runAction(async () => {
    const parsed = updateKpiValueSchema.parse(input);
    const actor = await requireActiveUser();
    return updateKpiValue(actor, parsed.kpiId, parsed.currentValue);
  });
}

export async function createImpactMeasurementAction(input: unknown): Promise<ActionResult<ImpactMeasurementRow>> {
  return runAction(async () => {
    const parsed = createImpactMeasurementSchema.parse(input);
    const actor = await requireActiveUser();
    return createImpactMeasurement(actor, parsed);
  });
}

/** Phase 6, Group E addition — Phase 5 built listKpisForSubject as a service only; no UI consumed it yet. */
export async function listKpisForSubjectAction(input: unknown): Promise<ActionResult<KpiRow[]>> {
  return runAction(async () => {
    const parsed = listKpisForSubjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listKpisForSubject(actor, parsed);
  });
}

/** Phase 6, Group E addition — Phase 5 built listImpactMeasurementsForSubject as a service only; no UI consumed it yet. */
export async function listImpactMeasurementsForSubjectAction(
  input: unknown
): Promise<ActionResult<ImpactMeasurementRow[]>> {
  return runAction(async () => {
    const parsed = listImpactMeasurementsForSubjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listImpactMeasurementsForSubject(actor, parsed);
  });
}

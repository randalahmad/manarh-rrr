"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { createRiskSchema, updateRiskSchema, listRisksForProjectSchema } from "@/lib/server/validation/schemas";
import { createRisk, updateRisk, listRisksForProject, type ProjectRiskRow } from "@/lib/server/services/risks";

export async function createRiskAction(input: unknown): Promise<ActionResult<ProjectRiskRow>> {
  return runAction(async () => {
    const parsed = createRiskSchema.parse(input);
    const actor = await requireActiveUser();
    return createRisk(actor, parsed);
  });
}

export async function updateRiskAction(input: unknown): Promise<ActionResult<ProjectRiskRow>> {
  return runAction(async () => {
    const parsed = updateRiskSchema.parse(input);
    const actor = await requireActiveUser();
    const { riskId, ...patch } = parsed;
    return updateRisk(actor, riskId, patch);
  });
}

/** Phase 6, Group E addition — Phase 5 built listRisksForProject as a service only; no UI consumed it yet. */
export async function listRisksForProjectAction(input: unknown): Promise<ActionResult<ProjectRiskRow[]>> {
  return runAction(async () => {
    const parsed = listRisksForProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listRisksForProject(actor, parsed.projectId);
  });
}

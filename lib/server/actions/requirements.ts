"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createRequirementSchema,
  updateRequirementStatusSchema,
  listRequirementsForProjectSchema,
} from "@/lib/server/validation/schemas";
import {
  createRequirement,
  updateRequirementStatus,
  listRequirementsForProject,
  type ProjectRequirementRow,
} from "@/lib/server/services/requirements";

export async function createRequirementAction(input: unknown): Promise<ActionResult<ProjectRequirementRow>> {
  return runAction(async () => {
    const parsed = createRequirementSchema.parse(input);
    const actor = await requireActiveUser();
    return createRequirement(actor, parsed);
  });
}

export async function updateRequirementStatusAction(
  input: unknown
): Promise<ActionResult<ProjectRequirementRow>> {
  return runAction(async () => {
    const parsed = updateRequirementStatusSchema.parse(input);
    const actor = await requireActiveUser();
    return updateRequirementStatus(actor, parsed.requirementId, parsed.status);
  });
}

/** Phase 6, Group E addition — Phase 5 built listRequirementsForProject as a service only; no UI consumed it yet. */
export async function listRequirementsForProjectAction(
  input: unknown
): Promise<ActionResult<ProjectRequirementRow[]>> {
  return runAction(async () => {
    const parsed = listRequirementsForProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listRequirementsForProject(actor, parsed.projectId);
  });
}

"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createMilestoneSchema,
  updateMilestoneStatusSchema,
  listMilestonesForProjectSchema,
} from "@/lib/server/validation/schemas";
import {
  createMilestone,
  updateMilestoneStatus,
  listMilestonesForProject,
  type ProjectMilestoneRow,
} from "@/lib/server/services/milestones";

export async function createMilestoneAction(input: unknown): Promise<ActionResult<ProjectMilestoneRow>> {
  return runAction(async () => {
    const parsed = createMilestoneSchema.parse(input);
    const actor = await requireActiveUser();
    return createMilestone(actor, parsed);
  });
}

export async function updateMilestoneStatusAction(input: unknown): Promise<ActionResult<ProjectMilestoneRow>> {
  return runAction(async () => {
    const parsed = updateMilestoneStatusSchema.parse(input);
    const actor = await requireActiveUser();
    return updateMilestoneStatus(actor, parsed.milestoneId, parsed.status);
  });
}

/** Phase 6, Group E addition — Phase 5 built listMilestonesForProject as a service only; no UI consumed it yet. */
export async function listMilestonesForProjectAction(
  input: unknown
): Promise<ActionResult<ProjectMilestoneRow[]>> {
  return runAction(async () => {
    const parsed = listMilestonesForProjectSchema.parse(input);
    const actor = await requireActiveUser();
    return listMilestonesForProject(actor, parsed.projectId);
  });
}

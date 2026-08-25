"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { addProjectUpdateSchema, listProjectUpdatesSchema } from "@/lib/server/validation/schemas";
import {
  addProjectUpdate,
  listProjectUpdates,
  type ProjectUpdateRow,
} from "@/lib/server/services/project-updates";

export async function addProjectUpdateAction(input: unknown): Promise<ActionResult<ProjectUpdateRow>> {
  return runAction(async () => {
    const parsed = addProjectUpdateSchema.parse(input);
    if (parsed.updateType === "STATUS_CHANGE") {
      // STATUS_CHANGE rows are written exclusively by transitionProjectStatus
      // as part of its own atomic transaction — never accepted as free-form
      // input here, or the audit trail could be forged to say a status
      // change happened when the canonical workflow never actually ran it.
      throw new Error("STATUS_CHANGE updates cannot be added directly.");
    }
    const actor = await requireActiveUser();
    return addProjectUpdate(actor, { projectId: parsed.projectId, updateType: parsed.updateType, content: parsed.content });
  });
}

/** Phase 6, Group E addition — Phase 5 built listProjectUpdates as a service only; no UI consumed it yet. */
export async function listProjectUpdatesAction(input: unknown): Promise<ActionResult<ProjectUpdateRow[]>> {
  return runAction(async () => {
    const parsed = listProjectUpdatesSchema.parse(input);
    const actor = await requireActiveUser();
    return listProjectUpdates(actor, parsed.projectId);
  });
}

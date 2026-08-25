"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  addProjectMemberSchema,
  removeProjectMemberSchema,
  listProjectMembersSchema,
} from "@/lib/server/validation/schemas";
import {
  addProjectMember,
  removeProjectMember,
  listProjectMembers,
  type ProjectMemberRow,
} from "@/lib/server/services/project-members";

export async function addProjectMemberAction(input: unknown): Promise<ActionResult<ProjectMemberRow>> {
  return runAction(async () => {
    const parsed = addProjectMemberSchema.parse(input);
    const actor = await requireActiveUser();
    return addProjectMember(actor, parsed.projectId, parsed.userId, parsed.roleInProject);
  });
}

export async function removeProjectMemberAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = removeProjectMemberSchema.parse(input);
    const actor = await requireActiveUser();
    await removeProjectMember(actor, parsed.projectId, parsed.userId);
    return null;
  });
}

/** Phase 6, Group E addition — Phase 5 built listProjectMembers as a service only; no UI consumed it yet. */
export async function listProjectMembersAction(input: unknown): Promise<ActionResult<ProjectMemberRow[]>> {
  return runAction(async () => {
    const parsed = listProjectMembersSchema.parse(input);
    const actor = await requireActiveUser();
    return listProjectMembers(actor, parsed.projectId);
  });
}

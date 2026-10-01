"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listTeamsForOrganization, type TeamWithMembers } from "@/lib/server/services/teams";

const listSchema = z.object({ organizationId: uuid });

export async function listTeamsAction(input: unknown): Promise<ActionResult<TeamWithMembers[]>> {
  return runAction(async () => {
    const { organizationId } = listSchema.parse(input);
    const actor = await requireActiveUser();
    return listTeamsForOrganization(actor, organizationId);
  });
}

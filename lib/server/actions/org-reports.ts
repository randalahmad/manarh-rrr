"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listIdeaStatusHistoryForOrganization } from "@/lib/server/services/org-reports";
import type { IdeaStatusHistoryRow } from "@/lib/server/services/ideas";

const schema = z.object({ organizationId: uuid });

export async function listOrgIdeaStatusHistoryAction(input: unknown): Promise<ActionResult<IdeaStatusHistoryRow[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listIdeaStatusHistoryForOrganization(actor, organizationId);
  });
}

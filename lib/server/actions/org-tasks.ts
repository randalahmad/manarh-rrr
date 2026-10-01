"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listTasksForOrganization } from "@/lib/server/services/org-tasks";
import type { ProjectTaskRow } from "@/lib/server/services/tasks";

const schema = z.object({ organizationId: uuid });

export async function listOrgTasksAction(input: unknown): Promise<ActionResult<ProjectTaskRow[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listTasksForOrganization(actor, organizationId);
  });
}

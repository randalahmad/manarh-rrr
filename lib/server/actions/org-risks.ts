"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listRisksForOrganization } from "@/lib/server/services/org-risks";
import type { ProjectRiskRow } from "@/lib/server/services/risks";

const schema = z.object({ organizationId: uuid });

export async function listOrgRisksAction(input: unknown): Promise<ActionResult<ProjectRiskRow[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listRisksForOrganization(actor, organizationId);
  });
}

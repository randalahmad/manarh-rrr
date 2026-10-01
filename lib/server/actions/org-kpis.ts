"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listKpisForOrganization } from "@/lib/server/services/org-kpis";
import type { KpiRow } from "@/lib/server/services/measurements";

const schema = z.object({ organizationId: uuid });

export async function listOrgKpisAction(input: unknown): Promise<ActionResult<KpiRow[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listKpisForOrganization(actor, organizationId);
  });
}

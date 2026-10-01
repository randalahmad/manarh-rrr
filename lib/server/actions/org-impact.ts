"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listImpactMeasurementsForOrganization } from "@/lib/server/services/org-impact";
import type { ImpactMeasurementRow } from "@/lib/server/services/measurements";

const schema = z.object({ organizationId: uuid });

export async function listOrgImpactMeasurementsAction(input: unknown): Promise<ActionResult<ImpactMeasurementRow[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listImpactMeasurementsForOrganization(actor, organizationId);
  });
}

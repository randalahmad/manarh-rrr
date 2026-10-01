"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import {
  listInnovationRecordsForOrganization,
  type InnovationRecordWithImpact,
} from "@/lib/server/services/innovation-register";

const schema = z.object({ organizationId: uuid });

export async function listInnovationRecordsAction(input: unknown): Promise<ActionResult<InnovationRecordWithImpact[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listInnovationRecordsForOrganization(actor, organizationId);
  });
}

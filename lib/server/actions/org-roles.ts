"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { uuid } from "@/lib/server/validation/schemas";
import { listRolesWithPermissions, type RoleWithPermissions } from "@/lib/server/services/org-roles";

const schema = z.object({ organizationId: uuid });

export async function listOrgRolesAction(input: unknown): Promise<ActionResult<RoleWithPermissions[]>> {
  return runAction(async () => {
    const { organizationId } = schema.parse(input);
    const actor = await requireActiveUser();
    return listRolesWithPermissions(actor, organizationId);
  });
}

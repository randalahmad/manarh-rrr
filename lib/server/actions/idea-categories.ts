"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { listIdeaCategoriesSchema } from "@/lib/server/validation/schemas";
import { listCategoriesForOrganization, type IdeaCategoryRow } from "@/lib/server/services/idea-categories";

export async function listIdeaCategoriesAction(input: unknown): Promise<ActionResult<IdeaCategoryRow[]>> {
  return runAction(async () => {
    const parsed = listIdeaCategoriesSchema.parse(input);
    const actor = await requireActiveUser();
    return listCategoriesForOrganization(actor, parsed.organizationId, { activeOnly: parsed.activeOnly });
  });
}

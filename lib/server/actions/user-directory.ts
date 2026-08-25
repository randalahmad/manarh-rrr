"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { getUsersDisplayInfoSchema } from "@/lib/server/validation/schemas";
import { getUsersDisplayInfo, type UserDisplayInfo } from "@/lib/server/services/user-directory";

export async function getUsersDisplayInfoAction(
  input: unknown
): Promise<ActionResult<Record<string, UserDisplayInfo>>> {
  return runAction(async () => {
    const parsed = getUsersDisplayInfoSchema.parse(input);
    const actor = await requireActiveUser();
    return getUsersDisplayInfo(actor, parsed.userIds);
  });
}

"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { getPlatformStats, type PlatformStats } from "@/lib/server/services/platform-oversight";

export async function getPlatformStatsAction(): Promise<ActionResult<PlatformStats>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return getPlatformStats(actor);
  });
}

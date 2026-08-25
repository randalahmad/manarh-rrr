"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { listPlatformAuditLogsSchema } from "@/lib/server/validation/schemas";
import { listPlatformAuditLogs, type PlatformAuditLogRow } from "@/lib/server/services/platform-audit";

export async function listPlatformAuditLogsAction(input?: unknown): Promise<ActionResult<PlatformAuditLogRow[]>> {
  return runAction(async () => {
    const parsed = listPlatformAuditLogsSchema.parse(input ?? {});
    const actor = await requireActiveUser();
    return listPlatformAuditLogs(actor, parsed.limit);
  });
}

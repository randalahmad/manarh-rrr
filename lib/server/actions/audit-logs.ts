"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { listAuditLogsSchema } from "@/lib/server/validation/schemas";
import { listAuditLogs, type AuditLogRow } from "@/lib/server/services/audit-logs";

export async function listAuditLogsAction(input: unknown): Promise<ActionResult<AuditLogRow[]>> {
  return runAction(async () => {
    const parsed = listAuditLogsSchema.parse(input);
    const actor = await requireActiveUser();
    const { organizationId, ...filters } = parsed;
    return listAuditLogs(actor, organizationId, filters);
  });
}

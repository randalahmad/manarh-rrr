"use server";
import { ok } from "@/lib/mock-server/result";
import { platformAuditLogRows } from "@/lib/mock-server/fixtures";

export async function listPlatformAuditLogsAction(_input?: unknown) {
  return ok(platformAuditLogRows);
}

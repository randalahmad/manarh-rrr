"use server";
import { ok } from "@/lib/mock-server/result";
import { auditLogRows } from "@/lib/mock-server/fixtures";

export async function listAuditLogsAction(_input: unknown) {
  return ok(auditLogRows);
}

"use server";
import { ok } from "@/lib/mock-server/result";
import { platformOrganizationRows } from "@/lib/mock-server/fixtures";
import type { ActionResult } from "@/lib/server/errors";

export async function listPlatformOrganizationsAction() {
  return ok(platformOrganizationRows);
}

export async function getPlatformOrganizationDetailAction(input: unknown) {
  const { organizationId, id } = (input ?? {}) as { organizationId?: string; id?: string };
  const found = platformOrganizationRows.find((o) => o.id === (organizationId ?? id)) ?? platformOrganizationRows[0];
  return ok(found);
}

export async function createPlatformOrganizationAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...platformOrganizationRows[0], ...i, id: `org-mock-${Date.now()}`, status: "ACTIVE" as const });
}

export async function suspendPlatformOrganizationAction(input: unknown) {
  const { organizationId, id } = (input ?? {}) as { organizationId?: string; id?: string };
  const found = platformOrganizationRows.find((o) => o.id === (organizationId ?? id)) ?? platformOrganizationRows[0];
  return ok({ ...found, status: "SUSPENDED" as const });
}

export async function reactivatePlatformOrganizationAction(input: unknown) {
  const { organizationId, id } = (input ?? {}) as { organizationId?: string; id?: string };
  const found = platformOrganizationRows.find((o) => o.id === (organizationId ?? id)) ?? platformOrganizationRows[0];
  return ok({ ...found, status: "ACTIVE" as const });
}

export async function bootstrapOrgAdminAction(_input: unknown): Promise<ActionResult<{ userId: string; email: string; fullName: string; organizationId: string; temporaryPassword: string }>> {
  return {
    ok: false,
    code: "BLOCKED_PENDING_DECISION",
    message: "هذه الميزة معطّلة في النسخة التجريبية (بدون قاعدة بيانات).",
  };
}

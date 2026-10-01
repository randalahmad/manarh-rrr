"use server";
import { ok } from "@/lib/mock-server/result";
import { organizationSettingsBundle } from "@/lib/mock-server/fixtures";

export async function getOrganizationSettingsAction(_input: unknown) {
  return ok(organizationSettingsBundle);
}

export async function saveOrganizationSettingsAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...organizationSettingsBundle, ...i });
}

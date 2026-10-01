"use server";
import { ok } from "@/lib/mock-server/result";
import { organizationSummaryRow } from "@/lib/mock-server/fixtures";
import { getMockRole } from "@/lib/mock-server/session";

export async function listOrganizationsAction() {
  return ok([organizationSummaryRow]);
}

export async function listMyOrganizationsAction() {
  const role = await getMockRole();
  return ok([{ ...organizationSummaryRow, role: role === "SUPER_ADMIN" ? "ORG_ADMIN" : role }]);
}

export async function getMyRoleInOrganizationAction(_input: unknown) {
  const role = await getMockRole();
  return ok(role === "SUPER_ADMIN" ? "ORG_ADMIN" : role);
}

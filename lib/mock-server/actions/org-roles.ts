"use server";
import { ok } from "@/lib/mock-server/result";
import { roleWithPermissionsRows } from "@/lib/mock-server/fixtures";

export async function listOrgRolesAction(_input: unknown) {
  return ok(roleWithPermissionsRows);
}

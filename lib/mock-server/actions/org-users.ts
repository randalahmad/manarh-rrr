"use server";
import { ok } from "@/lib/mock-server/result";
import { orgMemberRows } from "@/lib/mock-server/fixtures";

export async function listOrgMembersAction(_input: unknown) {
  return ok(orgMemberRows);
}

export async function getOrgMemberAction(input: unknown) {
  const { userId, id } = (input ?? {}) as { userId?: string; id?: string };
  const found = orgMemberRows.find((u) => u.user_id === (userId ?? id)) ?? orgMemberRows[0];
  return ok(found);
}

export async function updateOrgMembershipAction(input: unknown) {
  const { userId, id, ...rest } = (input ?? {}) as Record<string, unknown> & { userId?: string; id?: string };
  const found = orgMemberRows.find((u) => u.user_id === (userId ?? id)) ?? orgMemberRows[0];
  return ok({ ...found, ...rest });
}

export async function setMemberAccountStatusAction(input: unknown) {
  const { userId, id, status } = (input ?? {}) as { userId?: string; id?: string; status?: string };
  const found = orgMemberRows.find((u) => u.user_id === (userId ?? id)) ?? orgMemberRows[0];
  return ok({ ...found, account_status: (status as typeof found.account_status) ?? found.account_status });
}

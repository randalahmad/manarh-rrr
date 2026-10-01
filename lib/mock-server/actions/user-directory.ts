"use server";
import { ok } from "@/lib/mock-server/result";
import { orgMemberRows } from "@/lib/mock-server/fixtures";

export async function getUsersDisplayInfoAction(input: unknown) {
  const { userIds } = (input ?? {}) as { userIds?: string[] };
  const ids = userIds ?? orgMemberRows.map((u) => u.user_id);
  const map: Record<string, { id: string; fullName: string; avatarUrl: string | null }> = {};
  for (const id of ids) {
    const u = orgMemberRows.find((m) => m.user_id === id);
    if (u) map[id] = { id: u.user_id, fullName: u.full_name, avatarUrl: u.avatar_url };
  }
  return ok(map);
}

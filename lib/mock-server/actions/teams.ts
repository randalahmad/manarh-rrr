"use server";
import { ok } from "@/lib/mock-server/result";
import { teamWithMemberRows } from "@/lib/mock-server/fixtures";

export async function listTeamsAction(_input: unknown) {
  return ok(teamWithMemberRows);
}

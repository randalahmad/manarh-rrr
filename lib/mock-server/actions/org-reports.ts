"use server";
import { ok } from "@/lib/mock-server/result";
import { ideaStatusHistoryRows } from "@/lib/mock-server/fixtures";

export async function listOrgIdeaStatusHistoryAction(_input: unknown) {
  return ok(ideaStatusHistoryRows);
}

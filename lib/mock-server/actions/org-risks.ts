"use server";
import { ok } from "@/lib/mock-server/result";
import { projectRiskRows } from "@/lib/mock-server/fixtures";

export async function listOrgRisksAction(_input: unknown) {
  return ok(projectRiskRows);
}

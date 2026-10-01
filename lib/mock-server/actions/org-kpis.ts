"use server";
import { ok } from "@/lib/mock-server/result";
import { kpiRows } from "@/lib/mock-server/fixtures";

export async function listOrgKpisAction(_input: unknown) {
  return ok(kpiRows);
}

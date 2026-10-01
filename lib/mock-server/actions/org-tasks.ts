"use server";
import { ok } from "@/lib/mock-server/result";
import { projectTaskRows } from "@/lib/mock-server/fixtures";

export async function listOrgTasksAction(_input: unknown) {
  return ok(projectTaskRows);
}

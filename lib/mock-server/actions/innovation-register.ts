"use server";
import { ok } from "@/lib/mock-server/result";
import { innovationRecordRows } from "@/lib/mock-server/fixtures";

export async function listInnovationRecordsAction(_input: unknown) {
  return ok(innovationRecordRows);
}

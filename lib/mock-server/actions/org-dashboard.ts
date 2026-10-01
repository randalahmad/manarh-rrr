"use server";
import { ok } from "@/lib/mock-server/result";
import { impactMeasurementRows } from "@/lib/mock-server/fixtures";

export async function getOrgImpactMeasurementCountAction(_input: unknown) {
  return ok(impactMeasurementRows.length);
}

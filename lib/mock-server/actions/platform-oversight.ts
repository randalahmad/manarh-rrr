"use server";
import { ok } from "@/lib/mock-server/result";
import { platformStats } from "@/lib/mock-server/fixtures";

export async function getPlatformStatsAction() {
  return ok(platformStats);
}

"use server";
import { ok } from "@/lib/mock-server/result";
import { categoryRows } from "@/lib/mock-server/fixtures";

export async function listIdeaCategoriesAction(_input: unknown) {
  return ok(categoryRows);
}

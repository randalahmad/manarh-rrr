"use server";
import { ok } from "@/lib/mock-server/result";
import { opportunityRows } from "@/lib/mock-server/fixtures";

type Rec = Record<string, unknown>;

export async function listOpportunitiesAction(_input: unknown) {
  return ok(opportunityRows);
}

export async function createOpportunityAction(input: unknown) {
  const i = (input ?? {}) as Rec;
  return ok({ ...opportunityRows[0], ...i, id: `opp-mock-${Date.now()}`, status: "OPEN" as const });
}

export async function archiveOpportunityAction(input: unknown) {
  const { opportunityId, id } = (input ?? {}) as { opportunityId?: string; id?: string };
  const found = opportunityRows.find((r) => r.id === (opportunityId ?? id)) ?? opportunityRows[0];
  return ok({ ...found, status: "ARCHIVED" as const });
}

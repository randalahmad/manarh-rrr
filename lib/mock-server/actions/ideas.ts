"use server";
import { ok } from "@/lib/mock-server/result";
import { ideaRows, ideaStatusHistoryRows, ORG_ID } from "@/lib/mock-server/fixtures";

type Rec = Record<string, unknown>;

export async function createIdeaAction(input: unknown) {
  const i = (input ?? {}) as Rec;
  return ok({ ...ideaRows[0], ...i, id: `idea-mock-${Date.now()}`, status: "DRAFT" as const });
}

export async function getIdeaAction(input: unknown) {
  const { ideaId, id } = (input ?? {}) as { ideaId?: string; id?: string };
  const found = ideaRows.find((r) => r.id === (ideaId ?? id)) ?? ideaRows[0];
  return ok(found);
}

export async function listIdeasAction(_input: unknown) {
  return ok(ideaRows);
}

export async function updateIdeaAction(input: unknown) {
  const { ideaId, id, ...rest } = (input ?? {}) as Rec & { ideaId?: string; id?: string };
  const found = ideaRows.find((r) => r.id === (ideaId ?? id)) ?? ideaRows[0];
  return ok({ ...found, ...rest });
}

export async function listIdeaStatusHistoryAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(ideaStatusHistoryRows.filter((h) => !ideaId || h.idea_id === ideaId));
}

export async function transitionIdeaStatusAction(input: unknown) {
  const { ideaId, toStatus } = (input ?? {}) as { ideaId?: string; toStatus?: string };
  const found = ideaRows.find((r) => r.id === ideaId) ?? ideaRows[0];
  return ok({ ...found, status: (toStatus as typeof found.status) ?? found.status });
}

export async function withdrawIdeaAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  const found = ideaRows.find((r) => r.id === ideaId) ?? ideaRows[0];
  return ok({ ...found, status: "WITHDRAWN" as const });
}

void ORG_ID;

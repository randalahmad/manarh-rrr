"use server";
import { ok } from "@/lib/mock-server/result";
import { recommendationRows, decisionRows } from "@/lib/mock-server/fixtures";

export async function submitRecommendationAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...recommendationRows[0], ...i, id: `rec-mock-${Date.now()}` });
}

export async function makeDecisionAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...decisionRows[0], ...i, id: `dec-mock-${Date.now()}` });
}

export async function listRecommendationsForIdeaAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(recommendationRows.filter((r) => !ideaId || r.idea_id === ideaId));
}

export async function listRecommendationsForOrganizationAction(_input: unknown) {
  return ok(recommendationRows);
}

export async function listDecisionsForIdeaAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(decisionRows.filter((d) => !ideaId || d.idea_id === ideaId));
}

export async function listDecisionsForOrganizationAction(_input: unknown) {
  return ok(decisionRows);
}

"use server";
import { ok } from "@/lib/mock-server/result";
import { evaluatorAssignmentRows, evaluationRows, orgMemberRows } from "@/lib/mock-server/fixtures";

export async function assignEvaluatorAction(input: unknown) {
  const { ideaId, evaluatorId } = (input ?? {}) as { ideaId?: string; evaluatorId?: string };
  return ok({ ...evaluatorAssignmentRows[0], idea_id: ideaId ?? evaluatorAssignmentRows[0].idea_id, evaluator_id: evaluatorId ?? evaluatorAssignmentRows[0].evaluator_id, id: `ea-mock-${Date.now()}`, status: "ASSIGNED" as const });
}

export async function submitEvaluationAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...evaluationRows[0], ...i, id: `eval-mock-${Date.now()}` });
}

export async function listAssignmentsForIdeaAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(evaluatorAssignmentRows.filter((a) => !ideaId || a.idea_id === ideaId));
}

export async function listAssignmentsForOrganizationAction(_input: unknown) {
  return ok(evaluatorAssignmentRows);
}

export async function listMyAssignmentsAction() {
  return ok(evaluatorAssignmentRows);
}

export async function listEvaluatorCandidatesAction(_input: unknown) {
  return ok(orgMemberRows.filter((u) => u.role === "EVALUATOR" || u.role === "INNOVATION_SPECIALIST").map((u) => ({ id: u.user_id, fullName: u.full_name })));
}

export async function listEvaluationsForIdeaAction(input: unknown) {
  const { ideaId } = (input ?? {}) as { ideaId?: string };
  return ok(evaluationRows.filter((e) => !ideaId || e.idea_id === ideaId));
}

export async function listEvaluationsForOrganizationAction(_input: unknown) {
  return ok(evaluationRows);
}

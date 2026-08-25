"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  assignEvaluatorSchema,
  submitEvaluationSchema,
  getIdeaSchema,
  organizationScopeSchema,
} from "@/lib/server/validation/schemas";
import {
  assignEvaluator,
  listAssignmentsForIdea,
  listAssignmentsForOrganization,
  listAssignmentsForEvaluator,
  listEvaluatorCandidates,
  type EvaluatorAssignmentRow,
  type EvaluatorCandidate,
} from "@/lib/server/services/evaluator-assignments";
import {
  submitEvaluation,
  listEvaluationsForIdea,
  listEvaluationsForOrganization,
  type EvaluationRow,
} from "@/lib/server/services/evaluations";

export async function assignEvaluatorAction(input: unknown): Promise<ActionResult<EvaluatorAssignmentRow>> {
  return runAction(async () => {
    const parsed = assignEvaluatorSchema.parse(input);
    const actor = await requireActiveUser();
    return assignEvaluator(actor, parsed.ideaId, parsed.evaluatorUserId, parsed.dueAt);
  });
}

export async function submitEvaluationAction(input: unknown): Promise<ActionResult<EvaluationRow>> {
  return runAction(async () => {
    const parsed = submitEvaluationSchema.parse(input);
    const actor = await requireActiveUser();
    return submitEvaluation(actor, parsed);
  });
}

/**
 * Read actions (Phase 6, Group C addition) — Phase 5 built the
 * evaluator-assignment/evaluation services with only enough reads for their
 * own mutation flows (`assignEvaluator`'s duplicate check, etc.); nothing
 * exposed a read to any Server Action boundary yet. Mirrors the read-action
 * pattern already established in lib/server/actions/ideas.ts.
 */
export async function listAssignmentsForIdeaAction(
  input: unknown
): Promise<ActionResult<EvaluatorAssignmentRow[]>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return listAssignmentsForIdea(actor, parsed.ideaId);
  });
}

export async function listAssignmentsForOrganizationAction(
  input: unknown
): Promise<ActionResult<EvaluatorAssignmentRow[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listAssignmentsForOrganization(actor, parsed.organizationId);
  });
}

/** No input — always the caller's own assignment queue (userId comes from the session, never the client). */
export async function listMyAssignmentsAction(): Promise<ActionResult<EvaluatorAssignmentRow[]>> {
  return runAction(async () => {
    const actor = await requireActiveUser();
    return listAssignmentsForEvaluator(actor);
  });
}

export async function listEvaluatorCandidatesAction(
  input: unknown
): Promise<ActionResult<EvaluatorCandidate[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listEvaluatorCandidates(actor, parsed.organizationId);
  });
}

export async function listEvaluationsForIdeaAction(input: unknown): Promise<ActionResult<EvaluationRow[]>> {
  return runAction(async () => {
    const parsed = getIdeaSchema.parse(input);
    const actor = await requireActiveUser();
    return listEvaluationsForIdea(actor, parsed.ideaId);
  });
}

export async function listEvaluationsForOrganizationAction(
  input: unknown
): Promise<ActionResult<EvaluationRow[]>> {
  return runAction(async () => {
    const parsed = organizationScopeSchema.parse(input);
    const actor = await requireActiveUser();
    return listEvaluationsForOrganization(actor, parsed.organizationId);
  });
}

/**
 * Client-side data layer for the Org Admin Evaluation/Decision pages
 * (`app/org/evaluations/**`, `app/org/decisions/**`) — Phase 6, Group C.
 *
 * Mirrors `lib/client/org-ideas.ts`'s pattern: a narrow, additive data
 * source backed by real Server Actions, used only by these pages. Idea
 * lookups and user-name resolution are reused directly from `org-ideas.ts`
 * (same interface, not a cross-interface dependency — see that file's own
 * header note on why the three interfaces don't share internals with each
 * other) rather than duplicated here.
 *
 * SCOPE (per the user-approved Group C decisions):
 *  - Evaluator assignment, evaluation reads, and Org Admin decision-making
 *    are fully real.
 *  - Recommendation is READ-ONLY here — `submitRecommendationAction` exists
 *    on the backend (Phase 5) but nothing in this module or any Org Admin
 *    page calls it; recommendations only ever appear once one exists in the
 *    database (there is currently no UI, in any interface, authorized to
 *    create one for a real idea — see the Group C report).
 *  - Project conversion (`convertToProject`) stays out of scope — Group D,
 *    still mocked.
 */
import type { EvaluatorAssignment, Evaluation, Recommendation, Decision, RecommendationType } from "@/lib/types";
import {
  assignEvaluatorAction,
  listAssignmentsForOrganizationAction,
  listAssignmentsForIdeaAction,
  listEvaluatorCandidatesAction,
  listEvaluationsForOrganizationAction,
  listEvaluationsForIdeaAction,
} from "@/lib/mock-server/actions/evaluations";
import {
  makeDecisionAction,
  listRecommendationsForOrganizationAction,
  listRecommendationsForIdeaAction,
  listDecisionsForOrganizationAction,
  listDecisionsForIdeaAction,
} from "@/lib/mock-server/actions/decisions";
import type { EvaluatorAssignmentRow, EvaluatorCandidate } from "@/lib/server/services/evaluator-assignments";
import type { EvaluationRow } from "@/lib/server/services/evaluations";
import type { RecommendationRow, DecisionRow } from "@/lib/server/services/decisions";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapAssignmentRow(row: EvaluatorAssignmentRow): EvaluatorAssignment {
  return {
    id: row.id,
    ideaId: row.idea_id,
    evaluatorId: row.evaluator_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    dueAt: row.due_at ?? undefined,
    status: row.status,
  };
}

function mapEvaluationRow(row: EvaluationRow): Evaluation {
  return {
    id: row.id,
    ideaId: row.idea_id,
    evaluatorId: row.evaluator_id,
    strategicAlignmentScore: Number(row.strategic_alignment_score),
    feasibilityScore: Number(row.feasibility_score),
    resourceReadinessScore: Number(row.resource_readiness_score),
    notes: row.notes,
    attachments: [],
    submittedAt: row.submitted_at,
  };
}

function mapRecommendationRow(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    ideaId: row.idea_id,
    evaluationId: row.evaluation_id ?? undefined,
    recommendationType: row.recommendation_type,
    summary: row.summary,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
  };
}

function mapDecisionRow(row: DecisionRow): Decision {
  return {
    id: row.id,
    ideaId: row.idea_id ?? undefined,
    projectId: row.project_id ?? undefined,
    recommendationId: row.recommendation_id ?? undefined,
    decisionType: row.decision_type,
    reason: row.reason,
    conditions: row.conditions ?? undefined,
    notes: row.notes ?? undefined,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
  };
}

export async function fetchOrgAssignments(organizationId: string): Promise<EvaluatorAssignment[]> {
  const rows = unwrap(await listAssignmentsForOrganizationAction({ organizationId }));
  return rows.map(mapAssignmentRow);
}

export async function fetchAssignmentsForIdea(ideaId: string): Promise<EvaluatorAssignment[]> {
  const rows = unwrap(await listAssignmentsForIdeaAction({ ideaId }));
  return rows.map(mapAssignmentRow);
}

export async function fetchEvaluatorCandidates(organizationId: string): Promise<{ id: string; fullName: string }[]> {
  return unwrap(await listEvaluatorCandidatesAction({ organizationId })) as EvaluatorCandidate[];
}

export async function assignEvaluator(
  ideaId: string,
  evaluatorUserId: string,
  dueDate?: string
): Promise<EvaluatorAssignment> {
  // The "تاريخ الاستحقاق" field is a plain <input type="date"> (YYYY-MM-DD);
  // the real schema requires a full ISO datetime.
  const dueAt = dueDate ? new Date(dueDate).toISOString() : undefined;
  return mapAssignmentRow(unwrap(await assignEvaluatorAction({ ideaId, evaluatorUserId, dueAt })));
}

export async function fetchOrgEvaluations(organizationId: string): Promise<Evaluation[]> {
  const rows = unwrap(await listEvaluationsForOrganizationAction({ organizationId }));
  return rows.map(mapEvaluationRow);
}

export async function fetchEvaluationsForIdea(ideaId: string): Promise<Evaluation[]> {
  const rows = unwrap(await listEvaluationsForIdeaAction({ ideaId }));
  return rows.map(mapEvaluationRow);
}

export async function fetchOrgRecommendations(organizationId: string): Promise<Recommendation[]> {
  const rows = unwrap(await listRecommendationsForOrganizationAction({ organizationId }));
  return rows.map(mapRecommendationRow);
}

export async function fetchRecommendationsForIdea(ideaId: string): Promise<Recommendation[]> {
  const rows = unwrap(await listRecommendationsForIdeaAction({ ideaId }));
  return rows.map(mapRecommendationRow);
}

export async function fetchOrgDecisions(organizationId: string): Promise<Decision[]> {
  const rows = unwrap(await listDecisionsForOrganizationAction({ organizationId }));
  return rows.map(mapDecisionRow);
}

export async function fetchDecisionsForIdea(ideaId: string): Promise<Decision[]> {
  const rows = unwrap(await listDecisionsForIdeaAction({ ideaId }));
  return rows.map(mapDecisionRow);
}

export async function makeDecision(input: {
  ideaId: string;
  decisionType: RecommendationType;
  reason: string;
  conditions?: string;
  notes?: string;
}): Promise<Decision> {
  return mapDecisionRow(unwrap(await makeDecisionAction(input)));
}

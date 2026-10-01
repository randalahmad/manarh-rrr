/**
 * Client-side data layer for the Innovation Specialist Evaluation tab
 * (`app/innovation-specialist/(dashboard)/ideas/[id]/idea-details-client.tsx`)
 * — Phase 6, Group C.
 *
 * Kept as an independent module from `lib/client/org-evaluations.ts`,
 * matching this codebase's established pattern of each interface owning its
 * own data-layer file (see specialist-ideas.ts's own header note).
 *
 * SCOPE (per the user-approved Group C decisions):
 *  - Evaluation is real: a specialist with an EVALUATION:EVALUATE grant who
 *    is actually assigned as the evaluator for an idea (enforced server-side
 *    by `submitEvaluation`) can view assignments/evaluations for that idea
 *    and submit their own.
 *  - Recommendation submission is NOT included here — under the real seeded
 *    RBAC catalog INNOVATION_SPECIALIST has no GOVERNANCE:* grant, so it
 *    stays local-only scratch UI in idea-details-client.tsx. See the Group C
 *    report for the full rationale.
 */
import type { EvaluatorAssignment, Evaluation } from "@/lib/types";
import {
  listAssignmentsForIdeaAction,
  listEvaluationsForIdeaAction,
  submitEvaluationAction,
} from "@/lib/mock-server/actions/evaluations";
import type { EvaluatorAssignmentRow } from "@/lib/server/services/evaluator-assignments";
import type { EvaluationRow } from "@/lib/server/services/evaluations";
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

export async function fetchAssignmentsForIdea(ideaId: string): Promise<EvaluatorAssignment[]> {
  const rows = unwrap(await listAssignmentsForIdeaAction({ ideaId }));
  return rows.map(mapAssignmentRow);
}

export async function fetchEvaluationsForIdea(ideaId: string): Promise<Evaluation[]> {
  const rows = unwrap(await listEvaluationsForIdeaAction({ ideaId }));
  return rows.map(mapEvaluationRow);
}

export async function submitMyEvaluation(input: {
  ideaId: string;
  strategicAlignmentScore: number;
  feasibilityScore: number;
  resourceReadinessScore: number;
  notes: string;
}): Promise<Evaluation> {
  return mapEvaluationRow(unwrap(await submitEvaluationAction(input)));
}

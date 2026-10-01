/**
 * Client-side data layer for the Innovation Specialist Reports page
 * (`app/innovation-specialist/(dashboard)/reports/reports-client.tsx`).
 *
 * Mirrors `lib/client/org-reports.ts`'s pattern (a narrow, additive read
 * layer over already-existing real Server Actions) but scoped to this
 * interface, matching this codebase's established pattern of each
 * interface owning its own data-layer file (see specialist-ideas.ts's own
 * header note).
 *
 * Every fetch below reuses a Server Action that already exists for another
 * page — nothing new is added at the action/service layer. RBAC was
 * verified against the real seeded catalog (db/migrations/0010_rbac_seed.sql)
 * before wiring each one in:
 *   - IDEA, EVALUATION, PROJECT, REPORT are all granted to
 *     INNOVATION_SPECIALIST org-wide.
 *   - GOVERNANCE is NOT granted to INNOVATION_SPECIALIST (see
 *     specialist-evaluations.ts's own header note), so
 *     `listRecommendationsForOrganizationAction` (GOVERNANCE:VIEW) is
 *     deliberately never called here. "Recommendations submitted" is
 *     instead derived from `idea_status_history` (REPORT:VIEW, which this
 *     role does have) by counting distinct ideas that ever transitioned
 *     INTO "RECOMMENDATION_SUBMITTED" — a precise real count from data this
 *     role is actually authorized to read, not a fabricated number.
 *
 * Unlike `fetchReviewQueue` (specialist-ideas.ts), which filters to
 * REVIEW_ELIGIBLE_STATUSES for the working queue, `fetchAllIdeasForReports`
 * returns every idea regardless of status — a report needs the full
 * lifecycle (including terminal states) to compute funnel/category/monthly
 * aggregates truthfully.
 */
import type { Idea, IdeaStatusHistory, Evaluation, EvaluatorAssignment, Project } from "@/lib/types";
import { listIdeasAction } from "@/lib/server/actions/ideas";
import type { IdeaRow, IdeaStatusHistoryRow } from "@/lib/server/services/ideas";
import { listOrgIdeaStatusHistoryAction } from "@/lib/server/actions/org-reports";
import { listEvaluationsForOrganizationAction, listAssignmentsForOrganizationAction } from "@/lib/server/actions/evaluations";
import type { EvaluatorAssignmentRow } from "@/lib/server/services/evaluator-assignments";
import type { EvaluationRow } from "@/lib/server/services/evaluations";
import { listProjectsAction } from "@/lib/server/actions/projects";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapIdeaRow(row: IdeaRow): Idea {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    problemStatement: row.problem_statement,
    proposedSolution: row.proposed_solution,
    expectedImpact: row.expected_impact,
    categoryId: row.category_id,
    strategicGoalIds: [],
    challengeId: row.challenge_id ?? undefined,
    opportunityId: row.opportunity_id ?? undefined,
    submitterId: row.submitter_id,
    submitterType: row.submitter_type,
    status: row.status,
    submittedAt: row.submitted_at ?? row.created_at,
    updatedAt: row.updated_at,
    attachments: [],
    projectId: row.project_id ?? undefined,
    withdrawalReason: row.withdrawal_reason ?? undefined,
  };
}

function mapHistoryRow(row: IdeaStatusHistoryRow): IdeaStatusHistory {
  return {
    id: row.id,
    ideaId: row.idea_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    note: row.note ?? undefined,
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

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ideaId: row.idea_id,
    challengeId: row.challenge_id ?? undefined,
    opportunityId: row.opportunity_id ?? undefined,
    strategicGoalIds: [],
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    status: row.status,
    previousActiveStatus: row.previous_active_status ?? null,
    progress: row.progress,
    startDate: row.start_date,
    expectedCompletionDate: row.expected_completion_date,
    actualCompletionDate: row.actual_completion_date ?? undefined,
    budget: row.budget ?? undefined,
    baseline: row.baseline ?? undefined,
    actualCost: row.actual_cost ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAllIdeasForReports(organizationId: string): Promise<Idea[]> {
  const rows = unwrap(await listIdeasAction({ organizationId }));
  return rows.map(mapIdeaRow);
}

export async function fetchIdeaStatusHistoryForReports(organizationId: string): Promise<IdeaStatusHistory[]> {
  const rows = unwrap(await listOrgIdeaStatusHistoryAction({ organizationId }));
  return rows.map(mapHistoryRow);
}

export async function fetchEvaluationsForReports(organizationId: string): Promise<Evaluation[]> {
  const rows = unwrap(await listEvaluationsForOrganizationAction({ organizationId }));
  return rows.map(mapEvaluationRow);
}

export async function fetchAssignmentsForReports(organizationId: string): Promise<EvaluatorAssignment[]> {
  const rows = unwrap(await listAssignmentsForOrganizationAction({ organizationId }));
  return rows.map(mapAssignmentRow);
}

export async function fetchProjectsForReports(organizationId: string): Promise<Project[]> {
  const rows = unwrap(await listProjectsAction({ organizationId }));
  return rows.map(mapProjectRow);
}

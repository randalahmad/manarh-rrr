/**
 * Client-side data layer for the Innovation Specialist Idea Core pages
 * (`app/innovation-specialist/(dashboard)/ideas/**`) — Phase 6, Group B.
 *
 * Mirrors the shape of `lib/client/org-ideas.ts` (same Server Actions, same
 * underlying `Idea`/`IdeaCategory`/`IdeaStatusHistory`/`InformationRequest`
 * types) but is kept as an independent module rather than shared, matching
 * this codebase's existing pattern of each of the three interfaces
 * (Innovator, Org Admin, Innovation Specialist) owning its own data-layer
 * file rather than depending on another interface's internals.
 *
 * Per the user-approved Group B decisions for this interface:
 *  - No specialist-assignment mechanism exists or is introduced anywhere in
 *    this file. `fetchReviewQueue` returns an ORGANIZATION-WIDE queue,
 *    scoped only by which canonical IdeaStatus values are "eligible for
 *    specialist review" (see REVIEW_ELIGIBLE_STATUSES below) — never by a
 *    per-user assignment (no such column/table exists, and none is added).
 *  - No `priority` field is fabricated or read anywhere here — none exists
 *    on the real `ideas` table.
 *  - No `innovatorType` (individual vs. team) field is fabricated. The only
 *    real distinction the backend has is `submitter_type`
 *    (INTERNAL/EXTERNAL), exposed exactly as `Idea.submitterType` — the
 *    same field every other interface already uses, not reinterpreted.
 */
import type { Idea, IdeaCategory, IdeaStatus, IdeaStatusHistory, InformationRequest } from "@/lib/types";
import { getSessionUserAction } from "@/lib/server/actions/auth";
import { getIdeaAction, listIdeasAction, transitionIdeaStatusAction, listIdeaStatusHistoryAction } from "@/lib/server/actions/ideas";
import type { IdeaRow, IdeaStatusHistoryRow } from "@/lib/server/services/ideas";
import { listIdeaCategoriesAction } from "@/lib/server/actions/idea-categories";
import type { IdeaCategoryRow } from "@/lib/server/services/idea-categories";
import { getUsersDisplayInfoAction } from "@/lib/server/actions/user-directory";
import { createInformationRequestAction, listInformationRequestsAction } from "@/lib/server/actions/information-requests";
import type { InformationRequestRow } from "@/lib/server/services/information-requests";
import type { ActionResult } from "@/lib/server/errors";

/**
 * Canonical statuses a specialist is expected to act on for screening,
 * review, evaluation and recommendation — from submission through a
 * recommendation being handed to the org admin. Derived directly from the
 * approved graph in `lib/server/workflow/idea-status.ts` (IDEA_TRANSITIONS),
 * not invented: DRAFT never left the innovator's own workspace,
 * PENDING_DECISION-onward is the decision stage (Group C, org admin
 * territory, not this interface), and WITHDRAWN/REJECTED/ARCHIVED/etc. are
 * terminal states with no further specialist action.
 */
export const REVIEW_ELIGIBLE_STATUSES: IdeaStatus[] = [
  "SUBMITTED",
  "INITIAL_SCREENING",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
  "RETURNED_FOR_REVIEW",
  "UNDER_EVALUATION",
  "RECOMMENDATION_SUBMITTED",
];

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

/** The signed-in specialist's own organization + user id, resolved from the real session. */
export async function getCurrentSpecialistSession(): Promise<{ userId: string; organizationId: string }> {
  const result = await getSessionUserAction();
  if (!result.ok || !result.data) {
    throw new Error("No active session.");
  }
  if (!result.data.organizationId) {
    throw new Error("No active organization membership.");
  }
  return { userId: result.data.id, organizationId: result.data.organizationId };
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
    // A DRAFT idea has no real submission date yet (submitted_at is null),
    // but DRAFT never appears in REVIEW_ELIGIBLE_STATUSES, so this fallback
    // is defensive rather than load-bearing here.
    submittedAt: row.submitted_at ?? row.created_at,
    updatedAt: row.updated_at,
    attachments: [],
    projectId: row.project_id ?? undefined,
    withdrawalReason: row.withdrawal_reason ?? undefined,
  };
}

function mapCategoryRow(row: IdeaCategoryRow): IdeaCategory {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority ?? undefined,
    relatedIdeasCount: row.related_ideas_count,
    usageCount: row.usage_count,
    strategicGoalId: row.strategic_goal_id ?? undefined,
    createdAt: row.created_at,
  };
}

function mapStatusHistoryRow(row: IdeaStatusHistoryRow): IdeaStatusHistory {
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

function mapInformationRequestRow(row: InformationRequestRow): InformationRequest {
  return {
    id: row.id,
    ideaId: row.idea_id,
    requestedBy: row.requested_by,
    requestText: row.request_text,
    status: row.status,
    requestedAt: row.requested_at,
    responseText: row.response_text ?? undefined,
    respondedBy: row.responded_by ?? undefined,
    respondedAt: row.responded_at ?? undefined,
  };
}

/**
 * Organization-wide queue: every idea in the org whose status is "eligible
 * for specialist review" (REVIEW_ELIGIBLE_STATUSES) — NOT filtered by any
 * per-specialist assignment, since none exists (decision #3/#4). RBAC is
 * enforced by `listIdeasForOrganization` itself (org-membership check);
 * INNOVATION_SPECIALIST has no narrower IDEA:VIEW scoping in the seeded
 * catalog (db/migrations/0010_rbac_seed.sql), so an org-wide read is the
 * correct, already-authorized scope — nothing new is granted here.
 */
export async function fetchReviewQueue(organizationId: string): Promise<Idea[]> {
  const rows = unwrap(await listIdeasAction({ organizationId }));
  return rows.filter((row) => REVIEW_ELIGIBLE_STATUSES.includes(row.status)).map(mapIdeaRow);
}

export async function fetchSpecialistIdea(ideaId: string): Promise<Idea> {
  return mapIdeaRow(unwrap(await getIdeaAction({ ideaId })));
}

/** `activeOnly: false` — an idea may reference a category that has since been archived; it must still resolve to a name. */
export async function fetchSpecialistCategories(organizationId: string): Promise<IdeaCategory[]> {
  const rows = unwrap(await listIdeaCategoriesAction({ organizationId, activeOnly: false }));
  return rows.map(mapCategoryRow);
}

export async function fetchUserNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return new Map();
  const info = unwrap(await getUsersDisplayInfoAction({ userIds: unique }));
  return new Map(Object.entries(info).map(([id, u]) => [id, u.fullName]));
}

export async function fetchIdeaStatusHistory(ideaId: string): Promise<IdeaStatusHistory[]> {
  const rows = unwrap(await listIdeaStatusHistoryAction({ ideaId }));
  return rows.map(mapStatusHistoryRow);
}

export async function fetchInformationRequests(ideaId: string): Promise<InformationRequest[]> {
  const rows = unwrap(await listInformationRequestsAction({ ideaId }));
  return rows.map(mapInformationRequestRow);
}

export async function transitionIdea(ideaId: string, toStatus: IdeaStatus, note?: string): Promise<Idea> {
  return mapIdeaRow(unwrap(await transitionIdeaStatusAction({ ideaId, toStatus, note })));
}

export async function requestIdeaInformation(ideaId: string, requestText: string): Promise<void> {
  unwrap(await createInformationRequestAction({ ideaId, requestText }));
}

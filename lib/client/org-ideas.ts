/**
 * Client-side data layer for the Org Admin Idea Core pages
 * (`app/org/ideas/**`) — Phase 6, Group B.
 *
 * Org Admin has no per-feature service/swap-seam layer like the Innovator
 * interface (`components/innovator-src/**`) — every page reads/writes a
 * single shared mock context (`lib/store.tsx`'s `useAppData()`), seeded
 * once and mutated synchronously in memory. That context is NOT changed
 * here: it still backs every other Org Admin page (evaluations,
 * recommendations, decisions, projects, users, settings, reports, etc — all
 * later groups). This module is a narrow, additive alternative data source
 * used ONLY by the two ideas pages, for the idea-core slice specifically
 * (idea itself, its category, its submitter's name, its status history,
 * its information requests, its comments) — fetched from the real backend
 * via Server Actions instead of the mock store.
 *
 * Type reuse: `Idea`/`IdeaCategory`/`IdeaStatusHistory`/`InformationRequest`/
 * `Comment`/`IdeaStatus` are already the SAME shared types
 * (`@/lib/types`) used by both the Org Admin mock frontend and the real
 * backend workflow module (`lib/server/workflow/idea-status.ts` imports
 * `IdeaStatus` from the exact same file) — so mapping a real row to what
 * these pages already render needs field renaming only, no shape redesign.
 *
 * KNOWN GAPS (see the Phase 6 Group B report):
 *  - `Idea.strategicGoalIds` is always `[]` — no idea<->strategic-goal
 *    linkage exists on the real backend yet (Group F scope). The "الهدف
 *    الاستراتيجي" filter on the list page will therefore never match a real
 *    idea once a specific goal is selected.
 *  - `Idea.attachments` is always `[]` — real file storage is out of scope
 *    this phase (same decision as the Innovator interface).
 *  - `challengeId`/`opportunityId` on a real idea are real UUIDs, but
 *    `d.challenges`/`d.opportunities` (still mock, Group G scope) only
 *    contain mock ids — the challenge/opportunity names on the idea detail
 *    page will always show "—" for a real idea until those domains are
 *    migrated. This fails gracefully (no crash), not silently wrong.
 */
import type {
  Idea,
  IdeaCategory,
  IdeaStatus,
  IdeaStatusHistory,
  InformationRequest,
  Comment,
} from "@/lib/types";
import { getSessionUserAction } from "@/lib/mock-server/actions/auth";
import {
  getIdeaAction,
  listIdeasAction,
  transitionIdeaStatusAction,
  listIdeaStatusHistoryAction,
} from "@/lib/mock-server/actions/ideas";
import type { IdeaRow, IdeaStatusHistoryRow } from "@/lib/server/services/ideas";
import { listIdeaCategoriesAction } from "@/lib/mock-server/actions/idea-categories";
import type { IdeaCategoryRow } from "@/lib/server/services/idea-categories";
import { getUsersDisplayInfoAction } from "@/lib/mock-server/actions/user-directory";
import {
  createInformationRequestAction,
  listInformationRequestsAction,
} from "@/lib/mock-server/actions/information-requests";
import type { InformationRequestRow } from "@/lib/server/services/information-requests";
import { addCommentAction, listCommentsForEntityAction } from "@/lib/mock-server/actions/comments";
import type { CommentRow } from "@/lib/server/services/comments";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

/** The signed-in Org Admin's own organization + user id, resolved from the real session. */
export async function getCurrentOrgSession(): Promise<{ userId: string; organizationId: string }> {
  const result = await getSessionUserAction();
  if (!result.ok || !result.data) {
    throw new Error("No active session.");
  }
  if (!result.data.organizationId) {
    throw new Error("No active organization membership.");
  }
  return { userId: result.data.id, organizationId: result.data.organizationId };
}

export function mapIdeaRow(row: IdeaRow): Idea {
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
    // A DRAFT idea has no real submission date yet (submitted_at is null) —
    // the type requires a non-optional string, so fall back to its creation
    // date rather than crashing formatDate() with an invalid value.
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

function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function fetchOrgIdeas(organizationId: string): Promise<Idea[]> {
  const rows = unwrap(await listIdeasAction({ organizationId }));
  return rows.map(mapIdeaRow);
}

export async function fetchOrgIdea(ideaId: string): Promise<Idea> {
  return mapIdeaRow(unwrap(await getIdeaAction({ ideaId })));
}

/** `activeOnly: false` — an idea may reference a category that has since been archived; it must still resolve to a name/appear in the filter list. */
export async function fetchOrgCategories(organizationId: string): Promise<IdeaCategory[]> {
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

export async function fetchIdeaComments(ideaId: string): Promise<Comment[]> {
  const rows = unwrap(await listCommentsForEntityAction({ entityType: "IDEA", entityId: ideaId }));
  return rows.map(mapCommentRow);
}

export async function transitionIdea(ideaId: string, toStatus: IdeaStatus, note?: string): Promise<Idea> {
  return mapIdeaRow(unwrap(await transitionIdeaStatusAction({ ideaId, toStatus, note })));
}

export async function requestIdeaInformation(ideaId: string, requestText: string): Promise<void> {
  unwrap(await createInformationRequestAction({ ideaId, requestText }));
}

export async function addIdeaComment(ideaId: string, content: string): Promise<void> {
  unwrap(await addCommentAction({ entityType: "IDEA", entityId: ideaId, content }));
}

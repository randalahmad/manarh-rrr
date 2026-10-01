import type {
  Idea,
  IdeaAttachment,
  IdeaFormValues,
  IdeaListQuery,
  IdeaStatusHistoryEntry,
  InformationRequest,
  SubmitterType,
} from '../types';
import { resolveIdeaSort } from '../sortOptions';
import {
  getIdeaAction,
  listIdeasAction,
  createIdeaAction,
  updateIdeaAction,
  transitionIdeaStatusAction,
  withdrawIdeaAction,
  listIdeaStatusHistoryAction,
} from '@/lib/mock-server/actions/ideas';
import type { IdeaRow, IdeaStatusHistoryRow } from '@/lib/server/services/ideas';
import {
  respondToInformationRequestAction,
  listInformationRequestsAction,
} from '@/lib/mock-server/actions/information-requests';
import type { InformationRequestRow } from '@/lib/server/services/information-requests';
import { listIdeaCategoriesAction } from '@/lib/mock-server/actions/idea-categories';
import { listMyOrganizationsAction } from '@/lib/mock-server/actions/organizations';
import { getSessionUserAction } from '@/lib/mock-server/actions/auth';
import type { ActionResult } from '@/lib/server/errors';

/**
 * ideaService abstraction. Components/hooks must depend on this interface
 * only.
 *
 * `NeonIdeaService` (Phase 6, Group B) is the real implementation, wired to
 * the Phase 5 Ideas domain service via Server Actions
 * (lib/server/actions/ideas.ts, information-requests.ts). It replaces the
 * former `MockIdeaService` for every method — no consuming
 * component/hook/page changes.
 *
 * KNOWN GAPS (reported to the user, not silently invented around):
 *  - Attachments: real file storage is out of scope for this phase.
 *    `saveDraft`/`submit`/`respondToInformationRequest` accept an
 *    `attachments` parameter (for interface compatibility with
 *    `ideaWorkflow`, which still runs `attachmentUploadService` client-side)
 *    but it is never persisted — every `Idea` returned has `attachments: []`.
 *  - Decision: the real `decisions` table/service is Group C/D scope.
 *    `Idea.decision` is always `undefined` here.
 *  - `ideaStage`/`supportType`/`additionalNotes`: no real schema columns
 *    exist for these free-text fields (see `Idea` type comments) — always
 *    `undefined`.
 *  - `submit()` on a draft currently in `NEEDS_INFORMATION`: the innovator's
 *    own `policies.ts` allow-list (`ALLOWED_STATUSES.SUBMIT`) permits this,
 *    but the approved canonical graph (`lib/server/workflow/idea-status.ts`)
 *    only allows `NEEDS_INFORMATION -> RETURNED_FOR_REVIEW` (via the
 *    separate "complete information" flow), not `-> SUBMITTED`. Rather than
 *    silently reinterpreting one of these two already-approved rules, this
 *    service passes the transition through to the real backend as-is: the
 *    content edit succeeds, then the status transition is rejected by
 *    `transitionIdeaStatus` and surfaces as a normal `SUBMIT_FAILED` error.
 *    This mismatch is called out in the Phase 6 Group B report for a
 *    decision rather than resolved here.
 */
export interface IdeaService {
  list(query?: IdeaListQuery): Promise<Idea[]>;
  getById(id: string): Promise<Idea>;
  saveDraft(
    values: IdeaFormValues,
    attachments: IdeaAttachment[],
    draftId?: string,
    submitterType?: SubmitterType,
  ): Promise<Idea>;
  submit(
    values: IdeaFormValues,
    attachments: IdeaAttachment[],
    draftId?: string,
    submitterType?: SubmitterType,
  ): Promise<Idea>;
  respondToInformationRequest(
    ideaId: string,
    requestId: string,
    response: string,
    attachments: IdeaAttachment[],
  ): Promise<Idea>;
  withdraw(ideaId: string, reason: string): Promise<Idea>;
}

/** Unwraps an ActionResult, throwing a plain Error on failure. Callers (ideaWorkflow) already discard the message and map to typed, Arabic-localized codes — see workflowErrorMessages.ts — so no localization is needed here. */
function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function toSubmitterType(value: IdeaRow['submitter_type']): SubmitterType {
  return value === 'INTERNAL' ? 'internal' : 'external';
}

function toBackendSubmitterType(value: SubmitterType): 'INTERNAL' | 'EXTERNAL' {
  return value === 'internal' ? 'INTERNAL' : 'EXTERNAL';
}

function toStatusHistoryEntry(row: IdeaStatusHistoryRow): IdeaStatusHistoryEntry {
  return {
    id: row.id,
    ideaId: row.idea_id,
    status: row.to_status,
    changedAt: row.changed_at,
    note: row.note ?? undefined,
  };
}

function toInformationRequest(row: InformationRequestRow): InformationRequest {
  return {
    id: row.id,
    ideaId: row.idea_id,
    message: row.request_text,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at ?? undefined,
    response: row.response_text ?? undefined,
  };
}

/** The real `Idea.title`/`.organizationId` fields the Idea entity needs, built once statusHistory/informationRequests/org name/category name are all resolved. */
function toIdea(
  row: IdeaRow,
  organizationName: string,
  categoryName: string,
  statusHistory: IdeaStatusHistoryEntry[],
  informationRequests: InformationRequest[],
): Idea {
  // The graph's WITHDRAWN status_history entry carries the real withdrawal
  // timestamp — the `ideas` table itself has no `withdrawn_at` column, only
  // `withdrawal_reason` (see IdeaRow).
  const withdrawnEntry =
    row.status === 'WITHDRAWN'
      ? [...statusHistory].reverse().find((h) => h.status === 'WITHDRAWN')
      : undefined;

  return {
    id: row.id,
    title: row.title,
    organizationId: row.organization_id,
    organizationName,
    // Fallback matches viewModels' own `idea.category || 'بدون تصنيف'` — kept
    // empty here (not pre-filled) so that single source of truth stays in viewModels.
    category: categoryName,
    categoryId: row.category_id,
    description: row.description,
    problem: row.problem_statement,
    proposedSolution: row.proposed_solution,
    expectedImpact: row.expected_impact,
    status: row.status,
    submitterType: toSubmitterType(row.submitter_type),
    attachments: [],
    statusHistory,
    informationRequests,
    relatedProjectId: row.project_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at ?? undefined,
    withdrawnAt: withdrawnEntry?.changedAt,
    withdrawReason: row.withdrawal_reason ?? undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const result = await getSessionUserAction();
  if (!result.ok || !result.data) {
    throw new Error('No active session.');
  }
  return result.data.id;
}

/** organizationId -> display name, for every organization the current actor belongs to. */
async function resolveOrganizationNames(): Promise<Map<string, string>> {
  const orgs = unwrap(await listMyOrganizationsAction());
  return new Map(orgs.map((org) => [org.id, org.name]));
}

/** categoryId -> display name, for one organization. `activeOnly: false` — an idea may reference a category that has since been deactivated/archived; it must still resolve to a name. */
async function resolveCategoryNames(organizationId: string): Promise<Map<string, string>> {
  const categories = unwrap(await listIdeaCategoriesAction({ organizationId, activeOnly: false }));
  return new Map(categories.map((c) => [c.id, c.name]));
}

/** Fetches statusHistory + informationRequests for one idea and assembles the full `Idea`. */
async function enrichRow(
  row: IdeaRow,
  organizationNames: Map<string, string>,
  categoryNames: Map<string, string>,
): Promise<Idea> {
  const [historyResult, requestsResult] = await Promise.all([
    listIdeaStatusHistoryAction({ ideaId: row.id }),
    listInformationRequestsAction({ ideaId: row.id }),
  ]);
  const statusHistory = unwrap(historyResult).map(toStatusHistoryEntry);
  const informationRequests = unwrap(requestsResult).map(toInformationRequest);

  return toIdea(
    row,
    organizationNames.get(row.organization_id) ?? '',
    categoryNames.get(row.category_id) ?? '',
    statusHistory,
    informationRequests,
  );
}

class NeonIdeaService implements IdeaService {
  async list(query?: IdeaListQuery): Promise<Idea[]> {
    const organizationNames = await resolveOrganizationNames();

    // No organization filter: aggregate across every organization the actor
    // belongs to — matching "أفكاري" (my ideas), the only thing this
    // interface has ever shown, across every organization the innovator
    // works with.
    const organizationIds = query?.organizationId
      ? [query.organizationId]
      : Array.from(organizationNames.keys());
    if (organizationIds.length === 0) return [];

    const currentUserId = await getCurrentUserId();

    const rowLists = await Promise.all(
      organizationIds.map((organizationId) =>
        listIdeasAction({ organizationId, status: query?.status, submitterId: currentUserId }).then(unwrap),
      ),
    );
    let rows = rowLists.flat();

    if (query?.search) {
      const q = query.search.trim().toLowerCase();
      rows = rows.filter((row) => row.title.toLowerCase().includes(q));
    }
    if (query?.categoryId) {
      rows = rows.filter((row) => row.category_id === query.categoryId);
    }

    const categoryNamesByOrg = new Map<string, Map<string, string>>();
    await Promise.all(
      Array.from(new Set(rows.map((r) => r.organization_id))).map(async (organizationId) => {
        categoryNamesByOrg.set(organizationId, await resolveCategoryNames(organizationId));
      }),
    );

    const ideas = await Promise.all(
      rows.map((row) =>
        enrichRow(row, organizationNames, categoryNamesByOrg.get(row.organization_id) ?? new Map()),
      ),
    );

    const { sortBy, sortDirection } = resolveIdeaSort(query?.sort);
    ideas.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return ideas;
  }

  async getById(id: string): Promise<Idea> {
    const row = unwrap(await getIdeaAction({ ideaId: id }));
    const [organizationNames, categoryNames] = await Promise.all([
      resolveOrganizationNames(),
      resolveCategoryNames(row.organization_id),
    ]);
    return enrichRow(row, organizationNames, categoryNames);
  }

  async saveDraft(
    values: IdeaFormValues,
    _attachments: IdeaAttachment[],
    draftId?: string,
    submitterType: SubmitterType = 'internal',
  ): Promise<Idea> {
    const ideaId = draftId
      ? unwrap(
          await updateIdeaAction({
            ideaId: draftId,
            title: values.title,
            description: values.description,
            problemStatement: values.problem,
            proposedSolution: values.proposedSolution,
            expectedImpact: values.expectedImpact,
            categoryId: values.category,
          }),
        ).id
      : unwrap(
          await createIdeaAction({
            organizationId: values.organizationId,
            title: values.title,
            description: values.description,
            problemStatement: values.problem,
            proposedSolution: values.proposedSolution,
            expectedImpact: values.expectedImpact,
            categoryId: values.category,
            submitterType: toBackendSubmitterType(submitterType),
          }),
        ).id;

    return this.getById(ideaId);
  }

  async submit(
    values: IdeaFormValues,
    _attachments: IdeaAttachment[],
    draftId?: string,
    submitterType: SubmitterType = 'internal',
  ): Promise<Idea> {
    const ideaId = draftId
      ? unwrap(
          await updateIdeaAction({
            ideaId: draftId,
            title: values.title,
            description: values.description,
            problemStatement: values.problem,
            proposedSolution: values.proposedSolution,
            expectedImpact: values.expectedImpact,
            categoryId: values.category,
          }),
        ).id
      : unwrap(
          await createIdeaAction({
            organizationId: values.organizationId,
            title: values.title,
            description: values.description,
            problemStatement: values.problem,
            proposedSolution: values.proposedSolution,
            expectedImpact: values.expectedImpact,
            categoryId: values.category,
            submitterType: toBackendSubmitterType(submitterType),
          }),
        ).id;

    // See the KNOWN GAPS note above — this legitimately fails server-side
    // (InvalidTransitionError -> SUBMIT_FAILED) if `ideaId` is currently
    // NEEDS_INFORMATION.
    unwrap(await transitionIdeaStatusAction({ ideaId, toStatus: 'SUBMITTED' }));
    return this.getById(ideaId);
  }

  async respondToInformationRequest(
    ideaId: string,
    requestId: string,
    response: string,
    _attachments: IdeaAttachment[],
  ): Promise<Idea> {
    void _attachments; // Real file storage is out of scope this phase — see KNOWN GAPS above.
    unwrap(await respondToInformationRequestAction({ requestId, responseText: response }));
    return this.getById(ideaId);
  }

  async withdraw(ideaId: string, reason: string): Promise<Idea> {
    unwrap(await withdrawIdeaAction({ ideaId, reason }));
    return this.getById(ideaId);
  }
}

export const ideaService: IdeaService = new NeonIdeaService();

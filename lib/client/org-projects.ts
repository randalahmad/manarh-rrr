/**
 * Client-side data layer for the Org Admin Project Core pages
 * (`app/org/projects/**`, and the project-conversion flow on
 * `app/org/decisions/[id]/page.tsx`) — Phase 6, Group D.
 *
 * Mirrors `lib/client/org-ideas.ts`'s pattern: a narrow, additive data
 * source backed by real Server Actions, used only by these pages.
 *
 * SCOPE (per the user-approved Group D decisions):
 *  - Project creation from an approved idea, listing, details, and the
 *    canonical 15-status workflow (including BLOCKED/ON_HOLD ->
 *    previous_active_status) are all real.
 *  - Project sub-resources (requirements, team, tasks, risks, KPIs,
 *    budget breakdown, project-level decisions, documents, updates,
 *    impact) stay on the mock store (`useAppData()`) — Group E scope,
 *    untouched here. A real project's id will simply never match any mock
 *    sub-resource row, so those tabs render empty for a real project —
 *    expected, not a bug, matching the precedent already established for
 *    idea-side out-of-scope domains (see org-ideas.ts's KNOWN GAPS note).
 *  - The strategic-goal filter/lookup on the project list/detail pages
 *    stays reading the mock store (`d.strategicGoals`) — Group F scope.
 */
import type { Project, ProjectStatus } from "@/lib/types";
import {
  createProjectFromIdeaAction,
  transitionProjectStatusAction,
  getProjectAction,
  listProjectsAction,
  listProjectOwnerCandidatesAction,
} from "@/lib/server/actions/projects";
import type { ProjectRow, ProjectOwnerCandidate } from "@/lib/server/services/projects";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export function mapProjectRow(row: ProjectRow): Project {
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

export async function fetchOrgProjects(
  organizationId: string,
  filters: { status?: ProjectStatus; ownerId?: string } = {}
): Promise<Project[]> {
  const rows = unwrap(await listProjectsAction({ organizationId, ...filters }));
  return rows.map(mapProjectRow);
}

export async function fetchOrgProject(projectId: string): Promise<Project> {
  return mapProjectRow(unwrap(await getProjectAction({ projectId })));
}

export async function fetchProjectOwnerCandidates(organizationId: string): Promise<ProjectOwnerCandidate[]> {
  return unwrap(await listProjectOwnerCandidatesAction({ organizationId }));
}

export async function createProjectFromIdea(input: {
  organizationId: string;
  ideaId: string;
  name: string;
  description: string;
  ownerId: string;
  startDate: string;
  expectedCompletionDate: string;
  budget?: number;
}): Promise<Project> {
  return mapProjectRow(unwrap(await createProjectFromIdeaAction(input)));
}

export async function transitionProject(projectId: string, toStatus: ProjectStatus): Promise<Project> {
  return mapProjectRow(unwrap(await transitionProjectStatusAction({ projectId, toStatus })));
}

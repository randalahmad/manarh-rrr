/**
 * Client-side data layer for the Innovation Specialist Project Core pages
 * (`app/innovation-specialist/(dashboard)/projects/**`) — Phase 6, Group D.
 *
 * Mirrors the shape of `lib/client/org-projects.ts` (same Server Actions,
 * same underlying `ProjectRow`) but is kept as an independent module,
 * matching this codebase's established pattern of each of the three
 * interfaces owning its own data-layer file (see specialist-ideas.ts's own
 * header note).
 *
 * SCOPE (per the user-approved Group D decisions for this interface):
 *  - The real 15-status canonical workflow (`lib/types.ts`'s `ProjectStatus`)
 *    is mapped DOWN into this interface's pre-existing 5-value local status
 *    type (`lib/innovation-specialist/types.ts`'s `ProjectStatus`) for
 *    PRESENTATION ONLY — see `mapToSpecialistStatus` below. Nothing is
 *    persisted in this bucketed shape; every mutation still goes through
 *    the real 15-status action (`transitionProjectStatusAction`).
 *  - `priority` and `phase` have no real backend column at all (see
 *    db/migrations/0005_project_delivery.sql) — never fabricated, always
 *    `undefined` for a real project (the type was loosened to optional for
 *    exactly this reason).
 *  - `openRequirements` is a Group E (`project_requirements`) concept —
 *    always `0` for a real project, not fabricated, not queried.
 *  - `attentionReason` is UI-invented business logic in the mock (no
 *    backing rule anywhere) — never computed for a real project, always
 *    `undefined`, so a real project never appears in the "تحتاج متابعة"
 *    section (which is exactly correct: no real rule says it should).
 *  - `action` defaults to the generic, always-valid "عرض المشروع" for real
 *    projects — not derived from `attentionReason` (which would require
 *    fabricating the reason first).
 *  - `manager` and `lastUpdate`/`updatePeriod` ARE real: `manager` resolves
 *    the real `owner_id` to a display name, and `lastUpdate`/`updatePeriod`
 *    are derived from the project's own real `updated_at` column (not a
 *    Group E concept — it's the project's own top-level timestamp).
 *  - No per-specialist "assigned projects" filter is applied. The real
 *    per-specialist assignment table (`project_follow_up_assignments`) is
 *    Group E scope and is not queried here. Since INNOVATION_SPECIALIST has
 *    org-wide PROJECT:VIEW in the real seeded catalog
 *    (db/migrations/0010_rbac_seed.sql), the least-fabricated real
 *    substitute is every project in the specialist's organization — broader
 *    than the mock's per-specialist scoping, not narrower, and not a
 *    permission expansion (the specialist already has this access).
 */
import type { ProjectListItem } from "@/lib/innovation-specialist/types";
import type { ProjectStatus as RealProjectStatus } from "@/lib/types";
import { getSessionUserAction } from "@/lib/mock-server/actions/auth";
import { listProjectsAction, getProjectAction, transitionProjectStatusAction } from "@/lib/mock-server/actions/projects";
import type { ProjectRow } from "@/lib/server/services/projects";
import { getIdeaAction } from "@/lib/mock-server/actions/ideas";
import { getUsersDisplayInfoAction } from "@/lib/mock-server/actions/user-directory";
import type { ActionResult } from "@/lib/server/errors";

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

/**
 * Presentational grouping of the real 15-status canonical workflow into
 * this interface's pre-existing 5 buckets — the "planning" cluster covers
 * every status before execution begins, the "in progress" cluster covers
 * execution through active delivery, BLOCKED/ON_HOLD map 1:1, and every
 * terminal status (COMPLETED/CLOSED/ARCHIVED) reads as "مكتمل". Nothing
 * here is a new status or transition — the real graph
 * (lib/server/workflow/project-status.ts) remains the only source of truth
 * for what transitions are legal.
 */
export function mapToSpecialistStatus(status: RealProjectStatus): ProjectListItem["status"] {
  switch (status) {
    case "PROJECT_CREATED":
    case "DEVELOPMENT":
    case "PLANNING":
    case "ASSIGN_STAKEHOLDERS":
    case "DEFINE_REQUIREMENTS":
    case "DEFINE_TIMELINE":
      return "قيد التخطيط";
    case "EXECUTION":
    case "TESTING":
    case "LAUNCH":
    case "IN_PROGRESS":
      return "قيد التنفيذ";
    case "BLOCKED":
      return "متعثر";
    case "ON_HOLD":
      return "معلق";
    case "COMPLETED":
    case "CLOSED":
    case "ARCHIVED":
      return "مكتمل";
  }
}

function updatePeriodFor(updatedAt: string): "today" | "week" | "older" {
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  if (days < 1) return "today";
  if (days < 7) return "week";
  return "older";
}

async function toProjectListItem(
  row: ProjectRow,
  ideaTitle: string,
  managerName: string
): Promise<ProjectListItem> {
  return {
    id: row.id,
    name: row.name,
    ideaId: row.idea_id,
    ideaTitle,
    manager: managerName,
    phase: undefined,
    status: mapToSpecialistStatus(row.status),
    priority: undefined,
    completion: row.progress,
    openRequirements: 0,
    lastUpdate: new Date(row.updated_at).toLocaleDateString("ar-SA"),
    updatePeriod: updatePeriodFor(row.updated_at),
    action: "عرض المشروع",
    attentionReason: undefined,
  };
}

/** Every project in the specialist's organization — see the SCOPE note above for why this isn't narrowed to a per-specialist assignment. */
export async function fetchOrgProjects(organizationId: string): Promise<ProjectListItem[]> {
  const rows = unwrap(await listProjectsAction({ organizationId }));
  if (rows.length === 0) return [];

  const uniqueIdeaIds = Array.from(new Set(rows.map((r) => r.idea_id)));
  const [ideaTitles, managerNames] = await Promise.all([
    Promise.all(
      uniqueIdeaIds.map((ideaId) =>
        getIdeaAction({ ideaId }).then((res) => [ideaId, res.ok ? res.data.title : "—"] as const)
      )
    ).then((entries) => new Map(entries)),
    getUsersDisplayInfoAction({ userIds: Array.from(new Set(rows.map((r) => r.owner_id))) }).then((res) =>
      res.ok ? new Map(Object.entries(res.data).map(([id, u]) => [id, u.fullName])) : new Map<string, string>()
    ),
  ]);

  return Promise.all(
    rows.map((row) => toProjectListItem(row, ideaTitles.get(row.idea_id) ?? "—", managerNames.get(row.owner_id) ?? "—"))
  );
}

export interface SpecialistProjectDetail {
  /** The bucketed, presentation-only view used by the list/summary cards. */
  item: ProjectListItem;
  /** The real, granular status — needed to drive the real workflow-transition buttons (never the bucketed value). */
  statusValue: RealProjectStatus;
  previousActiveStatus: RealProjectStatus | null;
  /** Real columns the overview tab needs but `ProjectListItem` never carries (see its own field-by-field note). */
  description: string;
  budget?: number;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
}

export async function fetchSpecialistProject(projectId: string): Promise<SpecialistProjectDetail> {
  const row = unwrap(await getProjectAction({ projectId }));
  const [ideaResult, usersResult] = await Promise.all([
    getIdeaAction({ ideaId: row.idea_id }),
    getUsersDisplayInfoAction({ userIds: [row.owner_id] }),
  ]);
  const ideaTitle = ideaResult.ok ? ideaResult.data.title : "—";
  const managerName = usersResult.ok ? (usersResult.data[row.owner_id]?.fullName ?? "—") : "—";
  return {
    item: await toProjectListItem(row, ideaTitle, managerName),
    statusValue: row.status,
    previousActiveStatus: row.previous_active_status,
    description: row.description,
    budget: row.budget ?? undefined,
    startDate: row.start_date,
    expectedCompletionDate: row.expected_completion_date,
    actualCompletionDate: row.actual_completion_date ?? undefined,
  };
}

export async function transitionSpecialistProject(projectId: string, toStatus: RealProjectStatus): Promise<void> {
  unwrap(await transitionProjectStatusAction({ projectId, toStatus }));
}

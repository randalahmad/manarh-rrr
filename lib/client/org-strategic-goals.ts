/**
 * Client-side data layer for the Org Admin Strategic Goals page
 * (`app/org/strategic-goals/page.tsx`) — Phase 6, Group F.
 *
 * Mirrors `lib/client/org-projects.ts`'s pattern: a narrow, additive data
 * source backed by real Server Actions, used only by this page.
 *
 * SCOPE (per the user-approved Group F decisions):
 *  - List and create are real. There is no edit/archive UI in the existing
 *    mock to wire, so none was added here — `updateStrategicGoalAction`
 *    exists server-side but has no caller yet, matching "do not add new
 *    UI unless absolutely required."
 *  - Idea/Project <-> Strategic Goal linkage is explicitly DEFERRED. The
 *    real `linked_ideas_count`/`linked_projects_count` columns exist and
 *    are surfaced here as-is (always 0 today — no service writes them
 *    yet), rather than fabricated by cross-referencing the unrelated mock
 *    `ideas`/`projects` arrays, which would never match a real goal's id
 *    anyway. This is a known, documented limitation, not a bug.
 *  - Categories, Challenges, Opportunities, and Reports keep reading the
 *    mock `d.strategicGoals` store untouched — out of scope this group.
 */
import type { StrategicGoal } from "@/lib/types";
import {
  createStrategicGoalAction,
  listStrategicGoalsAction,
} from "@/lib/server/actions/strategic-goals";
import type { StrategicGoalRow } from "@/lib/server/services/strategic-goals";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export function mapStrategicGoalRow(row: StrategicGoalRow): StrategicGoal {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    status: row.status,
    targetValue: row.target_value ?? undefined,
    currentValue: row.current_value ?? undefined,
    unit: row.unit ?? undefined,
    measurementPeriodStart: row.measurement_period_start ?? undefined,
    measurementPeriodEnd: row.measurement_period_end ?? undefined,
    ownerId: row.owner_id ?? undefined,
    progressPercentage: row.progress_percentage ?? undefined,
    linkedIdeasCount: row.linked_ideas_count,
    linkedProjectsCount: row.linked_projects_count,
    createdAt: row.created_at,
  };
}

export async function fetchOrgStrategicGoals(organizationId: string): Promise<StrategicGoal[]> {
  const rows = unwrap(await listStrategicGoalsAction({ organizationId }));
  return rows.map(mapStrategicGoalRow);
}

export async function createOrgStrategicGoal(input: {
  organizationId: string;
  name: string;
  description: string;
  targetValue?: number;
  unit?: string;
  ownerId?: string;
}): Promise<StrategicGoal> {
  return mapStrategicGoalRow(unwrap(await createStrategicGoalAction(input)));
}

/**
 * Canonical project status workflow — pure, DB-free predicate functions.
 *
 * Unlike the idea workflow, NO project transition graph existed anywhere
 * in the codebase or in the approved Phase 3/4 architecture before this
 * file — Phase 5 initially marked this BLOCKED / PENDING BUSINESS
 * DECISION rather than invent one. The user then supplied the exact graph
 * below, which this module implements verbatim and nothing more.
 *
 * Shape of the rule:
 *   - A strict LINEAR chain: each of the 12 "forward" statuses has
 *     exactly one legal next status. No skipping ahead, no going back —
 *     "do not allow arbitrary project status changes."
 *   - BLOCKED and ON_HOLD are PAUSE states, enterable only from 8 named
 *     active statuses (not PROJECT_CREATED, not LAUNCH, not any of the
 *     three terminal statuses).
 *   - Leaving a pause state does not resume to an arbitrary destination —
 *     it restores EXACTLY the status the project was in immediately
 *     before it paused. That value is persisted in
 *     `projects.previous_active_status` (added in
 *     db/migrations/0009_project_workflow_state.sql specifically to
 *     support this) and passed into `canTransitionProject` /
 *     `resolveProjectTransition` as `previousActiveStatus`.
 *   - COMPLETED -> CLOSED -> ARCHIVED are terminal progression steps and
 *     never transition backwards (this falls out of the linear chain
 *     simply having no backward edges defined at all — true for every
 *     status, not just these three).
 */
import type { ProjectStatus } from "@/lib/types";

/** The one legal "forward" destination for each status in the linear chain. `null` = terminal (ARCHIVED), or not part of the linear chain (BLOCKED, ON_HOLD are pause states, handled separately). */
export const PROJECT_LINEAR_TRANSITIONS: Record<ProjectStatus, ProjectStatus | null> = {
  PROJECT_CREATED: "DEVELOPMENT",
  DEVELOPMENT: "PLANNING",
  PLANNING: "ASSIGN_STAKEHOLDERS",
  ASSIGN_STAKEHOLDERS: "DEFINE_REQUIREMENTS",
  DEFINE_REQUIREMENTS: "DEFINE_TIMELINE",
  DEFINE_TIMELINE: "EXECUTION",
  EXECUTION: "TESTING",
  TESTING: "LAUNCH",
  LAUNCH: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "CLOSED",
  CLOSED: "ARCHIVED",
  ARCHIVED: null,
  BLOCKED: null,
  ON_HOLD: null,
};

/** Statuses BLOCKED and ON_HOLD may be entered from. Verbatim from the approved decision — notably excludes PROJECT_CREATED, LAUNCH, and the three terminal statuses. */
export const PAUSE_ENTRY_STATUSES: readonly ProjectStatus[] = [
  "DEVELOPMENT",
  "PLANNING",
  "ASSIGN_STAKEHOLDERS",
  "DEFINE_REQUIREMENTS",
  "DEFINE_TIMELINE",
  "EXECUTION",
  "TESTING",
  "IN_PROGRESS",
];

export const PAUSE_STATUSES: readonly ProjectStatus[] = ["BLOCKED", "ON_HOLD"];

export function isPauseStatus(status: ProjectStatus): boolean {
  return PAUSE_STATUSES.includes(status);
}

export function canEnterPause(from: ProjectStatus): boolean {
  return PAUSE_ENTRY_STATUSES.includes(from);
}

/**
 * The full transition check. `previousActiveStatus` is required (and only
 * meaningful) when `from` is BLOCKED or ON_HOLD — pass the value currently
 * stored on `projects.previous_active_status` for that project.
 */
export function canTransitionProject(
  from: ProjectStatus,
  to: ProjectStatus,
  previousActiveStatus?: ProjectStatus | null
): boolean {
  if (isPauseStatus(to)) {
    // Entering a pause state: only from one of the 8 named active statuses,
    // and never from another pause state (BLOCKED <-> ON_HOLD is not allowed —
    // leaving a pause state must restore the prior active status, not hop
    // to the other pause state).
    return canEnterPause(from);
  }
  if (isPauseStatus(from)) {
    // Leaving a pause state: must restore exactly the stored previous
    // active status. No other destination is legal, including re-entering
    // the linear chain at any other point.
    return previousActiveStatus != null && to === previousActiveStatus;
  }
  return PROJECT_LINEAR_TRANSITIONS[from] === to;
}

/**
 * Convenience for the service layer: given the current status and (when
 * pausing) the value to remember, returns what `projects.status` and
 * `projects.previous_active_status` should become — or throws-by-return
 * (null) if the transition is illegal, so the caller can raise
 * InvalidTransitionError with full context.
 */
export interface ProjectTransitionResult {
  nextStatus: ProjectStatus;
  /** What projects.previous_active_status should be set to. `undefined` = leave column unchanged. `null` = clear it. */
  nextPreviousActiveStatus?: ProjectStatus | null;
}

export function resolveProjectTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  previousActiveStatus: ProjectStatus | null
): ProjectTransitionResult | null {
  if (!canTransitionProject(from, to, previousActiveStatus)) return null;
  if (isPauseStatus(to)) {
    // Entering a pause: remember what was active.
    return { nextStatus: to, nextPreviousActiveStatus: from };
  }
  if (isPauseStatus(from)) {
    // Leaving a pause: clear the memory, we're back on the linear chain.
    return { nextStatus: to, nextPreviousActiveStatus: null };
  }
  return { nextStatus: to };
}

/**
 * Phase 6, Group D addition — the project-workflow equivalent of
 * `allowedIdeaTransitions` (lib/server/workflow/idea-status.ts). Pure and
 * DB-free, so UI components can import it directly (client-side) to render
 * only the legal next statuses, exactly like the idea detail pages already
 * do — instead of the old mock's unguarded 15-option `<select>`. Returns
 * every legal destination for `from`: the one linear "forward" step (if
 * any), plus BLOCKED/ON_HOLD when `from` is a pause-entry status, or the
 * single stored `previousActiveStatus` when `from` is itself a pause state.
 */
export function allowedProjectTransitions(
  from: ProjectStatus,
  previousActiveStatus: ProjectStatus | null
): ProjectStatus[] {
  if (isPauseStatus(from)) {
    return previousActiveStatus ? [previousActiveStatus] : [];
  }
  const options: ProjectStatus[] = [];
  const next = PROJECT_LINEAR_TRANSITIONS[from];
  if (next) options.push(next);
  if (canEnterPause(from)) options.push("BLOCKED", "ON_HOLD");
  return options;
}

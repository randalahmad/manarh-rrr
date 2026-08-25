/**
 * Canonical idea status workflow — pure, DB-free predicate functions.
 *
 * Source of truth: the ONLY explicit transition graph that existed
 * anywhere in the codebase before Phase 5 — `workflowTransitions` in
 * lib/store.tsx (Org Admin interface) — extended with exactly the two
 * decisions the user made explicitly during Phase 5 scoping:
 *
 *   1. Withdrawal: a separate, actor-initiated action (not a generic
 *      graph edge), allowed only from the innovator's approved status
 *      list. See `canWithdrawIdea`.
 *   2. NOT_PURSUED: previously unreachable from any status anywhere in
 *      the codebase. Approved path: DEFERRED -> NOT_PURSUED.
 *
 * Every other edge below is copied verbatim from lib/store.tsx's
 * `workflowTransitions` map — nothing here was invented. Statuses with no
 * outgoing entry (NOT_PURSUED, REJECTED, WITHDRAWN, ARCHIVED) are
 * terminal by design: no further transition is defined for them.
 */
import type { IdeaStatus } from "@/lib/types";

export const IDEA_TRANSITIONS: Partial<Record<IdeaStatus, IdeaStatus[]>> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["INITIAL_SCREENING"],
  INITIAL_SCREENING: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "UNDER_EVALUATION", "RETURNED_FOR_REVIEW"],
  NEEDS_INFORMATION: ["RETURNED_FOR_REVIEW"],
  RETURNED_FOR_REVIEW: ["UNDER_REVIEW", "UNDER_EVALUATION"],
  UNDER_EVALUATION: ["RECOMMENDATION_SUBMITTED", "NEEDS_INFORMATION"],
  RECOMMENDATION_SUBMITTED: ["PENDING_DECISION"],
  PENDING_DECISION: ["APPROVED", "CONDITIONALLY_APPROVED", "DEFERRED", "REJECTED", "NEEDS_INFORMATION"],
  APPROVED: ["IDEA_DEVELOPMENT", "CONVERTED_TO_PROJECT"],
  CONDITIONALLY_APPROVED: ["IDEA_DEVELOPMENT", "CONVERTED_TO_PROJECT", "RETURNED_FOR_REVIEW"],
  IDEA_DEVELOPMENT: ["CONVERTED_TO_PROJECT"],
  CONVERTED_TO_PROJECT: ["ARCHIVED"],
  // Approved Phase 5 decision: this is the only path to NOT_PURSUED.
  DEFERRED: ["NOT_PURSUED"],
};

/** Every status an idea can move to from `from`, per the canonical graph. Empty array for a terminal status. */
export function allowedIdeaTransitions(from: IdeaStatus): IdeaStatus[] {
  return IDEA_TRANSITIONS[from] ?? [];
}

export function canTransitionIdea(from: IdeaStatus, to: IdeaStatus): boolean {
  return allowedIdeaTransitions(from).includes(to);
}

/**
 * Approved Phase 5 decision ("Innovator's allow-list"): an idea can only
 * be withdrawn from one of these statuses. Copied verbatim from
 * components/innovator-src/features/ideas/policies.ts's WITHDRAW allow-list
 * (the one part of that file's ALLOWED_STATUSES the user confirmed as the
 * rule to enforce platform-wide, resolving the conflict with the Org
 * Admin mock's unrestricted `withdrawIdea`, which had no rule at all).
 */
export const WITHDRAWABLE_IDEA_STATUSES: readonly IdeaStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
  "UNDER_EVALUATION",
  "RECOMMENDATION_SUBMITTED",
  "PENDING_DECISION",
  "RETURNED_FOR_REVIEW",
  "DEFERRED",
];

export function canWithdrawIdea(status: IdeaStatus): boolean {
  return WITHDRAWABLE_IDEA_STATUSES.includes(status);
}

/**
 * Approved Phase 6 Group B decision: an idea's own content fields
 * (title/description/problem/solution/impact/category/challenge/
 * opportunity) can only be edited by its submitter while in one of these
 * statuses. Copied verbatim from the innovator's own already-shipped
 * `components/innovator-src/features/ideas/policies.ts`'s
 * `ALLOWED_STATUSES.SAVE_DRAFT` list — same "mirror the existing approved
 * UI policy into the backend" approach Phase 5 used for withdrawal — not a
 * newly invented rule.
 */
export const EDITABLE_IDEA_STATUSES: readonly IdeaStatus[] = ["DRAFT", "NEEDS_INFORMATION"];

export function canEditIdea(status: IdeaStatus): boolean {
  return EDITABLE_IDEA_STATUSES.includes(status);
}

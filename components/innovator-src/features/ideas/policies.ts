import type { Idea, IdeaStatus } from './types';

/**
 * Centralized Idea Transition Policy.
 *
 * ASSUMPTION (not confirmed by backend/PRD yet): the exact status sets below
 * — which statuses allow editing/withdrawal/responding to an information
 * request — are UI-level judgment calls, not confirmed backend business
 * rules. They are intentionally centralized in ONE table so the actual rule
 * can change in one place once backend business rules are confirmed,
 * instead of being re-implemented per screen or per service call.
 *
 * `ideaWorkflow` consults this policy before performing any operation and
 * refuses (throws `IdeaWorkflowError('INVALID_TRANSITION')`) if the
 * transition isn't allowed — so an invalid transition can't happen even if
 * a UI bug lets the user reach the action.
 */

export type IdeaOperation = 'SAVE_DRAFT' | 'SUBMIT' | 'WITHDRAW' | 'COMPLETE_INFORMATION';

const TERMINAL_STATUSES: IdeaStatus[] = ['APPROVED', 'NOT_PURSUED', 'WITHDRAWN'];

/** Statuses an idea must currently be in for the operation to be allowed. Ignored for brand-new (not-yet-created) ideas — see `canPerformIdeaOperation`. */
const ALLOWED_STATUSES: Record<IdeaOperation, IdeaStatus[]> = {
  SAVE_DRAFT: ['DRAFT', 'NEEDS_INFORMATION'],
  SUBMIT: ['DRAFT', 'NEEDS_INFORMATION'],
  WITHDRAW: [
    'SUBMITTED',
    'UNDER_REVIEW',
    'NEEDS_INFORMATION',
    'UNDER_EVALUATION',
    'RECOMMENDATION_SUBMITTED',
    'PENDING_DECISION',
    'RETURNED_FOR_REVIEW',
    'DEFERRED',
  ],
  COMPLETE_INFORMATION: ['NEEDS_INFORMATION'],
};

/**
 * `currentStatus` is `null` for an idea that doesn't exist yet (creating a
 * brand-new idea) — only SAVE_DRAFT and SUBMIT make sense in that case.
 */
export function canPerformIdeaOperation(operation: IdeaOperation, currentStatus: IdeaStatus | null): boolean {
  if (currentStatus === null) {
    return operation === 'SAVE_DRAFT' || operation === 'SUBMIT';
  }
  return ALLOWED_STATUSES[operation].includes(currentStatus);
}

export function isIdeaInTerminalState(status: IdeaStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canViewProject(idea: Idea): boolean {
  return idea.status === 'APPROVED' && Boolean(idea.relatedProjectId);
}

/** Thin, readable wrappers over the policy table — kept so existing call sites don't need to know operation names. */
export function canEditIdea(status: IdeaStatus): boolean {
  return canPerformIdeaOperation('SAVE_DRAFT', status);
}

export function canWithdrawIdea(status: IdeaStatus): boolean {
  return canPerformIdeaOperation('WITHDRAW', status);
}

export function canRespondToInformationRequest(status: IdeaStatus): boolean {
  return canPerformIdeaOperation('COMPLETE_INFORMATION', status);
}

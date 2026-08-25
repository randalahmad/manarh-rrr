import type { Idea, IdeaStatus } from './types';

/**
 * ASSUMPTION: which statuses count as "قيد المراجعة" for the dashboard
 * summary card is a UI grouping decision, not a confirmed backend concept —
 * there is no single backend status called "under review" that covers all
 * of these. Centralized here so it can be adjusted in one place once the
 * business rule is confirmed, instead of being reimplemented per screen.
 */
const UNDER_REVIEW_GROUP: IdeaStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'UNDER_EVALUATION',
  'RECOMMENDATION_SUBMITTED',
  'PENDING_DECISION',
];

export function isUnderReviewGroup(status: IdeaStatus): boolean {
  return UNDER_REVIEW_GROUP.includes(status);
}

export function isNeedsInformation(status: IdeaStatus): boolean {
  return status === 'NEEDS_INFORMATION';
}

export function isApproved(status: IdeaStatus): boolean {
  return status === 'APPROVED';
}

export interface IdeaDashboardStats {
  total: number;
  underReview: number;
  needsInformation: number;
  approved: number;
}

export function computeIdeaStats(ideas: Idea[]): IdeaDashboardStats {
  return ideas.reduce<IdeaDashboardStats>(
    (acc, idea) => {
      acc.total += 1;
      if (isUnderReviewGroup(idea.status)) acc.underReview += 1;
      if (isNeedsInformation(idea.status)) acc.needsInformation += 1;
      if (isApproved(idea.status)) acc.approved += 1;
      return acc;
    },
    { total: 0, underReview: 0, needsInformation: 0, approved: 0 },
  );
}

/** Ideas that need the innovator's attention right now. */
export function getIdeasRequiringAction(ideas: Idea[]): Idea[] {
  return ideas.filter((idea) => isNeedsInformation(idea.status));
}

/** Most recently updated ideas, capped to `limit`. */
export function getRecentIdeas(ideas: Idea[], limit = 5): Idea[] {
  return [...ideas].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1)).slice(0, limit);
}

/** Returns the still-pending information request for an idea, if any. */
export function getActiveInformationRequest(idea: Idea) {
  return idea.informationRequests.find((req) => !req.respondedAt);
}

/**
 * Core shared models used across features.
 *
 * IMPORTANT: `User` intentionally does NOT carry a fixed `userType` /
 * internal|external flag. Per product decision, that classification is not a
 * property of the user — it is computed per Idea at submission time and
 * stored as `Idea.submitterType`. See `features/ideas/types.ts`.
 */

/** Literal values as specified — no other statuses invented. */
export const EMPLOYMENT_STATUSES = ['STUDENT', 'EMPLOYED', 'JOB_SEEKER'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  /** Helps advisors/staff understand the innovator's background. One of the three literal values above only. */
  employmentStatus?: EmploymentStatus;
  /**
   * The innovator's own workplace/school, written by them — free text, NOT
   * a reference to the `Organization` entity. There is no relationship
   * between `User` and `Organization` in this system (deliberately, per
   * the internal/external-per-idea design — see `Idea.submitterType`), and
   * this field must not become one. If a real, backend-confirmed
   * user↔organization relationship is introduced later, this can be
   * migrated to a reference at that point.
   */
  organizationName?: string;
  /** Field of study/expertise — free text, no approved value list exists. */
  specialization?: string;
  /** Short bio for advisors/staff to quickly understand the innovator's interests and direction. */
  bio?: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  description?: string;
}

/**
 * Optional, contextual info about how a user relates to a given
 * organization (e.g. to help the UI decide what to show/ask on a
 * public organization page). This is CONTEXT, not a stored user
 * classification — it must never be cached as a permanent user attribute.
 */
export interface OrganizationMembershipContext {
  organizationId: string;
  hasActiveMembership: boolean;
}

/** Generic paginated list envelope used by list-returning services. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Generic async request state, used where React Query state isn't already sufficient. */
export type RequestState = 'idle' | 'loading' | 'success' | 'error';

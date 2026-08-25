import type { IdeaSortOption } from './types';

/** UI-facing sort option labels — consumed by IdeasToolbar's sort <Select>. */
export const IDEA_SORT_OPTIONS: { value: IdeaSortOption; label: string }[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'recentlyUpdated', label: 'الأحدث تحديثًا' },
];

export interface ResolvedIdeaSort {
  sortBy: 'createdAt' | 'updatedAt';
  sortDirection: 'asc' | 'desc';
}

const SORT_OPTION_TO_RESOLVED: Record<IdeaSortOption, ResolvedIdeaSort> = {
  newest: { sortBy: 'createdAt', sortDirection: 'desc' },
  oldest: { sortBy: 'createdAt', sortDirection: 'asc' },
  recentlyUpdated: { sortBy: 'updatedAt', sortDirection: 'desc' },
};

/**
 * Internal-only: translates the public `IdeaSortOption` into the concrete
 * field/direction the mock service sorts by. Used exclusively inside
 * `ideaService` — nothing outside the service layer needs to know sorting
 * is implemented as a field+direction pair.
 */
export function resolveIdeaSort(option: IdeaSortOption = 'newest'): ResolvedIdeaSort {
  return SORT_OPTION_TO_RESOLVED[option];
}

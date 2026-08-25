/**
 * Centralized query key factories — avoids stringly-typed duplication
 * across hooks. Every leaf is a function (even parameterless ones), so
 * call sites are always `queryKeys.x.y()` — a single consistent syntax
 * with no special-cased plain-array exceptions to remember.
 *
 * Naming: `detail(id)` returns the raw domain entity (Idea/Project);
 * `detailView(id)` returns the aggregated, page-ready ViewModel produced
 * by the corresponding *DetailsService. The two are deliberately named
 * differently since they cache different shapes for different callers.
 */
export const queryKeys = {
  ideas: {
    all: () => ['ideas'] as const,
    list: (query?: unknown) => ['ideas', 'list', query] as const,
    detail: (id: string) => ['ideas', 'detail', id] as const,
    detailView: (id: string) => ['ideas', 'detailView', id] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    detailView: (id: string) => ['projects', 'detailView', id] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    feed: () => ['notifications', 'feed'] as const,
  },
  organizations: {
    all: () => ['organizations'] as const,
    list: () => ['organizations', 'list'] as const,
    bySlug: (slug: string) => ['organizations', 'slug', slug] as const,
    categories: (organizationId?: string) => ['organizations', 'categories', organizationId] as const,
  },
  profile: {
    current: () => ['profile', 'current'] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
    quickActions: () => ['dashboard', 'quickActions'] as const,
    requiredActions: () => ['dashboard', 'requiredActions'] as const,
    recentIdeas: (limit?: number) => ['dashboard', 'recentIdeas', limit] as const,
    projects: () => ['dashboard', 'projects'] as const,
    recentActivity: (limit?: number) => ['dashboard', 'recentActivity', limit] as const,
    statusDistribution: () => ['dashboard', 'statusDistribution'] as const,
  },
};

import { useMemo } from 'react';
import { useSearchParams } from '@innovator/_compat/react-router-shim';
import { IDEA_STATUSES, type IdeaListQuery, type IdeaStatus, type IdeaSortOption } from '../types';
import { IDEA_SORT_OPTIONS } from '../sortOptions';

/**
 * The only place in the app that knows idea list state lives in the URL.
 *
 *   URL ──► useIdeaListQuery() ──► IdeaListQuery ──► useIdeas(query) ──► ideaService.list(query)
 *
 * `useIdeas` (and `ideaService`) never import `react-router-dom` or touch
 * `URLSearchParams` — this hook is the sole translation layer between
 * routing and the data-fetching/business layer.
 */
export interface IdeaListQueryState {
  search: string;
  status: IdeaStatus | '';
  organizationId: string;
  categoryId: string;
  sort: IdeaSortOption;
}

const DEFAULT_SORT: IdeaSortOption = 'newest';
const STATUS_VALUES = new Set<string>(IDEA_STATUSES);
const SORT_VALUES = new Set<string>(IDEA_SORT_OPTIONS.map((o) => o.value));

function parseState(params: URLSearchParams): IdeaListQueryState {
  const status = params.get('status');
  const sort = params.get('sort');
  return {
    search: params.get('search') ?? '',
    status: status && STATUS_VALUES.has(status) ? (status as IdeaStatus) : '',
    organizationId: params.get('organization') ?? '',
    categoryId: params.get('category') ?? '',
    sort: sort && SORT_VALUES.has(sort) ? (sort as IdeaSortOption) : DEFAULT_SORT,
  };
}

function stateToParams(state: IdeaListQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.status) params.set('status', state.status);
  if (state.organizationId) params.set('organization', state.organizationId);
  if (state.categoryId) params.set('category', state.categoryId);
  if (state.sort && state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  return params;
}

function stateToQuery(state: IdeaListQueryState): IdeaListQuery {
  return {
    search: state.search || undefined,
    status: state.status || undefined,
    organizationId: state.organizationId || undefined,
    categoryId: state.categoryId || undefined,
    sort: state.sort,
  };
}

export function useIdeaListQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseState(searchParams), [searchParams]);

  const patch = (partial: Partial<IdeaListQueryState>) => {
    setSearchParams(stateToParams({ ...state, ...partial }), { replace: true });
  };

  const query = useMemo<IdeaListQuery>(() => stateToQuery(state), [state]);

  const hasActiveFilters = Boolean(state.search || state.status || state.organizationId || state.categoryId);

  return {
    state,
    query,
    hasActiveFilters,
    setSearch: (search: string) => patch({ search }),
    setStatus: (status: IdeaStatus | '') => patch({ status }),
    setOrganizationId: (organizationId: string) => patch({ organizationId }),
    setCategoryId: (categoryId: string) => patch({ categoryId }),
    setSort: (sort: IdeaSortOption) => patch({ sort }),
    reset: () => setSearchParams(new URLSearchParams(), { replace: true }),
  };
}

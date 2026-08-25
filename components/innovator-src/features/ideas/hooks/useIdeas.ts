import { useQuery } from '@tanstack/react-query';
import { ideaService } from '../services/ideaService';
import type { IdeaListQuery } from '../types';
import { queryKeys } from '@innovator/constants/queryKeys';

/**
 * Pure data hook — takes an already-built `IdeaListQuery` and knows nothing
 * about where that query came from (URL, form state, a saved view...).
 * Routing/URL concerns live entirely in `useIdeaListQuery`, one layer up.
 */
export function useIdeas(query?: IdeaListQuery) {
  return useQuery({
    queryKey: queryKeys.ideas.list(query),
    queryFn: () => ideaService.list(query),
  });
}

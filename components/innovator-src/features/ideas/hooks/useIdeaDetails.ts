import { useQuery } from '@tanstack/react-query';
import { ideaDetailsService } from '../services/ideaDetailsService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useIdeaDetails(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ideas.detailView(id ?? ''),
    queryFn: () => ideaDetailsService.getDetails(id!),
    enabled: Boolean(id),
  });
}

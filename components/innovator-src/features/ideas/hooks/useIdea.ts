import { useQuery } from '@tanstack/react-query';
import { ideaService } from '../services/ideaService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useIdea(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ideas.detail(id ?? ''),
    queryFn: () => ideaService.getById(id!),
    enabled: Boolean(id),
  });
}

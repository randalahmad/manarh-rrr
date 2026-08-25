import { useQuery } from '@tanstack/react-query';
import { projectDetailsService } from '../services/projectDetailsService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useProjectDetails(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detailView(id ?? ''),
    queryFn: () => projectDetailsService.getDetails(id!),
    enabled: Boolean(id),
  });
}

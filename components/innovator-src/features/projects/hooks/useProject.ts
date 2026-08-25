import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => projectService.getById(id!),
    enabled: Boolean(id),
  });
}

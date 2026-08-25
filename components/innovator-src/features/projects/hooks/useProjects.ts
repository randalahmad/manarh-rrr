import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectService.list(),
  });
}

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '@innovator/services/organizationService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => organizationService.list(),
  });
}

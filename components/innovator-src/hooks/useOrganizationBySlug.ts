import { useQuery } from '@tanstack/react-query';
import { organizationService } from '@innovator/services/organizationService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.bySlug(slug ?? ''),
    queryFn: () => organizationService.getBySlug(slug!),
    enabled: Boolean(slug),
  });
}

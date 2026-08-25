import { useQuery } from '@tanstack/react-query';
import { organizationService } from '@innovator/services/organizationService';
import { queryKeys } from '@innovator/constants/queryKeys';

/**
 * Categories are organization-scoped on the real backend
 * (`idea_categories.organization_id` is `NOT NULL`) — this hook now takes
 * the organization id explicitly and returns nothing until one is chosen
 * (Phase 6, Group B addition; previously a single global list existed).
 */
export function useCategories(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.categories(organizationId),
    queryFn: () => organizationService.listCategories(organizationId!),
    enabled: Boolean(organizationId),
  });
}

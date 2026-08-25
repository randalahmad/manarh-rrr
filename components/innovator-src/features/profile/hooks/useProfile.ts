import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { queryKeys } from '@innovator/constants/queryKeys';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: () => profileService.getCurrentUser(),
  });
}

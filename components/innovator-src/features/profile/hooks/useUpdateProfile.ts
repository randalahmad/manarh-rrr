import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileWorkflow } from '../services/profileWorkflow';
import type { ProfileUpdatePayload } from '../services/profileService';
import { useAuth } from '@innovator/app/providers/AuthContext';
import { queryKeys } from '@innovator/constants/queryKeys';

/** Calls only profileWorkflow — never profileService directly. Refreshes the auth session automatically when the update affects identity display (name/avatar). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileWorkflow.updateProfile(payload),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
      if (result.sessionRefreshRequired) {
        await refreshSession();
      }
    },
  });
}

import type { User } from '@innovator/types/common';
import { profileService, type ProfileUpdatePayload } from './profileService';

export interface ProfileUpdateResult {
  user: User;
  /** True when a field that the sidebar/header displays (name, avatar) actually changed. */
  sessionRefreshRequired: boolean;
}

/**
 * profileWorkflow abstraction.
 *
 * The single place responsible for updating the profile AND deciding
 * whether the identity shown elsewhere in the app (sidebar/header) needs to
 * refresh as a result. `useUpdateProfile` calls only this — never
 * `profileService` directly — so the "does the UI need to know about this"
 * decision lives in one place instead of being guessed at the call site.
 */
export interface ProfileWorkflow {
  updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResult>;
}

class DefaultProfileWorkflow implements ProfileWorkflow {
  async updateProfile(payload: ProfileUpdatePayload): Promise<ProfileUpdateResult> {
    const previousUser = await profileService.getCurrentUser();
    const updatedUser = await profileService.updateProfile(payload);

    const sessionRefreshRequired =
      previousUser.fullName !== updatedUser.fullName || previousUser.avatarUrl !== updatedUser.avatarUrl;

    return { user: updatedUser, sessionRefreshRequired };
  }
}

export const profileWorkflow: ProfileWorkflow = new DefaultProfileWorkflow();

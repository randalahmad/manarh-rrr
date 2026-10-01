import type { User, EmploymentStatus } from '@innovator/types/common';
import { getSessionUserAction } from '@/lib/mock-server/actions/auth';
import { getOwnProfileAction, updateOwnProfileAction } from '@/lib/mock-server/actions/profile';
import type { ActionResult } from '@/lib/server/errors';

export interface ProfileUpdatePayload {
  fullName: string;
  phone?: string;
  employmentStatus?: EmploymentStatus;
  organizationName?: string;
  specialization?: string;
  bio?: string;
}

export interface ProfileService {
  getCurrentUser(): Promise<User>;
  updateProfile(payload: ProfileUpdatePayload): Promise<User>;
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

/**
 * Real implementation — merges the session identity (id/name/email/avatar,
 * from `neon_auth.user` via `getSessionUserAction`, already used everywhere
 * else in this interface, e.g. authService.ts's `toAuthSession`) with the
 * app's own `user_profiles` extension row (phone/employmentStatus/
 * organizationName/specialization/bio, via lib/server/actions/profile.ts —
 * shared with the Org Admin and Innovation Specialist Profile pages).
 * Replaces the former `MockProfileService`'s in-memory `currentUser`
 * variable, which silently discarded every edit on reload.
 *
 * `fullName` in `ProfileUpdatePayload` is accepted (existing callers still
 * pass it) but never sent anywhere: the name lives on `neon_auth.user`
 * (Authentication logic, out of scope to write to). `ProfileForm.tsx`
 * disables that field for the same reason its email field already was.
 */
class RealProfileService implements ProfileService {
  async getCurrentUser(): Promise<User> {
    const [session, profile] = await Promise.all([
      getSessionUserAction().then(unwrap),
      getOwnProfileAction().then(unwrap),
    ]);
    if (!session) {
      throw new Error('No active session.');
    }
    return {
      id: session.id,
      fullName: session.name,
      email: session.email,
      phone: profile.phone ?? undefined,
      avatarUrl: session.avatarUrl ?? undefined,
      employmentStatus: profile.employment_status ?? undefined,
      organizationName: profile.organization_name ?? undefined,
      specialization: profile.specialization ?? undefined,
      bio: profile.bio ?? undefined,
    };
  }

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    unwrap(
      await updateOwnProfileAction({
        phone: payload.phone ?? null,
        employmentStatus: payload.employmentStatus ?? null,
        organizationName: payload.organizationName ?? null,
        specialization: payload.specialization ?? null,
        bio: payload.bio ?? null,
      })
    );
    return this.getCurrentUser();
  }
}

export const profileService: ProfileService = new RealProfileService();

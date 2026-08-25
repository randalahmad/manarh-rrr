import type { User, EmploymentStatus } from '@innovator/types/common';
import { MOCK_CURRENT_USER } from '@innovator/services/mock/data';
import { mockDelay } from '@innovator/services/mock/utils';

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

let currentUser: User = { ...MOCK_CURRENT_USER };

class MockProfileService implements ProfileService {
  async getCurrentUser(): Promise<User> {
    return mockDelay(currentUser, 400);
  }

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    currentUser = { ...currentUser, ...payload };
    return mockDelay(currentUser, 500);
  }
}

export const profileService: ProfileService = new MockProfileService();

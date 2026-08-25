import type { User } from '@innovator/types/common';

/**
 * The auth session intentionally exposes ONLY identity — no userType /
 * internal|external flag. That classification does not belong to the
 * session; it is derived per-Idea. See `features/ideas/types.ts`.
 */
export interface AuthSession {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ExternalRegistrationPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  organizationSlug: string;
}

/**
 * Typed error codes only — no Arabic (or any UI-facing) strings live in the
 * service layer. The UI maps a code to a message via
 * `features/auth/errorMessages.ts`. Add new codes here as new failure modes
 * are introduced; keep the mapping centralized rather than growing message
 * strings inside individual services.
 */
export const AUTH_ERROR_CODES = [
  'UNKNOWN_EMAIL',
  'INVALID_CREDENTIALS',
  'NETWORK_ERROR',
  'VALIDATION_ERROR',
  'EMAIL_ALREADY_REGISTERED',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

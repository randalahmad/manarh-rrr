import type { AuthSession, LoginCredentials, ForgotPasswordPayload, ExternalRegistrationPayload, AuthErrorCode } from '../types';
import { findMockAccountByEmail, addMockAccount } from '@innovator/services/mock/auth.mock';
import { mockDelay, generateId } from '@innovator/services/mock/utils';
import { signInAction, signOutAction, getSessionUserAction, type SessionUser } from '@/lib/server/actions/auth';

/**
 * authService abstraction.
 *
 * Components must only depend on this interface — see AuthService below.
 * `NeonAuthService` (Phase 6, Group A) is the real implementation, wired to
 * Neon Auth via Server Actions (lib/server/actions/auth.ts). It replaces
 * the former `MockAuthService` for `login` / `getSession` / `logout` /
 * `persistSession` without any consuming component or page changing.
 *
 * `forgotPassword` and `registerExternal` remain mocked: public
 * registration and password reset are explicitly out of scope for this
 * phase (no backend capability exists for either yet) and are called out as
 * such in the Phase 6 report rather than being silently wired to a made-up
 * endpoint.
 *
 * IMPORTANT: this service only ever throws `AuthError` with a typed
 * `AuthErrorCode` — it never contains Arabic (or any other UI-facing)
 * strings. The UI maps codes to messages via
 * `features/auth/errorMessages.ts`.
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  forgotPassword(payload: ForgotPasswordPayload): Promise<{ success: boolean }>;
  registerExternal(payload: ExternalRegistrationPayload): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  /** Persists an already-built session (e.g. the current session with a refreshed `user`). Does not mutate/validate it — the caller owns that. */
  persistSession(session: AuthSession): Promise<void>;
  logout(): Promise<void>;
}

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Legacy mock-session key. No longer written by login/getSession/logout (those are real now) — registerExternal still uses it below, scoped to its own out-of-scope mock path. */
const SESSION_STORAGE_KEY = 'manara.mockSession';

function toAuthSession(user: SessionUser): AuthSession {
  return {
    user: {
      id: user.id,
      fullName: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
    },
    // No client-visible token: the real session lives in an httpOnly cookie
    // set by Neon Auth and is never exposed to JavaScript. Kept as a
    // non-empty placeholder only because AuthSession.token is required by
    // the existing type — nothing in this codebase reads its value.
    token: 'neon-auth-session',
  };
}

class NeonAuthService implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const result = await signInAction(credentials);
    if (!result.ok) {
      if (result.code === 'VALIDATION_ERROR') throw new AuthError('VALIDATION_ERROR');
      // Neon Auth (like Better Auth generally) deliberately does not
      // distinguish "no such account" from "wrong password" in its error —
      // INVALID_CREDENTIALS is the closest fit of the existing typed codes.
      throw new AuthError('INVALID_CREDENTIALS');
    }
    return toAuthSession(result.data);
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ success: boolean }> {
    // Out of scope for Phase 6 (no password-reset backend capability
    // exists yet) — kept mocked and reported as such rather than wired to
    // a made-up endpoint.
    if (!payload.email) {
      throw new AuthError('VALIDATION_ERROR');
    }
    return mockDelay({ success: true }, 700);
  }

  async registerExternal(payload: ExternalRegistrationPayload): Promise<AuthSession> {
    // Out of scope for Phase 6 (no public-registration backend capability
    // exists yet) — kept mocked and reported as such. Note this session is
    // NOT recognized by the real getSession()/logout() below: it only
    // persists in this tab's sessionStorage and will not survive a
    // getCurrentActor() check on the server, matching its "not really
    // implemented yet" status rather than pretending otherwise.
    await mockDelay(undefined, 600);

    if (findMockAccountByEmail(payload.email)) {
      throw new AuthError('EMAIL_ALREADY_REGISTERED');
    }

    addMockAccount({ email: payload.email, password: payload.password });

    const session: AuthSession = {
      user: {
        id: generateId('external-user'),
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
      },
      token: generateId('mock-token-external'),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  async getSession(): Promise<AuthSession | null> {
    const result = await getSessionUserAction();
    if (!result.ok || !result.data) return null;
    return toAuthSession(result.data);
  }

  async persistSession(_session: AuthSession): Promise<void> {
    // No client-writable session store exists anymore (the real session is
    // an httpOnly server cookie) — re-resolve from the server instead of
    // trusting the caller-supplied `_session` object, so a stale/edited
    // client value can never diverge from what the server actually has.
    // Profile editing (the feature refreshSession() supports) is out of
    // scope for this phase; once it exists, this becomes a genuine no-op
    // because the server session is already current.
    void _session;
    await this.getSession();
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    await signOutAction();
  }
}

export const authService: AuthService = new NeonAuthService();

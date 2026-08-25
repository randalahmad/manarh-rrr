import type { AuthSession, LoginCredentials } from '@innovator/features/auth/types';

/**
 * Pure session-resolution logic behind AuthContext.tsx (Phase 6, Category
 * C.2 demo-data cleanup). Extracted out of the React provider so the bug
 * fix below can be unit-tested directly, without rendering React or
 * standing up a DOM — this codebase's existing tests are all plain
 * Node/Vitest logic tests (see test/**), so this follows the same pattern
 * rather than introducing new test infrastructure (jsdom, React Testing
 * Library) for a single provider.
 *
 * Every function here takes only the narrow slice of `authService` it
 * actually needs (via `Pick<SessionSource, ...>`), which also makes the
 * fix's real guarantee visible in the type signatures: `resolveRefreshedSession`
 * literally cannot reach a mock profile source — its parameter type has no
 * such method to call.
 */

export interface SessionSource {
  getSession(): Promise<AuthSession | null>;
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
}

/** Initial load on mount. A null result IS the "signed out" / unauthenticated state — not an error. */
export async function resolveInitialSession(
  source: Pick<SessionSource, "getSession">
): Promise<AuthSession | null> {
  return source.getSession();
}

/** Login always trusts the backend's freshly-created session. */
export async function resolveLoggedInSession(
  source: Pick<SessionSource, "login">,
  credentials: LoginCredentials
): Promise<AuthSession> {
  return source.login(credentials);
}

/** Logout always clears to null once the backend confirms sign-out. */
export async function resolveLoggedOutSession(
  source: Pick<SessionSource, "logout">
): Promise<null> {
  await source.logout();
  return null;
}

/**
 * refreshSession's core decision. THE BUG THIS FIXES: this function used to
 * be `const freshUser = await profileService.getCurrentUser(); ... setSession({...session, user: freshUser})`
 * — profileService is the Innovator profile feature's MockProfileService,
 * unwired to any Neon backend, so a real signed-in innovator's session
 * could get silently overwritten with fake demo profile data on every
 * refresh trigger.
 *
 * Now it ONLY ever re-resolves from the real backend (`source.getSession()`,
 * backed by Neon Auth). If the real backend currently reports no session
 * (e.g. it expired mid-request), the existing session is preserved as-is
 * rather than being wiped or replaced by anything else — logout() is the
 * only path that intentionally clears a session. There is no mock/profile
 * argument this function could even call: `SessionSource` doesn't expose one.
 */
export async function resolveRefreshedSession(
  currentSession: AuthSession,
  source: Pick<SessionSource, "getSession">
): Promise<AuthSession> {
  const fresh = await source.getSession();
  return fresh ?? currentSession;
}

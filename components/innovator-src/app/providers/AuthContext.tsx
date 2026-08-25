"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthSession, LoginCredentials, ExternalRegistrationPayload } from '@innovator/features/auth/types';
import { authService } from '@innovator/features/auth/services/authService';
import {
  resolveInitialSession,
  resolveLoggedInSession,
  resolveLoggedOutSession,
  resolveRefreshedSession,
} from './authSessionLogic';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  registerExternal: (payload: ExternalRegistrationPayload) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Re-resolves the current session's identity from the real backend
   * (authService.getSession(), backed by Neon Auth) and reflects it into
   * React state, so the sidebar/header picks up changes made elsewhere
   * without requiring a full re-login. No-ops if there's no active session.
   *
   * Demo-data cleanup (Phase 6, Category C.2) fixed a real bug here: this
   * used to call profileService.getCurrentUser() — the Innovator profile
   * feature's MockProfileService, unwired to any Neon backend — and merge
   * its fake user object into the live session, silently overwriting a
   * real signed-in innovator's identity with demo data on every refresh
   * trigger. It now only ever re-reads the real session. Profile editing
   * has no real backend yet (see useUpdateProfile.ts), so refreshing after
   * a mock profile edit currently re-confirms the unchanged real session
   * rather than fabricating a change — the real session is always the
   * source of truth, never MockAuthService or mock user data.
   */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resolveInitialSession(authService)
      .then(setSession)
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const newSession = await resolveLoggedInSession(authService, credentials);
    setSession(newSession);
  };

  const registerExternal = async (payload: ExternalRegistrationPayload) => {
    const newSession = await authService.registerExternal(payload);
    setSession(newSession);
  };

  const logout = async () => {
    setSession(await resolveLoggedOutSession(authService));
  };

  const refreshSession = async () => {
    if (!session) return;
    setSession(await resolveRefreshedSession(session, authService));
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, login, registerExternal, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

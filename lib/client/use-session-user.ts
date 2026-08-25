"use client";

/**
 * Client-side hook for the real, authenticated session identity.
 *
 * Demo-data cleanup (Phase 6, Category C.1): the Org Admin header, the
 * Innovation Specialist sidebar, and the Specialist profile page each
 * displayed a hardcoded fake identity from a mock source instead of the
 * person who actually signed in. This hook wraps the existing, already-real
 * `getSessionUserAction()` Server Action (the same one lib/client/org-ideas.ts,
 * lib/client/specialist-ideas.ts, and lib/client/specialist-projects.ts
 * already call to resolve "who is the current actor") so every identity
 * display in the app reads from the same real source.
 *
 * This does not introduce a second identity system and does not fetch or
 * invent any field the backend doesn't already provide — see SessionUser in
 * lib/server/actions/auth.ts for the exact shape (id, email, name,
 * avatarUrl, organizationId, role).
 */
import { useEffect, useState } from "react";
import { getSessionUserAction, type SessionUser } from "@/lib/server/actions/auth";

export interface UseSessionUserResult {
  sessionUser: SessionUser | null;
  loading: boolean;
}

export function useSessionUser(): UseSessionUserResult {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSessionUserAction().then((result) => {
      if (!active) return;
      setSessionUser(result.ok ? result.data : null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { sessionUser, loading };
}

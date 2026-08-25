/**
 * Regression tests for the real bug fixed in the Innovator interface's
 * AuthContext.tsx (Phase 6, demo-data cleanup, Category C.2):
 * `refreshSession()` used to call the Innovator profile feature's
 * MockProfileService (unwired to any Neon backend) and merge its fake user
 * object into the live, real session — silently overwriting a real
 * signed-in innovator's identity with demo data on every refresh trigger.
 *
 * The fix extracted AuthContext's session-resolution decisions into pure
 * functions (components/innovator-src/app/providers/authSessionLogic.ts) so
 * they're testable without rendering React or standing up a DOM, matching
 * every other test in this suite (plain Node/Vitest logic tests).
 *
 * `resolveRefreshedSession`'s own parameter type (`Pick<SessionSource,
 * "getSession">`) has no method a mock profile source could be passed as —
 * these tests confirm that behaviorally, not just by type-checking.
 */
import { describe, it, expect, vi } from "vitest";
import {
  resolveInitialSession,
  resolveLoggedInSession,
  resolveLoggedOutSession,
  resolveRefreshedSession,
} from "@/components/innovator-src/app/providers/authSessionLogic";

const REAL_SESSION = {
  user: { id: "real-user-1", fullName: "أحمد الشمري", email: "ahmad.alshamri@example.com" },
  token: "neon-auth-session",
};

const REAL_SESSION_UPDATED = {
  user: { id: "real-user-1", fullName: "أحمد الشمري المحدث", email: "ahmad.alshamri@example.com" },
  token: "neon-auth-session",
};

describe("resolveRefreshedSession (the Category C.2 bug fix)", () => {
  it("keeps the real authenticated session intact after a refresh — reflects the backend's latest real data, not fabricated data", async () => {
    const source = { getSession: vi.fn().mockResolvedValue(REAL_SESSION_UPDATED) };
    const result = await resolveRefreshedSession(REAL_SESSION, source);
    expect(result).toEqual(REAL_SESSION_UPDATED);
    expect(result.user.id).toBe("real-user-1");
  });

  it("never calls anything but the real backend's getSession — mock profile data has no path into the result", async () => {
    // A "malicious" source shaped like the old bug: it exposes a mock
    // profile method alongside the real one. resolveRefreshedSession's own
    // type only ever calls getSession(); this proves it behaviorally too.
    const mockProfileGetCurrentUser = vi.fn().mockResolvedValue({
      id: "mock-user-1",
      fullName: "سارة العتيبي", // the exact fake identity the original bug leaked
      email: "sara.alotaibi@example.com",
    });
    const source = {
      getSession: vi.fn().mockResolvedValue(REAL_SESSION_UPDATED),
      getCurrentUser: mockProfileGetCurrentUser,
    };
    const result = await resolveRefreshedSession(REAL_SESSION, source);
    expect(mockProfileGetCurrentUser).not.toHaveBeenCalled();
    expect(result.user.fullName).not.toBe("سارة العتيبي");
    expect(result).toEqual(REAL_SESSION_UPDATED);
  });

  it("preserves the existing real session rather than wiping it when the backend momentarily reports no session", async () => {
    const source = { getSession: vi.fn().mockResolvedValue(null) };
    const result = await resolveRefreshedSession(REAL_SESSION, source);
    expect(result).toEqual(REAL_SESSION);
  });
});

describe("resolveInitialSession — unauthenticated state still works", () => {
  it("returns the real session when one exists", async () => {
    const source = { getSession: vi.fn().mockResolvedValue(REAL_SESSION) };
    const result = await resolveInitialSession(source);
    expect(result).toEqual(REAL_SESSION);
  });

  it("returns null (unauthenticated) when there is no session — not an error, not mock data", async () => {
    const source = { getSession: vi.fn().mockResolvedValue(null) };
    const result = await resolveInitialSession(source);
    expect(result).toBeNull();
  });
});

describe("resolveLoggedOutSession — logout still works", () => {
  it("calls the real backend's logout and always resolves to null", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const result = await resolveLoggedOutSession({ logout });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});

describe("resolveLoggedInSession — login still works", () => {
  it("returns whatever real session the backend creates for the given credentials", async () => {
    const login = vi.fn().mockResolvedValue(REAL_SESSION);
    const credentials = { email: "ahmad.alshamri@example.com", password: "correct-horse" };
    const result = await resolveLoggedInSession({ login }, credentials);
    expect(login).toHaveBeenCalledWith(credentials);
    expect(result).toEqual(REAL_SESSION);
  });
});

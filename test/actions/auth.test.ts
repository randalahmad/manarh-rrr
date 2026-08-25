import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/neon-auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/server/auth/session", () => ({
  getCurrentActor: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  getCurrentSessionIdentity: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { getAuth } from "@/lib/server/auth/neon-auth";
import { getCurrentActor, getCurrentUserProfile, getCurrentSessionIdentity } from "@/lib/server/auth/session";
import { query } from "@/lib/server/db";
import { signInAction, signOutAction, getSessionUserAction } from "@/lib/server/actions/auth";
import type { Actor } from "@/lib/server/rbac/permissions";

const IDENTITY = { userId: "u1", email: "u1@example.com", name: "Test User", image: null };

const ACTOR: Actor = {
  userId: "u1",
  email: "u1@example.com",
  memberships: [
    { membershipId: "m1", organizationId: "org-1", role: "INNOVATION_SPECIALIST", grants: [] },
  ],
};

function mockAuth(overrides: Partial<{ signInEmail: unknown; signOut: unknown }> = {}) {
  const signInEmail = overrides.signInEmail ?? vi.fn().mockResolvedValue({ error: null });
  const signOut = overrides.signOut ?? vi.fn().mockResolvedValue(undefined);
  vi.mocked(getAuth).mockReturnValue({
    signIn: { email: signInEmail },
    signOut,
  } as never);
  return { signInEmail, signOut };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(getCurrentSessionIdentity).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(getAuth).mockReset();
});

describe("signInAction", () => {
  it("returns a SessionUser on valid credentials", async () => {
    mockAuth();
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getCurrentActor).mockResolvedValue(ACTOR);
    vi.mocked(query).mockResolvedValue([{ avatar_url: "https://example.com/a.png" }]);
    vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });

    const result = await signInAction({ email: "u1@example.com", password: "correct-horse" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        id: "u1",
        email: "u1@example.com",
        name: "Test User",
        avatarUrl: "https://example.com/a.png",
        organizationId: "org-1",
        role: "INNOVATION_SPECIALIST",
      });
    }
  });

  it("returns UNAUTHENTICATED without leaking the provider's raw error text when credentials are wrong", async () => {
    mockAuth({ signInEmail: vi.fn().mockResolvedValue({ error: { message: "invalid password for user X" } }) });

    const result = await signInAction({ email: "u1@example.com", password: "wrong" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNAUTHENTICATED");
      expect(result.message).not.toContain("user X");
    }
  });

  it("rejects malformed input before calling Neon Auth at all", async () => {
    const { signInEmail } = mockAuth();

    const result = await signInAction({ email: "not-an-email", password: "" });

    expect(result.ok).toBe(false);
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs the session back out and returns FORBIDDEN for a non-ACTIVE account", async () => {
    const { signOut } = mockAuth();
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getCurrentActor).mockResolvedValue(ACTOR);
    vi.mocked(query).mockResolvedValue([]);
    vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "SUSPENDED" });

    const result = await signInAction({ email: "u1@example.com", password: "correct-horse" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe("signOutAction", () => {
  it("calls Neon Auth's signOut and succeeds", async () => {
    const { signOut } = mockAuth();
    const result = await signOutAction();
    expect(result.ok).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe("getSessionUserAction", () => {
  it("returns null when there is no session", async () => {
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue(null);
    const result = await getSessionUserAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });

  it("returns the resolved SessionUser when a session exists", async () => {
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getCurrentActor).mockResolvedValue(ACTOR);
    vi.mocked(query).mockResolvedValue([{ avatar_url: null }]);

    const result = await getSessionUserAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.id).toBe("u1");
      expect(result.data?.organizationId).toBe("org-1");
    }
  });

  it("returns a user with no organization for a session with zero active memberships (e.g. an external innovator)", async () => {
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue(IDENTITY);
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    vi.mocked(query).mockResolvedValue([{ avatar_url: null }]);

    const result = await getSessionUserAction();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.organizationId).toBeNull();
      expect(result.data?.role).toBeNull();
    }
  });
});

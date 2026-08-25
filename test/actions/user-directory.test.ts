/**
 * Action-layer test for lib/server/actions/user-directory.ts (Phase 6,
 * Group B). See test/actions/ideas.test.ts for the pattern rationale.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getCurrentActor: vi.fn(),
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { getCurrentActor, getCurrentUserProfile } from "@/lib/server/auth/session";
import { query } from "@/lib/server/db";
import { getUsersDisplayInfoAction } from "@/lib/server/actions/user-directory";
import type { Actor } from "@/lib/server/rbac/permissions";

const USER_ID = "44444444-4444-4444-8444-444444444444";

function actor(): Actor {
  return { userId: "specialist-1", email: "specialist@example.com", memberships: [] };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(actor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("getUsersDisplayInfoAction", () => {
  it("returns display-safe fields only — never email/phone/status", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: USER_ID, name: "أحمد العتيبي", email: "ahmad@example.com", avatar_url: null },
    ]);
    const result = await getUsersDisplayInfoAction({ userIds: [USER_ID] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[USER_ID]).toEqual({ id: USER_ID, fullName: "أحمد العتيبي", avatarUrl: null });
      expect(Object.keys(result.data[USER_ID])).not.toContain("email");
    }
  });

  it("falls back to email when no display name is set", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: USER_ID, name: null, email: "ahmad@example.com", avatar_url: null }]);
    const result = await getUsersDisplayInfoAction({ userIds: [USER_ID] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[USER_ID].fullName).toBe("ahmad@example.com");
  });

  it("fails validation for an empty id list before touching the database", async () => {
    const result = await getUsersDisplayInfoAction({ userIds: [] });
    expect(result.ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

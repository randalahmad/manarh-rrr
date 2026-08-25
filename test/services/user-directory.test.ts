import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query } from "@/lib/server/db";
import { getUsersDisplayInfo, getUserDisplayInfo } from "@/lib/server/services/user-directory";
import type { Actor } from "@/lib/server/rbac/permissions";

const actor: Actor = { userId: "u1", email: "u1@x.com", memberships: [] };

beforeEach(() => {
  vi.mocked(query).mockReset();
});

describe("getUsersDisplayInfo", () => {
  it("returns an empty object without querying when given no ids", async () => {
    const result = await getUsersDisplayInfo(actor, []);
    expect(result).toEqual({});
    expect(query).not.toHaveBeenCalled();
  });

  it("falls back to email when name is null, and de-dupes requested ids", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { id: "user-1", name: null, email: "user1@x.com", avatar_url: null },
      { id: "user-2", name: "Sara", email: "sara@x.com", avatar_url: "https://x/a.png" },
    ]);
    const result = await getUsersDisplayInfo(actor, ["user-1", "user-2", "user-1"]);
    expect(result["user-1"].fullName).toBe("user1@x.com");
    expect(result["user-2"].fullName).toBe("Sara");
    expect(result["user-2"].avatarUrl).toBe("https://x/a.png");
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual([["user-1", "user-2"]]);
  });

  it("never selects email/phone/status beyond what's needed for display fallback", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await getUsersDisplayInfo(actor, ["user-1"]);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("phone");
    expect(sql).not.toContain("status");
  });
});

describe("getUserDisplayInfo — single-id convenience wrapper", () => {
  it("returns null when the user isn't found", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const result = await getUserDisplayInfo(actor, "missing");
    expect(result).toBeNull();
  });
});

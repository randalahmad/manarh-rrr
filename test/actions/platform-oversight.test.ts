import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({ getCurrentActor: vi.fn(), getCurrentUserProfile: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));

import { getCurrentActor, getCurrentUserProfile } from "@/lib/server/auth/session";
import { queryOne } from "@/lib/server/db";
import { getPlatformStatsAction } from "@/lib/server/actions/platform-oversight";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG_ROLES = [
  "ORG_ADMIN",
  "INNOVATION_SPECIALIST",
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
  "EVALUATOR",
  "PROJECT_MANAGER",
] as const;

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset().mockResolvedValue({ status: "ACTIVE" });
  vi.mocked(queryOne).mockReset();
});

describe("getPlatformStatsAction", () => {
  it("returns UNAUTHENTICATED with no session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await getPlatformStatsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it.each(ORG_ROLES)("returns FORBIDDEN for a %s with no platform-admin flag", async (role) => {
    const actor: Actor = {
      userId: "u1",
      email: "u1@example.com",
      memberships: [{ membershipId: "m1", organizationId: "org-1", role, grants: [] }],
    };
    vi.mocked(getCurrentActor).mockResolvedValue(actor);
    const result = await getPlatformStatsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns aggregate stats for a platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true });
    vi.mocked(queryOne).mockResolvedValueOnce({ total: "3", active: "2", suspended: "1" }).mockResolvedValueOnce({ total: "1" });
    const result = await getPlatformStatsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.organizationCount).toBe(3);
  });
});

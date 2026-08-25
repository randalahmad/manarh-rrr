import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));

import { queryOne } from "@/lib/server/db";
import { getPlatformStats } from "@/lib/server/services/platform-oversight";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };
const noAuthority: Actor = { userId: "u1", email: "u1@example.com", memberships: [] };

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
});

describe("getPlatformStats", () => {
  it("throws ForbiddenError for a non-platform-admin, never querying the database", async () => {
    await expect(getPlatformStats(noAuthority)).rejects.toThrow(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("returns aggregate organization and platform-admin counts only", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ total: "10", active: "8", suspended: "2" })
      .mockResolvedValueOnce({ total: "2" });
    const stats = await getPlatformStats(platformAdmin);
    expect(stats).toEqual({
      organizationCount: 10,
      activeOrganizationCount: 8,
      suspendedOrganizationCount: 2,
      platformAdminCount: 2,
    });
  });

  it("handles a database with zero organizations without throwing", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const stats = await getPlatformStats(platformAdmin);
    expect(stats).toEqual({
      organizationCount: 0,
      activeOrganizationCount: 0,
      suspendedOrganizationCount: 0,
      platformAdminCount: 0,
    });
  });
});

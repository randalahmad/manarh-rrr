/**
 * Regression tests for getCurrentActor()'s platform-admin resolution
 * (Phase 6 — Super Admin minimal implementation). See
 * lib/server/auth/session.ts — isPlatformAdmin is resolved from a
 * dedicated `platform_admins` table query run IN PARALLEL with the
 * existing organization_memberships query, and is intentionally never
 * derived from, or blended with, memberships.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/neon-auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));

import { getAuth } from "@/lib/server/auth/neon-auth";
import { query } from "@/lib/server/db";
import { getCurrentActor } from "@/lib/server/auth/session";

function mockSession(userId: string | null) {
  vi.mocked(getAuth).mockReturnValue({
    getSession: vi.fn().mockResolvedValue(
      userId ? { data: { user: { id: userId, email: `${userId}@example.com` } } } : { data: null }
    ),
  } as never);
}

beforeEach(() => {
  vi.mocked(getAuth).mockReset();
  vi.mocked(query).mockReset();
});

describe("getCurrentActor — isPlatformAdmin resolution", () => {
  it("returns null when there is no session — platform_admins is never queried for an anonymous request", async () => {
    mockSession(null);
    const actor = await getCurrentActor();
    expect(actor).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("sets isPlatformAdmin: true when platform_admins has an active row for this user", async () => {
    mockSession("u1");
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      if (typeof sql === "string" && sql.includes("platform_admins")) return [{ user_id: "u1" }];
      return [];
    });
    const actor = await getCurrentActor();
    expect(actor?.isPlatformAdmin).toBe(true);
  });

  it("sets isPlatformAdmin: false when platform_admins has no row for this user", async () => {
    mockSession("u1");
    vi.mocked(query).mockResolvedValue([]);
    const actor = await getCurrentActor();
    expect(actor?.isPlatformAdmin).toBe(false);
  });

  it("resolves isPlatformAdmin: true completely independently of organization_memberships — a platform admin with zero memberships still resolves correctly", async () => {
    mockSession("u1");
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      if (typeof sql === "string" && sql.includes("platform_admins")) return [{ user_id: "u1" }];
      return []; // membership query — deliberately empty
    });
    const actor = await getCurrentActor();
    expect(actor?.memberships).toEqual([]);
    expect(actor?.isPlatformAdmin).toBe(true);
  });

  it("a user with organization_memberships but no platform_admins row is not a platform admin — membership never implies platform authority", async () => {
    mockSession("u1");
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      if (typeof sql === "string" && sql.includes("platform_admins")) return [];
      if (typeof sql === "string" && sql.includes("organization_memberships")) {
        return [{ membership_id: "m1", organization_id: "org-1", role: "ORG_ADMIN", area: null, action: null }];
      }
      return [];
    });
    const actor = await getCurrentActor();
    expect(actor?.memberships).toHaveLength(1);
    expect(actor?.isPlatformAdmin).toBe(false);
  });

  it("only counts an ACTIVE platform_admins row — the query itself filters is_active = true (a revoked grant must fail closed)", async () => {
    mockSession("u1");
    let capturedSql = "";
    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      if (typeof sql === "string" && sql.includes("platform_admins")) capturedSql = sql;
      return [];
    });
    await getCurrentActor();
    expect(capturedSql).toContain("is_active = true");
  });
});

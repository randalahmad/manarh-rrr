/**
 * Action-layer tests for lib/server/actions/platform-organizations.ts
 * (Phase 6 — Super Admin minimal implementation). Covers the full
 * authorization matrix the implementation instruction asked for:
 * unauthenticated, every non-platform-admin organization role, an
 * authenticated actor with zero memberships, a suspended platform-admin
 * account, and a genuine platform admin succeeding.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({ getCurrentActor: vi.fn(), getCurrentUserProfile: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  withAudit: vi.fn(),
  auditLogStatement: vi.fn(),
}));
vi.mock("@/lib/server/auth/neon-auth", () => ({ getAuth: vi.fn() }));

import { getCurrentActor, getCurrentUserProfile } from "@/lib/server/auth/session";
import { query, queryOne, transaction } from "@/lib/server/db";
import { getAuth } from "@/lib/server/auth/neon-auth";
import {
  listPlatformOrganizationsAction,
  getPlatformOrganizationDetailAction,
  createPlatformOrganizationAction,
  suspendPlatformOrganizationAction,
  reactivatePlatformOrganizationAction,
  bootstrapOrgAdminAction,
} from "@/lib/server/actions/platform-organizations";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG_ID = "11111111-1111-4111-8111-111111111111";

const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };

const ORG_ROLES = [
  "ORG_ADMIN",
  "INNOVATION_SPECIALIST",
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
  "EVALUATOR",
  "PROJECT_MANAGER",
] as const;

function orgMemberActor(role: (typeof ORG_ROLES)[number]): Actor {
  return {
    userId: "u1",
    email: "u1@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG_ID, role, grants: [] }],
  };
}

function orgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ORG_ID,
    name: "منارة",
    name_en: null,
    description: "desc",
    logo_url: null,
    status: "ACTIVE",
    contact_email: "c@x.com",
    contact_phone: "0500000000",
    sector: "حكومي",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset().mockResolvedValue({ status: "ACTIVE" });
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getAuth).mockReset();
});

describe("listPlatformOrganizationsAction", () => {
  it("returns UNAUTHENTICATED with no session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await listPlatformOrganizationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it.each(ORG_ROLES)("returns FORBIDDEN for a signed-in %s with no platform-admin flag", async (role) => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgMemberActor(role));
    const result = await listPlatformOrganizationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns FORBIDDEN for an authenticated actor with zero memberships (e.g. an external innovator)", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    const result = await listPlatformOrganizationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns FORBIDDEN for a non-ACTIVE platform-admin account, before ever querying organizations", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "SUSPENDED" });
    const result = await listPlatformOrganizationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("succeeds for an active platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(query).mockResolvedValueOnce([orgRow()]);
    const result = await listPlatformOrganizationsAction();
    expect(result.ok).toBe(true);
  });
});

describe("getPlatformOrganizationDetailAction", () => {
  it("returns NOT_FOUND for a missing organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await getPlatformOrganizationDetailAction({ organizationId: ORG_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns VALIDATION_ERROR for a malformed organizationId, before checking the session", async () => {
    const result = await getPlatformOrganizationDetailAction({ organizationId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(getCurrentActor).not.toHaveBeenCalled();
  });
});

describe("createPlatformOrganizationAction", () => {
  it("creates an organization for a platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow());
    const result = await createPlatformOrganizationAction({
      name: "منارة",
      description: "desc",
      contactEmail: "c@x.com",
      contactPhone: "0500000000",
      sector: "حكومي",
    });
    expect(result.ok).toBe(true);
  });

  it("returns FORBIDDEN for a non-platform-admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    const result = await createPlatformOrganizationAction({
      name: "منارة",
      description: "desc",
      contactEmail: "c@x.com",
      contactPhone: "0500000000",
      sector: "حكومي",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("suspendPlatformOrganizationAction / reactivatePlatformOrganizationAction", () => {
  it("suspends an organization for a platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" }));
    const result = await suspendPlatformOrganizationAction({ organizationId: ORG_ID });
    expect(result.ok).toBe(true);
  });

  it.each(ORG_ROLES)("returns FORBIDDEN for a %s attempting to suspend an organization", async (role) => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgMemberActor(role));
    const result = await suspendPlatformOrganizationAction({ organizationId: ORG_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("reactivates an organization for a platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" })).mockResolvedValueOnce(orgRow({ status: "ACTIVE" }));
    const result = await reactivatePlatformOrganizationAction({ organizationId: ORG_ID });
    expect(result.ok).toBe(true);
  });

  it("returns UNAUTHENTICATED for an unauthenticated caller attempting to reactivate", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await reactivatePlatformOrganizationAction({ organizationId: ORG_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });
});

describe("bootstrapOrgAdminAction", () => {
  it("returns FORBIDDEN for a non-platform-admin, never touching Neon Auth", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    const result = await bootstrapOrgAdminAction({ organizationId: ORG_ID, email: "a@b.com", fullName: "Name" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(getAuth).not.toHaveBeenCalled();
  });

  it.each(ORG_ROLES)("returns FORBIDDEN for a %s attempting to bootstrap an org admin", async (role) => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgMemberActor(role));
    const result = await bootstrapOrgAdminAction({ organizationId: ORG_ID, email: "a@b.com", fullName: "Name" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns BLOCKED_PENDING_DECISION for a platform admin with an otherwise-valid request, without ever calling Neon Auth or opening a transaction", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(platformAdmin);
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(null);

    const result = await bootstrapOrgAdminAction({ organizationId: ORG_ID, email: "a@b.com", fullName: "Name" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("BLOCKED_PENDING_DECISION");
    expect(getAuth).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR for a malformed email, before checking the session", async () => {
    const result = await bootstrapOrgAdminAction({ organizationId: ORG_ID, email: "not-an-email", fullName: "Name" });
    expect(result.ok).toBe(false);
    expect(getCurrentActor).not.toHaveBeenCalled();
  });
});

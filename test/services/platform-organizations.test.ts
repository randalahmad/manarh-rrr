/**
 * Service-layer tests for lib/server/services/platform-organizations.ts
 * (Phase 6 — Super Admin minimal implementation). Every export is gated by
 * requirePlatformAdmin() — these tests exercise that boundary directly
 * against every existing organization role (none of which should ever
 * grant platform authority), plus the create/suspend/reactivate/bootstrap
 * business rules and their audit trail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: vi.fn(),
  withAudit: vi.fn(),
  auditLogStatement: vi.fn(),
}));
vi.mock("@/lib/server/auth/neon-auth", () => ({ getAuth: vi.fn() }));

import { query, queryOne, transaction } from "@/lib/server/db";
import { writeAuditLog } from "@/lib/server/audit";
import { getAuth } from "@/lib/server/auth/neon-auth";
import {
  listAllOrganizations,
  getOrganizationDetail,
  createOrganization,
  suspendOrganization,
  reactivateOrganization,
  bootstrapOrgAdmin,
} from "@/lib/server/services/platform-organizations";
import { ForbiddenError, NotFoundError, ConflictError, BlockedPendingDecisionError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG_ID = "11111111-1111-4111-8111-111111111111";

const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };
const noAuthority: Actor = { userId: "u1", email: "u1@example.com", memberships: [] };

const ORG_ROLES = [
  "ORG_ADMIN",
  "INNOVATION_SPECIALIST",
  "INTERNAL_INNOVATOR",
  "EXTERNAL_INNOVATOR",
  "EVALUATOR",
  "PROJECT_MANAGER",
] as const;

function orgMember(role: (typeof ORG_ROLES)[number]): Actor {
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
    name_en: "Manarah",
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
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(writeAuditLog).mockReset().mockResolvedValue(undefined);
  vi.mocked(getAuth).mockReset();
});

describe("listAllOrganizations — authorization", () => {
  it("throws ForbiddenError for an actor with zero organization_memberships and no platform-admin flag", async () => {
    await expect(listAllOrganizations(noAuthority)).rejects.toThrow(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(ORG_ROLES)("throws ForbiddenError for an actor whose only authority is a %s organization membership", async (role) => {
    await expect(listAllOrganizations(orgMember(role))).rejects.toThrow(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns organizations for a platform admin", async () => {
    vi.mocked(query).mockResolvedValueOnce([orgRow()]);
    const result = await listAllOrganizations(platformAdmin);
    expect(result).toHaveLength(1);
  });

  it("selects metadata columns only — never idea/project/evaluation/decision content", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listAllOrganizations(platformAdmin);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toMatch(/ideas|projects|evaluations|decisions/i);
  });
});

describe("getOrganizationDetail", () => {
  it("throws ForbiddenError for a non-platform-admin before querying anything", async () => {
    await expect(getOrganizationDetail(noAuthority, ORG_ID)).rejects.toThrow(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an organization that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await expect(getOrganizationDetail(platformAdmin, ORG_ID)).rejects.toThrow(NotFoundError);
  });

  it("returns metadata plus aggregate member/admin COUNTS — never a member list or org content", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(orgRow())
      .mockResolvedValueOnce({ member_count: "5", admin_count: "1" });
    const detail = await getOrganizationDetail(platformAdmin, ORG_ID);
    expect(detail.member_count).toBe(5);
    expect(detail.admin_count).toBe(1);
    expect(detail).not.toHaveProperty("ideas");
    expect(detail).not.toHaveProperty("projects");
  });
});

describe("createOrganization", () => {
  it("throws ForbiddenError for a non-platform-admin, never touching the database", async () => {
    await expect(
      createOrganization(noAuthority, { name: "x", description: "d", contactEmail: "c@x.com", contactPhone: "1", sector: "s" })
    ).rejects.toThrow(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("creates an organization and writes a PLATFORM:ORG_CREATE audit row", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow());
    const result = await createOrganization(platformAdmin, {
      name: "منارة",
      description: "desc",
      contactEmail: "c@x.com",
      contactPhone: "0500000000",
      sector: "حكومي",
    });
    expect(result.id).toBe(ORG_ID);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ permissionSnapshot: "PLATFORM:ORG_CREATE", entityId: ORG_ID, entityType: "ORGANIZATION" })
    );
  });
});

describe("suspendOrganization / reactivateOrganization", () => {
  it("suspends an ACTIVE organization and audits it as PLATFORM:ORG_SUSPEND", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" }));
    const result = await suspendOrganization(platformAdmin, ORG_ID);
    expect(result.status).toBe("SUSPENDED");
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ permissionSnapshot: "PLATFORM:ORG_SUSPEND" }));
  });

  it("throws ConflictError when suspending an already-suspended organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" }));
    await expect(suspendOrganization(platformAdmin, ORG_ID)).rejects.toThrow(ConflictError);
  });

  it("reactivates a SUSPENDED organization and audits it as PLATFORM:ORG_REACTIVATE", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" })).mockResolvedValueOnce(orgRow({ status: "ACTIVE" }));
    const result = await reactivateOrganization(platformAdmin, ORG_ID);
    expect(result.status).toBe("ACTIVE");
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ permissionSnapshot: "PLATFORM:ORG_REACTIVATE" }));
  });

  it("throws NotFoundError for a nonexistent organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await expect(suspendOrganization(platformAdmin, ORG_ID)).rejects.toThrow(NotFoundError);
  });

  it.each(ORG_ROLES)("throws ForbiddenError for a %s attempting to suspend an organization", async (role) => {
    await expect(suspendOrganization(orgMember(role), ORG_ID)).rejects.toThrow(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("bootstrapOrgAdmin", () => {
  it("throws ForbiddenError for a non-platform-admin, before touching the database or Neon Auth", async () => {
    await expect(
      bootstrapOrgAdmin(noAuthority, { organizationId: ORG_ID, email: "a@b.com", fullName: "Name" })
    ).rejects.toThrow(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a nonexistent organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "a@b.com", fullName: "Name" })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError for a suspended organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "SUSPENDED" }));
    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "a@b.com", fullName: "Name" })
    ).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError when the organization already has an active ORG_ADMIN", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce({ id: "existing-membership" });
    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "a@b.com", fullName: "Name" })
    ).rejects.toThrow(ConflictError);
  });

  // Bootstrapping the first ORG_ADMIN is currently BLOCKED — see
  // lib/server/services/platform-organizations.ts's bootstrapOrgAdmin doc
  // comment and docs/architecture/manarah-super-admin-bootstrap-blocked-report.md.
  // These tests prove the block is unconditional, that it never reaches
  // Neon Auth, and that it can never leave an orphaned local record.
  it("throws BlockedPendingDecisionError for a valid platform admin and a valid, unclaimed ACTIVE organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(null);

    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "admin@org.com", fullName: "Admin Name" })
    ).rejects.toThrow(BlockedPendingDecisionError);
  });

  it("never calls Neon Auth (getAuth) — the block takes effect before any admin/signUp call would be made", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(null);

    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "admin@org.com", fullName: "Admin Name" })
    ).rejects.toThrow(BlockedPendingDecisionError);
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("never opens a local transaction and never writes user_profiles/organization_memberships — a blocked bootstrap cannot leave an orphan record", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(null);

    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "admin@org.com", fullName: "Admin Name" })
    ).rejects.toThrow(BlockedPendingDecisionError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("never writes an audit log entry for a blocked bootstrap attempt", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(orgRow({ status: "ACTIVE" })).mockResolvedValueOnce(null);

    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "admin@org.com", fullName: "Admin Name" })
    ).rejects.toThrow(BlockedPendingDecisionError);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("still enforces NotFoundError/ConflictError preconditions before the block — those business rules are independent of the Neon Auth blocker", async () => {
    // Suspended organization — checked, and rejected, before the block would apply.
    vi.mocked(queryOne).mockReset().mockResolvedValueOnce(orgRow({ status: "SUSPENDED" }));
    await expect(
      bootstrapOrgAdmin(platformAdmin, { organizationId: ORG_ID, email: "admin@org.com", fullName: "Admin Name" })
    ).rejects.toThrow(ConflictError);
    expect(getAuth).not.toHaveBeenCalled();
  });
});

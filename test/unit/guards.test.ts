import { describe, it, expect } from "vitest";
import { requireOrgMembership, requirePermission, requireRole, requirePlatformAdmin } from "@/lib/server/auth/guards";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

const member: Actor = {
  userId: "u1",
  email: "u1@example.com",
  memberships: [
    { membershipId: "m1", organizationId: ORG_A, role: "INTERNAL_INNOVATOR", grants: [{ area: "IDEA", action: "CREATE" }] },
  ],
};

describe("requireOrgMembership — the organization-isolation boundary", () => {
  it("returns the membership when the actor belongs to the org", () => {
    expect(requireOrgMembership(member, ORG_A).organizationId).toBe(ORG_A);
  });

  it("throws ForbiddenError for an org the actor does not belong to (cross-organization access)", () => {
    expect(() => requireOrgMembership(member, ORG_B)).toThrow(ForbiddenError);
  });
});

describe("requirePermission — authorization before mutation", () => {
  it("passes when the membership's grants include the (area, action) pair", () => {
    expect(() => requirePermission(member, ORG_A, "IDEA", "CREATE")).not.toThrow();
  });

  it("throws ForbiddenError when the grant is missing (unauthorized access)", () => {
    expect(() => requirePermission(member, ORG_A, "IDEA", "ARCHIVE")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError before even checking grants when there's no membership at all", () => {
    expect(() => requirePermission(member, ORG_B, "IDEA", "CREATE")).toThrow(ForbiddenError);
  });
});

describe("requireRole", () => {
  it("passes when the actor's role is in the allow-list", () => {
    expect(() => requireRole(member, ORG_A, ["INTERNAL_INNOVATOR", "EXTERNAL_INNOVATOR"])).not.toThrow();
  });

  it("throws ForbiddenError when the actor's role is not in the allow-list", () => {
    expect(() => requireRole(member, ORG_A, ["ORG_ADMIN"])).toThrow(ForbiddenError);
  });
});

describe("requirePlatformAdmin — the platform-admin boundary, independent of organization_memberships", () => {
  const ORG_ROLES: Actor["memberships"][number]["role"][] = [
    "ORG_ADMIN",
    "INNOVATION_SPECIALIST",
    "INTERNAL_INNOVATOR",
    "EXTERNAL_INNOVATOR",
    "EVALUATOR",
    "PROJECT_MANAGER",
  ];

  it("passes for an actor with isPlatformAdmin: true, even with zero organization_memberships", () => {
    const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };
    expect(requirePlatformAdmin(platformAdmin)).toBe(platformAdmin);
  });

  it("throws ForbiddenError when isPlatformAdmin is explicitly false", () => {
    const actor: Actor = { userId: "u1", email: "u1@example.com", memberships: [], isPlatformAdmin: false };
    expect(() => requirePlatformAdmin(actor)).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when isPlatformAdmin is undefined (fail-closed for older/test-built Actor literals)", () => {
    expect(() => requirePlatformAdmin(member)).toThrow(ForbiddenError);
  });

  it.each(ORG_ROLES)(
    "throws ForbiddenError for an actor whose only authority is a %s organization membership — org role never implies platform authority",
    (role) => {
      const actor: Actor = {
        userId: "u1",
        email: "u1@example.com",
        memberships: [{ membershipId: "m1", organizationId: ORG_A, role, grants: [] }],
      };
      expect(() => requirePlatformAdmin(actor)).toThrow(ForbiddenError);
    }
  );

  it("a platform admin still has zero organization access by construction — requireOrgMembership fails for them regardless", () => {
    const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };
    expect(() => requireOrgMembership(platformAdmin, ORG_A)).toThrow(ForbiddenError);
  });
});

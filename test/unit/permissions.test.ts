import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isOrgAdmin,
  isOrgMember,
  membershipFor,
  type Actor,
} from "@/lib/server/rbac/permissions";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

function actorWith(memberships: Actor["memberships"]): Actor {
  return { userId: "user-1", email: "user@example.com", memberships };
}

describe("hasPermission — ORG_ADMIN special case (mirrors the mock's can() unconditional true)", () => {
  it("ORG_ADMIN is granted any (area, action) in their org, with zero seeded grants", () => {
    const actor = actorWith([{ membershipId: "m1", organizationId: ORG_A, role: "ORG_ADMIN", grants: [] }]);
    expect(hasPermission(actor, ORG_A, "IDEA", "CREATE")).toBe(true);
    expect(hasPermission(actor, ORG_A, "AUDIT", "VIEW")).toBe(true);
    expect(isOrgAdmin(actor, ORG_A)).toBe(true);
  });
});

describe("hasPermission — non-admin roles need an explicit grant", () => {
  it("grants the exact (area, action) pair", () => {
    const actor = actorWith([
      {
        membershipId: "m1",
        organizationId: ORG_A,
        role: "INNOVATION_SPECIALIST",
        grants: [{ area: "IDEA", action: "VIEW" }],
      },
    ]);
    expect(hasPermission(actor, ORG_A, "IDEA", "VIEW")).toBe(true);
  });

  it("does not grant an action that wasn't seeded, even for the same area", () => {
    const actor = actorWith([
      {
        membershipId: "m1",
        organizationId: ORG_A,
        role: "INNOVATION_SPECIALIST",
        grants: [{ area: "IDEA", action: "VIEW" }],
      },
    ]);
    expect(hasPermission(actor, ORG_A, "IDEA", "EDIT")).toBe(false);
  });

  it("EVALUATOR/INNOVATOR-style roles with zero relevant grants are denied", () => {
    const actor = actorWith([
      { membershipId: "m1", organizationId: ORG_A, role: "EVALUATOR", grants: [{ area: "EVALUATION", action: "EVALUATE" }] },
    ]);
    expect(hasPermission(actor, ORG_A, "GOVERNANCE", "APPROVE")).toBe(false);
  });
});

describe("organization isolation — the exact cross-org leak this module was refactored to prevent", () => {
  it("a grant in Org A does not apply when checking Org B, even for the same user", () => {
    const actor = actorWith([
      { membershipId: "m1", organizationId: ORG_A, role: "INNOVATION_SPECIALIST", grants: [{ area: "IDEA", action: "EDIT" }] },
      { membershipId: "m2", organizationId: ORG_B, role: "INTERNAL_INNOVATOR", grants: [{ area: "IDEA", action: "CREATE" }] },
    ]);
    expect(hasPermission(actor, ORG_A, "IDEA", "EDIT")).toBe(true);
    expect(hasPermission(actor, ORG_B, "IDEA", "EDIT")).toBe(false);
    expect(hasPermission(actor, ORG_B, "IDEA", "CREATE")).toBe(true);
    expect(hasPermission(actor, ORG_A, "IDEA", "CREATE")).toBe(false);
  });

  it("ORG_ADMIN in Org A is NOT an admin in Org B", () => {
    const actor = actorWith([
      { membershipId: "m1", organizationId: ORG_A, role: "ORG_ADMIN", grants: [] },
      { membershipId: "m2", organizationId: ORG_B, role: "EVALUATOR", grants: [] },
    ]);
    expect(isOrgAdmin(actor, ORG_A)).toBe(true);
    expect(isOrgAdmin(actor, ORG_B)).toBe(false);
    expect(hasPermission(actor, ORG_B, "IDEA", "VIEW")).toBe(false);
  });

  it("a user with no membership in an org has no permission there, regardless of role in another org", () => {
    const actor = actorWith([{ membershipId: "m1", organizationId: ORG_A, role: "ORG_ADMIN", grants: [] }]);
    expect(isOrgMember(actor, ORG_B)).toBe(false);
    expect(hasPermission(actor, ORG_B, "IDEA", "VIEW")).toBe(false);
    expect(membershipFor(actor, ORG_B)).toBeUndefined();
  });
});

describe("unauthorized access — no session-equivalent (empty memberships)", () => {
  it("an actor with zero memberships passes no permission check anywhere", () => {
    const actor = actorWith([]);
    expect(hasPermission(actor, ORG_A, "IDEA", "VIEW")).toBe(false);
    expect(isOrgMember(actor, ORG_A)).toBe(false);
  });
});

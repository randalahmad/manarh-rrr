import { describe, it, expect } from "vitest";
import { resolveHomeRoute } from "@/lib/server/routing/home-route";
import type { Actor } from "@/lib/server/rbac/permissions";

function actorWith(overrides: Partial<Actor>): Actor {
  return {
    userId: "u1",
    email: "u1@example.com",
    memberships: [],
    isPlatformAdmin: false,
    ...overrides,
  };
}

describe("resolveHomeRoute", () => {
  it("returns ANONYMOUS for no session", () => {
    expect(resolveHomeRoute(null)).toEqual({ kind: "ANONYMOUS" });
  });

  it("routes a platform admin to /super-admin", () => {
    const actor = actorWith({ isPlatformAdmin: true });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/super-admin" });
  });

  it("platform-admin status wins even if the actor also has an organization membership", () => {
    const actor = actorWith({
      isPlatformAdmin: true,
      memberships: [{ membershipId: "m1", organizationId: "org-1", role: "ORG_ADMIN", grants: [] }],
    });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/super-admin" });
  });

  it("routes ORG_ADMIN to /org/dashboard", () => {
    const actor = actorWith({
      memberships: [{ membershipId: "m1", organizationId: "org-1", role: "ORG_ADMIN", grants: [] }],
    });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/org/dashboard" });
  });

  it("routes INNOVATION_SPECIALIST to /innovation-specialist/dashboard", () => {
    const actor = actorWith({
      memberships: [{ membershipId: "m1", organizationId: "org-1", role: "INNOVATION_SPECIALIST", grants: [] }],
    });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/innovation-specialist/dashboard" });
  });

  it("routes INTERNAL_INNOVATOR to /innovator/dashboard", () => {
    const actor = actorWith({
      memberships: [{ membershipId: "m1", organizationId: "org-1", role: "INTERNAL_INNOVATOR", grants: [] }],
    });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/innovator/dashboard" });
  });

  it("routes EXTERNAL_INNOVATOR to /innovator/dashboard", () => {
    const actor = actorWith({
      memberships: [{ membershipId: "m1", organizationId: "org-1", role: "EXTERNAL_INNOVATOR", grants: [] }],
    });
    expect(resolveHomeRoute(actor)).toEqual({ kind: "REDIRECT", path: "/innovator/dashboard" });
  });

  it("returns ACCESS_DENIED for an authenticated actor with no memberships and no platform-admin grant", () => {
    const actor = actorWith({});
    expect(resolveHomeRoute(actor)).toEqual({ kind: "ACCESS_DENIED" });
  });

  it("fails closed to ACCESS_DENIED when isPlatformAdmin is undefined", () => {
    const actor: Actor = { userId: "u1", email: "u1@example.com", memberships: [] };
    expect(resolveHomeRoute(actor)).toEqual({ kind: "ACCESS_DENIED" });
  });
});

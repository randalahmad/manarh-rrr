/**
 * Action-layer tests for lib/server/actions/organizations.ts (Phase 6,
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
import { listOrganizationsAction, listMyOrganizationsAction, getMyRoleInOrganizationAction } from "@/lib/server/actions/organizations";
import type { OrganizationSummary } from "@/lib/server/services/organizations";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: "user-1",
    email: "user1@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
    ...overrides,
  };
}

function orgSummary(overrides: Partial<OrganizationSummary> = {}): OrganizationSummary {
  return { id: ORG, name: "منارة", name_en: "Manarah", logo_url: null, sector: "حكومي", ...overrides };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(actor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("listOrganizationsAction", () => {
  it("returns the global active-organizations directory for any authenticated session (no org membership required)", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(actor({ memberships: [] }));
    vi.mocked(query).mockResolvedValueOnce([orgSummary()]);
    const result = await listOrganizationsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([orgSummary()]);
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await listOrganizationsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listMyOrganizationsAction", () => {
  it("returns only the actor's own memberships, each annotated with its role", async () => {
    vi.mocked(query).mockResolvedValueOnce([orgSummary()]);
    const result = await listMyOrganizationsAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([{ ...orgSummary(), role: "INTERNAL_INNOVATOR" }]);
    }
  });

  it("returns an empty list without querying when the actor has zero memberships", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(actor({ memberships: [] }));
    const result = await listMyOrganizationsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("getMyRoleInOrganizationAction", () => {
  it("returns the actor's role in a organization they belong to", async () => {
    const result = await getMyRoleInOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe("INTERNAL_INNOVATOR");
  });

  it("returns null (not an error) for an organization the actor has no membership in", async () => {
    const result = await getMyRoleInOrganizationAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});

/**
 * Action-layer test for lib/server/actions/idea-categories.ts (Phase 6,
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
import { listIdeaCategoriesAction } from "@/lib/server/actions/idea-categories";
import type { IdeaCategoryRow } from "@/lib/server/services/idea-categories";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";

function actor(): Actor {
  return {
    userId: "specialist-1",
    email: "specialist@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [] }],
  };
}

function categoryRow(overrides: Partial<IdeaCategoryRow> = {}): IdeaCategoryRow {
  return {
    id: "cat-1",
    organization_id: ORG,
    name: "الاستدامة",
    description: "d",
    status: "ACTIVE",
    priority: null,
    related_ideas_count: 0,
    usage_count: 0,
    strategic_goal_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(actor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("listIdeaCategoriesAction", () => {
  it("returns all categories (including inactive) for an org member when activeOnly is false", async () => {
    vi.mocked(query).mockResolvedValueOnce([categoryRow(), categoryRow({ id: "cat-2", status: "ARCHIVED" })]);
    const result = await listIdeaCategoriesAction({ organizationId: ORG, activeOnly: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("status = 'ACTIVE'");
  });

  it("scopes to ACTIVE-only by default", async () => {
    vi.mocked(query).mockResolvedValueOnce([categoryRow()]);
    await listIdeaCategoriesAction({ organizationId: ORG });
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("status = 'ACTIVE'");
  });

  it("returns FORBIDDEN for an organization the actor is not a member of", async () => {
    const result = await listIdeaCategoriesAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

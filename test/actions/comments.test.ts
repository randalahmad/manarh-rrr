/**
 * Action-layer test for listCommentsForEntityAction
 * (lib/server/actions/comments.ts, Phase 6, Group B addition — Phase 5
 * built listCommentsForEntity as a service only, with no action wrapper
 * until this phase). See test/actions/ideas.test.ts for the pattern
 * rationale.
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
import { query, queryOne } from "@/lib/server/db";
import { listCommentsForEntityAction } from "@/lib/server/actions/comments";
import type { CommentRow } from "@/lib/server/services/comments";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";

function specialistActor(): Actor {
  return {
    userId: "specialist-1",
    email: "specialist@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [{ area: "IDEA", action: "VIEW" }] }],
  };
}

function commentRow(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "c1",
    entity_type: "IDEA",
    entity_id: IDEA_ID,
    author_id: "specialist-1",
    content: "ملاحظة أولية.",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("listCommentsForEntityAction", () => {
  it("returns comments for an idea when the actor has IDEA:VIEW in its organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([commentRow()]);
    const result = await listCommentsForEntityAction({ entityType: "IDEA", entityId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([commentRow()]);
  });

  it("returns FORBIDDEN when the actor lacks IDEA:VIEW in the entity's organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      userId: "outsider-1",
      email: "outsider@example.com",
      memberships: [],
    });
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await listCommentsForEntityAction({ entityType: "IDEA", entityId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the underlying idea doesn't exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listCommentsForEntityAction({ entityType: "IDEA", entityId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

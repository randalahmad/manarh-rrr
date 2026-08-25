import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query, queryOne, transaction } from "@/lib/server/db";
import { submitRecommendation, makeDecision } from "@/lib/server/services/decisions";
import { ForbiddenError, InvalidTransitionError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

const ORG = "org-1";

function ideaRow(overrides: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: "idea-1",
    organization_id: ORG,
    title: "t",
    description: "d",
    problem_statement: "p",
    proposed_solution: "s",
    expected_impact: "i",
    category_id: "cat-1",
    challenge_id: null,
    opportunity_id: null,
    submitter_id: "submitter-1",
    submitter_type: "INTERNAL",
    status: "UNDER_EVALUATION",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function actorWith(area: string, action: string): Actor {
  return {
    userId: "u1",
    email: "u1@x.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [{ area: area as never, action: action as never }] }],
  };
}

function noPermission(): Actor {
  return { userId: "u2", email: "u2@x.com", memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
}

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("submitRecommendation — decision permissions (GOVERNANCE:EDIT)", () => {
  it("throws ForbiddenError without GOVERNANCE:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }));
    await expect(
      submitRecommendation(noPermission(), { ideaId: "idea-1", recommendationType: "APPROVE", summary: "good" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws InvalidTransitionError when the idea isn't in a status that can receive a recommendation", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    await expect(
      submitRecommendation(actorWith("GOVERNANCE", "EDIT"), {
        ideaId: "idea-1",
        recommendationType: "APPROVE",
        summary: "good",
      })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

describe("makeDecision — decision permissions (GOVERNANCE:APPROVE, the one real enforced mock check)", () => {
  it("throws ForbiddenError without GOVERNANCE:APPROVE", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "PENDING_DECISION" }));
    await expect(
      makeDecision(noPermission(), { ideaId: "idea-1", decisionType: "APPROVE", reason: "meets criteria" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws InvalidTransitionError when the resulting idea status isn't legally reachable", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" })); // DRAFT can't reach APPROVED
    await expect(
      makeDecision(actorWith("GOVERNANCE", "APPROVE"), {
        ideaId: "idea-1",
        decisionType: "APPROVE",
        reason: "meets criteria",
      })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("applies APPROVE atomically, including a notification to the submitter and sensitiveView audit", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "PENDING_DECISION" }));
    vi.mocked(transaction).mockResolvedValueOnce([
      [{ id: "dec-1", idea_id: "idea-1", project_id: null, recommendation_id: null, decision_type: "APPROVE", reason: "r", conditions: null, notes: null, decided_by: "u1", decided_at: "now" }],
    ]);
    const decision = await makeDecision(actorWith("GOVERNANCE", "APPROVE"), {
      ideaId: "idea-1",
      decisionType: "APPROVE",
      reason: "meets criteria",
    });
    expect(decision.decision_type).toBe("APPROVE");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements.some((s) => s.sql.includes("notifications"))).toBe(true);
    expect(statements.some((s) => s.sql.includes("audit_logs"))).toBe(true);
  });

  it("requires an idea or project reference (invalid mutation otherwise)", async () => {
    // Validation happens in the zod schema at the Server Action boundary;
    // the service itself also refuses to guess which org to authorize
    // against when both are absent.
    await expect(
      makeDecision(actorWith("GOVERNANCE", "APPROVE"), { decisionType: "APPROVE", reason: "x" })
    ).rejects.toThrow();
  });
});

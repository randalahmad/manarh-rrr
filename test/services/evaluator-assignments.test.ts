import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne, transaction } from "@/lib/server/db";
import { assignEvaluator } from "@/lib/server/services/evaluator-assignments";
import { ForbiddenError, ConflictError } from "@/lib/server/errors";
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
    status: "UNDER_REVIEW",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function specialist(): Actor {
  return {
    userId: "specialist-1",
    email: "s@x.com",
    memberships: [
      { membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [{ area: "EVALUATION", action: "ASSIGN" }] },
    ],
  };
}

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("assignEvaluator — self-evaluation block (org_settings.allow_self_evaluation)", () => {
  it("blocks assigning the idea's own submitter as evaluator when self-evaluation is disallowed", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: "user-x" })) // idea lookup
      .mockResolvedValueOnce({ allow_self_evaluation: false }); // org_settings
    await expect(assignEvaluator(specialist(), "idea-1", "user-x")).rejects.toBeInstanceOf(ConflictError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("allows self-evaluation when the organization setting permits it", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: "user-x", status: "UNDER_REVIEW" }))
      .mockResolvedValueOnce({ allow_self_evaluation: true })
      .mockResolvedValueOnce(null); // no existing assignment
    vi.mocked(transaction).mockResolvedValueOnce([
      [{ id: "ea-1", idea_id: "idea-1", evaluator_id: "user-x", assigned_by: "specialist-1", status: "ASSIGNED", due_at: null, assigned_at: "now", updated_at: "now" }],
      [],
      [],
      [],
    ]);
    const result = await assignEvaluator(specialist(), "idea-1", "user-x");
    expect(result.evaluator_id).toBe("user-x");
  });
});

describe("assignEvaluator — duplicate assignment", () => {
  it("throws ConflictError when the evaluator is already assigned to this idea", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow())
      .mockResolvedValueOnce({ id: "existing" }); // UNIQUE(idea_id, evaluator_id) pre-check
    await expect(assignEvaluator(specialist(), "idea-1", "evaluator-1")).rejects.toBeInstanceOf(ConflictError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("assignEvaluator — authorization", () => {
  it("throws ForbiddenError when the actor lacks EVALUATION:ASSIGN", async () => {
    const noPermission: Actor = {
      userId: "u2",
      email: "u2@x.com",
      memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
    };
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    await expect(assignEvaluator(noPermission, "idea-1", "evaluator-1")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("assignEvaluator — auto-transition side effect", () => {
  it("auto-transitions UNDER_REVIEW -> UNDER_EVALUATION when assigning", async () => {
    // evaluatorUserId ("evaluator-1") !== idea.submitter_id ("submitter-1"),
    // so the self-evaluation branch is skipped entirely — only the idea
    // lookup and the duplicate-assignment pre-check hit the database.
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "UNDER_REVIEW" }))
      .mockResolvedValueOnce(null);
    vi.mocked(transaction).mockResolvedValueOnce([
      [{ id: "ea-1", idea_id: "idea-1", evaluator_id: "evaluator-1", assigned_by: "specialist-1", status: "ASSIGNED", due_at: null, assigned_at: "now", updated_at: "now" }],
      [],
      [],
      [],
    ]);
    await assignEvaluator(specialist(), "idea-1", "evaluator-1");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements.some((s) => s.sql.includes("UNDER_EVALUATION"))).toBe(true);
  });

  it("does NOT auto-transition when the idea is already UNDER_EVALUATION", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }))
      .mockResolvedValueOnce(null);
    vi.mocked(transaction).mockResolvedValueOnce([
      [{ id: "ea-1", idea_id: "idea-1", evaluator_id: "evaluator-1", assigned_by: "specialist-1", status: "ASSIGNED", due_at: null, assigned_at: "now", updated_at: "now" }],
      [],
      [],
    ]);
    await assignEvaluator(specialist(), "idea-1", "evaluator-1");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements.some((s) => s.sql.includes("UPDATE ideas SET status"))).toBe(false);
  });
});

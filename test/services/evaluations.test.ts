import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne, transaction } from "@/lib/server/db";
import { submitEvaluation } from "@/lib/server/services/evaluations";
import { ForbiddenError, ConflictError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

const ORG = "org-1";

function ideaRow(): IdeaRow {
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
  };
}

function evaluator(): Actor {
  return {
    userId: "evaluator-1",
    email: "e@x.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "EVALUATOR", grants: [{ area: "EVALUATION", action: "EVALUATE" }] }],
  };
}

const input = {
  ideaId: "idea-1",
  strategicAlignmentScore: 8,
  feasibilityScore: 7,
  resourceReadinessScore: 9,
  notes: "solid",
};

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("submitEvaluation — 'evaluation permissions' boundary: permission alone is not sufficient", () => {
  it("throws ForbiddenError when the actor has EVALUATION:EVALUATE but is NOT the assigned evaluator for this idea", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow()) // idea lookup
      .mockResolvedValueOnce(null); // no assignment row for (idea, this evaluator)
    await expect(submitEvaluation(evaluator(), input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when the actor lacks EVALUATION:EVALUATE entirely, before even checking assignment", async () => {
    const noPermission: Actor = {
      userId: "u2",
      email: "u2@x.com",
      memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
    };
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    await expect(submitEvaluation(noPermission, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(queryOne).toHaveBeenCalledTimes(1);
  });

  it("throws ForbiddenError when the assignment exists but was CANCELLED", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow())
      .mockResolvedValueOnce({ id: "ea-1", status: "CANCELLED" });
    await expect(submitEvaluation(evaluator(), input)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("succeeds when the actor holds EVALUATION:EVALUATE AND is the assigned, active evaluator", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow())
      .mockResolvedValueOnce({ id: "ea-1", status: "ASSIGNED" })
      .mockResolvedValueOnce(null); // no existing evaluation yet
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "eval-1", ...input, evaluator_id: "evaluator-1", submitted_at: "now" }], [], []]);
    const result = await submitEvaluation(evaluator(), input);
    expect(result.evaluator_id).toBe("evaluator-1");
  });
});

describe("submitEvaluation — duplicate evaluation, invalid mutation", () => {
  it("throws ConflictError when this evaluator already submitted an evaluation for this idea", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow())
      .mockResolvedValueOnce({ id: "ea-1", status: "ASSIGNED" })
      .mockResolvedValueOnce({ id: "existing-eval" });
    await expect(submitEvaluation(evaluator(), input)).rejects.toBeInstanceOf(ConflictError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

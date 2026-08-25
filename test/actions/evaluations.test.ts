/**
 * Action-layer tests for lib/server/actions/evaluations.ts (Phase 6,
 * Group C). See test/actions/ideas.test.ts for the pattern rationale —
 * business-rule edge cases (self-evaluation, duplicate assignment, the
 * "must be the assigned evaluator" boundary, etc.) are already exhaustively
 * covered at the service layer in test/services/evaluator-assignments.test.ts
 * and test/services/evaluations.test.ts and are not re-derived here.
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
import { query, queryOne, transaction } from "@/lib/server/db";
import {
  assignEvaluatorAction,
  submitEvaluationAction,
  listAssignmentsForIdeaAction,
  listAssignmentsForOrganizationAction,
  listMyAssignmentsAction,
  listEvaluatorCandidatesAction,
  listEvaluationsForIdeaAction,
  listEvaluationsForOrganizationAction,
} from "@/lib/server/actions/evaluations";
import type { EvaluatorAssignmentRow } from "@/lib/server/services/evaluator-assignments";
import type { EvaluationRow } from "@/lib/server/services/evaluations";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const EVALUATOR_UUID = "44444444-4444-4444-8444-444444444444";
const SUBMITTER_UUID = "66666666-6666-4666-8666-666666666666";

function ideaRow(overrides: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: IDEA_ID,
    organization_id: ORG,
    title: "t",
    description: "d",
    problem_statement: "p",
    proposed_solution: "s",
    expected_impact: "i",
    category_id: "cat-1",
    challenge_id: null,
    opportunity_id: null,
    submitter_id: SUBMITTER_UUID,
    submitter_type: "INTERNAL",
    status: "UNDER_REVIEW",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function assignmentRow(overrides: Partial<EvaluatorAssignmentRow> = {}): EvaluatorAssignmentRow {
  return {
    id: "ea-1",
    idea_id: IDEA_ID,
    evaluator_id: EVALUATOR_UUID,
    assigned_by: "specialist-1",
    status: "ASSIGNED",
    due_at: null,
    assigned_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function evaluationRow(overrides: Partial<EvaluationRow> = {}): EvaluationRow {
  return {
    id: "eval-1",
    idea_id: IDEA_ID,
    evaluator_id: EVALUATOR_UUID,
    strategic_alignment_score: 8,
    feasibility_score: 7,
    resource_readiness_score: 9,
    notes: "solid",
    submitted_at: "2026-01-03T00:00:00Z",
    ...overrides,
  };
}

function specialistActor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: "specialist-1",
    email: "specialist@example.com",
    memberships: [
      {
        membershipId: "m1",
        organizationId: ORG,
        role: "INNOVATION_SPECIALIST",
        grants: [
          { area: "EVALUATION", action: "VIEW" },
          { area: "EVALUATION", action: "ASSIGN" },
          { area: "EVALUATION", action: "EVALUATE" },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("assignEvaluatorAction", () => {
  it("assigns an evaluator for a specialist with EVALUATION:ASSIGN", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "UNDER_REVIEW" }))
      .mockResolvedValueOnce(null); // no existing assignment
    vi.mocked(transaction).mockResolvedValueOnce([[assignmentRow()], [], [], []]);
    const result = await assignEvaluatorAction({ ideaId: IDEA_ID, evaluatorUserId: EVALUATOR_UUID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.evaluator_id).toBe(EVALUATOR_UUID);
  });

  it("fails validation for a malformed evaluatorUserId before touching the database", async () => {
    const result = await assignEvaluatorAction({ ideaId: IDEA_ID, evaluatorUserId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("submitEvaluationAction", () => {
  it("submits an evaluation for the assigned evaluator", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(
      specialistActor({ userId: EVALUATOR_UUID, memberships: [{ membershipId: "m1", organizationId: ORG, role: "EVALUATOR", grants: [{ area: "EVALUATION", action: "EVALUATE" }] }] })
    );
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }))
      .mockResolvedValueOnce({ id: "ea-1", status: "ASSIGNED" })
      .mockResolvedValueOnce(null);
    vi.mocked(transaction).mockResolvedValueOnce([[evaluationRow()], [], []]);
    const result = await submitEvaluationAction({
      ideaId: IDEA_ID,
      strategicAlignmentScore: 8,
      feasibilityScore: 7,
      resourceReadinessScore: 9,
      notes: "solid",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.notes).toBe("solid");
  });

  it("returns FORBIDDEN when the actor is not assigned as evaluator for this idea", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }))
      .mockResolvedValueOnce(null);
    const result = await submitEvaluationAction({
      ideaId: IDEA_ID,
      strategicAlignmentScore: 8,
      feasibilityScore: 7,
      resourceReadinessScore: 9,
      notes: "solid",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("listAssignmentsForIdeaAction", () => {
  it("returns assignments for an org member with EVALUATION:VIEW", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([assignmentRow()]);
    const result = await listAssignmentsForIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([assignmentRow()]);
  });
});

describe("listAssignmentsForOrganizationAction", () => {
  it("returns every assignment in the organization", async () => {
    vi.mocked(query).mockResolvedValueOnce([assignmentRow()]);
    const result = await listAssignmentsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for an organization the actor is not a member of", async () => {
    const result = await listAssignmentsForOrganizationAction({ organizationId: "22222222-2222-4222-8222-222222222222" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listMyAssignmentsAction", () => {
  it("returns the caller's own assignment queue, no input required", async () => {
    vi.mocked(query).mockResolvedValueOnce([assignmentRow({ evaluator_id: "specialist-1" })]);
    const result = await listMyAssignmentsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual(["specialist-1"]);
  });
});

describe("listEvaluatorCandidatesAction", () => {
  it("returns candidate evaluators for an actor with EVALUATION:ASSIGN", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: EVALUATOR_UUID, fullName: "أحمد" }]);
    const result = await listEvaluatorCandidatesAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([{ id: EVALUATOR_UUID, fullName: "أحمد" }]);
  });

  it("returns FORBIDDEN for an actor without EVALUATION:ASSIGN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      userId: "u2",
      email: "u2@example.com",
      memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
    });
    const result = await listEvaluatorCandidatesAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listEvaluationsForIdeaAction", () => {
  it("returns evaluations for an org member with EVALUATION:VIEW", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([evaluationRow()]);
    const result = await listEvaluationsForIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([evaluationRow()]);
  });
});

describe("listEvaluationsForOrganizationAction", () => {
  it("returns every evaluation in the organization", async () => {
    vi.mocked(query).mockResolvedValueOnce([evaluationRow()]);
    const result = await listEvaluationsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});

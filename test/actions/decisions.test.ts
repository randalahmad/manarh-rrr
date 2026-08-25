/**
 * Action-layer tests for lib/server/actions/decisions.ts (Phase 6, Group C).
 * See test/actions/ideas.test.ts for the pattern rationale — business-rule
 * edge cases are already exhaustively covered at the service layer in
 * test/services/decisions.test.ts and are not re-derived here.
 *
 * The INNOVATION_SPECIALIST-lacks-GOVERNANCE tests below are the
 * end-to-end confirmation of the Group C blocker decision: under the real
 * seeded RBAC catalog (db/migrations/0010_rbac_seed.sql), a specialist
 * cannot submit a recommendation, make a decision, or read either — only
 * ORG_ADMIN can, via the isOrgAdmin() special case.
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
  submitRecommendationAction,
  makeDecisionAction,
  listRecommendationsForIdeaAction,
  listRecommendationsForOrganizationAction,
  listDecisionsForIdeaAction,
  listDecisionsForOrganizationAction,
} from "@/lib/server/actions/decisions";
import type { RecommendationRow, DecisionRow } from "@/lib/server/services/decisions";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";

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
    submitter_id: "44444444-4444-4444-8444-444444444444",
    submitter_type: "INTERNAL",
    status: "PENDING_DECISION",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function recommendationRow(overrides: Partial<RecommendationRow> = {}): RecommendationRow {
  return {
    id: "rec-1",
    idea_id: IDEA_ID,
    evaluation_id: null,
    recommendation_type: "APPROVE",
    summary: "good idea",
    submitted_by: "org-admin-1",
    submitted_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function decisionRow(overrides: Partial<DecisionRow> = {}): DecisionRow {
  return {
    id: "dec-1",
    idea_id: IDEA_ID,
    project_id: null,
    recommendation_id: "rec-1",
    decision_type: "APPROVE",
    reason: "meets criteria",
    conditions: null,
    notes: null,
    decided_by: "org-admin-1",
    decided_at: "2026-01-03T00:00:00Z",
    ...overrides,
  };
}

function orgAdmin(): Actor {
  return {
    userId: "org-admin-1",
    email: "admin@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "ORG_ADMIN", grants: [] }],
  };
}

function specialist(): Actor {
  return {
    userId: "specialist-1",
    email: "specialist@example.com",
    memberships: [
      {
        membershipId: "m2",
        organizationId: ORG,
        role: "INNOVATION_SPECIALIST",
        grants: [
          { area: "EVALUATION", action: "VIEW" },
          { area: "EVALUATION", action: "EVALUATE" },
          { area: "EVALUATION", action: "ASSIGN" },
          { area: "IDEA", action: "VIEW" },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("submitRecommendationAction", () => {
  it("succeeds for ORG_ADMIN (isOrgAdmin() special case grants GOVERNANCE:EDIT)", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }));
    vi.mocked(transaction).mockResolvedValueOnce([[recommendationRow()], [], []]);
    vi.mocked(query).mockResolvedValueOnce([]);
    const result = await submitRecommendationAction({ ideaId: IDEA_ID, recommendationType: "APPROVE", summary: "good idea" });
    expect(result.ok).toBe(true);
  });

  it("returns FORBIDDEN for INNOVATION_SPECIALIST — no GOVERNANCE grant in the real seeded catalog", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialist());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_EVALUATION" }));
    const result = await submitRecommendationAction({ ideaId: IDEA_ID, recommendationType: "APPROVE", summary: "good idea" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("makeDecisionAction", () => {
  it("succeeds for ORG_ADMIN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "PENDING_DECISION" }));
    vi.mocked(transaction).mockResolvedValueOnce([[decisionRow()]]);
    const result = await makeDecisionAction({ ideaId: IDEA_ID, decisionType: "APPROVE", reason: "meets criteria" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.decision_type).toBe("APPROVE");
  });

  it("returns FORBIDDEN for INNOVATION_SPECIALIST — no GOVERNANCE grant in the real seeded catalog", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialist());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "PENDING_DECISION" }));
    const result = await makeDecisionAction({ ideaId: IDEA_ID, decisionType: "APPROVE", reason: "meets criteria" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation when neither ideaId nor projectId is given, before touching the database", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    const result = await makeDecisionAction({ decisionType: "APPROVE", reason: "x" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listRecommendationsForIdeaAction", () => {
  it("returns recommendations for ORG_ADMIN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([recommendationRow()]);
    const result = await listRecommendationsForIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([recommendationRow()]);
  });

  it("returns FORBIDDEN for INNOVATION_SPECIALIST", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialist());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await listRecommendationsForIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listRecommendationsForOrganizationAction", () => {
  it("returns every recommendation in the organization for ORG_ADMIN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(query).mockResolvedValueOnce([recommendationRow()]);
    const result = await listRecommendationsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});

describe("listDecisionsForIdeaAction", () => {
  it("returns decisions for ORG_ADMIN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([decisionRow()]);
    const result = await listDecisionsForIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([decisionRow()]);
  });
});

describe("listDecisionsForOrganizationAction", () => {
  it("returns every idea-linked decision in the organization for ORG_ADMIN", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(orgAdmin());
    vi.mocked(query).mockResolvedValueOnce([decisionRow()]);
    const result = await listDecisionsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});

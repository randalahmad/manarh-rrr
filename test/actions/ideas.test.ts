/**
 * Action-layer tests for lib/server/actions/ideas.ts (Phase 6, Group B).
 *
 * Per the Phase 6 plan's testing section: these call the actual exported
 * Server Action functions with a mocked session (`@/lib/server/auth/session`)
 * rather than mocking the service layer directly, verifying the
 * zod-validation -> requireActiveUser() -> service call chain works
 * end-to-end at the boundary the frontend actually calls. Business-rule
 * edge cases (every illegal transition, every ownership rule) are already
 * exhaustively covered at the service layer in test/services/ideas.test.ts
 * and are not re-derived here — each action gets one success path plus the
 * auth/validation boundary checks specific to the action layer.
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
  createIdeaAction,
  getIdeaAction,
  listIdeasAction,
  updateIdeaAction,
  listIdeaStatusHistoryAction,
  transitionIdeaStatusAction,
  withdrawIdeaAction,
} from "@/lib/server/actions/ideas";
import type { IdeaRow, IdeaStatusHistoryRow } from "@/lib/server/services/ideas";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

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
    submitter_id: USER_ID,
    submitter_type: "INTERNAL",
    status: "SUBMITTED",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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
          { area: "IDEA", action: "VIEW" },
          { area: "IDEA", action: "EDIT" },
          { area: "IDEA", action: "CREATE" },
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

describe("getIdeaAction", () => {
  it("returns the idea for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    const result = await getIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(IDEA_ID);
  });

  it("returns UNAUTHENTICATED with no active session and never touches the database", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await getIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for an idea in an organization the actor is not a member of", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ organization_id: OTHER_ORG }));
    const result = await getIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("fails validation for a malformed id before touching the database", async () => {
    const result = await getIdeaAction({ ideaId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
    expect(getCurrentActor).not.toHaveBeenCalled();
  });
});

describe("listIdeasAction", () => {
  it("returns an organization-wide list with no submitter filter (the specialist's shared queue, decision #3)", async () => {
    vi.mocked(query).mockResolvedValueOnce([ideaRow(), ideaRow({ id: "another-idea", submitter_id: "someone-else" })]);
    const result = await listIdeasAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("submitter_id =");
    expect(params).toEqual([ORG]);
  });

  it("returns FORBIDDEN for an organization the actor is not a member of", async () => {
    const result = await listIdeasAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("updateIdeaAction", () => {
  it("updates a DRAFT idea for its own submitter", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor({ userId: USER_ID }));
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "DRAFT" }))
      .mockResolvedValueOnce(ideaRow({ status: "DRAFT", title: "new title" }));
    const result = await updateIdeaAction({ ideaId: IDEA_ID, title: "new title" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe("new title");
  });

  it("returns FORBIDDEN when the caller is not the idea's submitter", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT", submitter_id: "someone-else" }));
    const result = await updateIdeaAction({ ideaId: IDEA_ID, title: "new title" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("listIdeaStatusHistoryAction", () => {
  it("returns the idea's status history for an org member", async () => {
    const historyRow: IdeaStatusHistoryRow = {
      id: "h1",
      idea_id: IDEA_ID,
      from_status: "SUBMITTED",
      to_status: "INITIAL_SCREENING",
      changed_by: "specialist-1",
      note: null,
      changed_at: "2026-01-02T00:00:00Z",
    };
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    vi.mocked(query).mockResolvedValueOnce([historyRow]);
    const result = await listIdeaStatusHistoryAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([historyRow]);
  });

  it("returns NOT_FOUND for a nonexistent idea", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listIdeaStatusHistoryAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("transitionIdeaStatusAction", () => {
  it("applies a legal canonical transition (INNOVATION_SPECIALIST has IDEA:EDIT per the seeded catalog)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "SUBMITTED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[ideaRow({ status: "INITIAL_SCREENING" })], [], []]);
    const result = await transitionIdeaStatusAction({ ideaId: IDEA_ID, toStatus: "INITIAL_SCREENING" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("INITIAL_SCREENING");
  });

  it("returns INVALID_TRANSITION for an illegal edge and never calls transaction", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "SUBMITTED" }));
    const result = await transitionIdeaStatusAction({ ideaId: IDEA_ID, toStatus: "APPROVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("withdrawIdeaAction", () => {
  it("withdraws an idea by its own submitter from an allowed status", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor({ userId: USER_ID }));
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "SUBMITTED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[ideaRow({ status: "WITHDRAWN" })], [], []]);
    const result = await withdrawIdeaAction({ ideaId: IDEA_ID, reason: "changed my mind" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("WITHDRAWN");
  });

  it("returns FORBIDDEN when the caller is not the idea's submitter", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "SUBMITTED", submitter_id: "someone-else" }));
    const result = await withdrawIdeaAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("createIdeaAction", () => {
  it("creates a DRAFT idea for an actor with IDEA:CREATE", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    const result = await createIdeaAction({
      organizationId: ORG,
      title: "New idea title",
      description: "d",
      problemStatement: "p",
      proposedSolution: "s",
      expectedImpact: "i",
      categoryId: "66666666-6666-4666-8666-666666666666",
      submitterType: "INTERNAL",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("DRAFT");
  });

  it("returns FORBIDDEN for an actor with no IDEA:CREATE grant in the organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(
      specialistActor({ memberships: [{ membershipId: "m1", organizationId: ORG, role: "EVALUATOR", grants: [] }] })
    );
    const result = await createIdeaAction({
      organizationId: ORG,
      title: "New idea title",
      description: "d",
      problemStatement: "p",
      proposedSolution: "s",
      expectedImpact: "i",
      categoryId: "66666666-6666-4666-8666-666666666666",
      submitterType: "INTERNAL",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(queryOne).not.toHaveBeenCalled();
  });
});

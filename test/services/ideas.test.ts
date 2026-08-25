import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query, queryOne, transaction } from "@/lib/server/db";
import { createIdea, transitionIdeaStatus, withdrawIdea, updateIdea, type IdeaRow } from "@/lib/server/services/ideas";
import { ForbiddenError, InvalidTransitionError, NotFoundError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

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
    status: "SUBMITTED",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function actorWithout(): Actor {
  return { userId: "submitter-1", email: "e@x.com", memberships: [{ membershipId: "m1", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
}

function actorWith(area: string, action: string, role: Actor["memberships"][number]["role"] = "INTERNAL_INNOVATOR"): Actor {
  return {
    userId: "submitter-1",
    email: "e@x.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role, grants: [{ area: area as never, action: action as never }] }],
  };
}

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("createIdea — authorization before mutation", () => {
  it("throws ForbiddenError and never touches the database when IDEA:CREATE is missing", async () => {
    const actor = actorWithout();
    await expect(
      createIdea(actor, {
        organizationId: ORG,
        title: "t",
        description: "d",
        problemStatement: "p",
        proposedSolution: "s",
        expectedImpact: "i",
        categoryId: "cat-1",
        submitterType: "INTERNAL",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("submitter_id is always the caller's own id, never trusted from input (input has no such field to begin with)", async () => {
    const actor = actorWith("IDEA", "CREATE");
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: actor.userId, status: "DRAFT" }));
    const idea = await createIdea(actor, {
      organizationId: ORG,
      title: "t",
      description: "d",
      problemStatement: "p",
      proposedSolution: "s",
      expectedImpact: "i",
      categoryId: "cat-1",
      submitterType: "INTERNAL",
    });
    expect(idea.submitter_id).toBe(actor.userId);
    const [, params] = vi.mocked(queryOne).mock.calls[0];
    expect(params).toContain(actor.userId);
  });
});

describe("transitionIdeaStatus — canonical workflow + invalid mutations", () => {
  it("throws NotFoundError for a nonexistent idea", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const actor = actorWith("IDEA", "EDIT");
    await expect(transitionIdeaStatus(actor, "missing", "SUBMITTED")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when IDEA:EDIT is missing, before checking the transition graph", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    const actor = actorWithout();
    await expect(transitionIdeaStatus(actor, "idea-1", "SUBMITTED")).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws InvalidTransitionError for an illegal edge and never calls transaction", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    const actor = actorWith("IDEA", "EDIT");
    await expect(transitionIdeaStatus(actor, "idea-1", "APPROVED")).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("applies a legal transition atomically (status + history + audit)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    vi.mocked(transaction).mockResolvedValueOnce([[ideaRow({ status: "SUBMITTED" })], [], []]);
    const actor = actorWith("IDEA", "EDIT");
    const updated = await transitionIdeaStatus(actor, "idea-1", "SUBMITTED");
    expect(updated.status).toBe("SUBMITTED");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements).toHaveLength(3);
    expect(statements[1].sql).toContain("idea_status_history");
    expect(statements[2].sql).toContain("audit_logs");
  });
});

describe("withdrawIdea — ownership + allow-list, unauthorized access", () => {
  it("throws ForbiddenError when the caller is not the idea's submitter", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: "someone-else", status: "SUBMITTED" }));
    const actor = actorWith("IDEA", "EDIT"); // even with a broad grant, ownership still gates this
    await expect(withdrawIdea(actor, "idea-1")).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws InvalidTransitionError from a non-withdrawable status", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "APPROVED" }));
    const actor = actorWith("IDEA", "EDIT");
    await expect(withdrawIdea(actor, "idea-1")).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("withdraws successfully from an allowed status by its own submitter", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "SUBMITTED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[ideaRow({ status: "WITHDRAWN" })], [], []]);
    const actor = actorWith("IDEA", "EDIT");
    const result = await withdrawIdea(actor, "idea-1", "changed my mind");
    expect(result.status).toBe("WITHDRAWN");
  });
});

describe("updateIdea — ownership + editable-status gate", () => {
  it("throws ForbiddenError when the caller is not the idea's submitter", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: "someone-else", status: "DRAFT" }));
    const actor = actorWith("IDEA", "EDIT");
    await expect(updateIdea(actor, "idea-1", { title: "new title" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws InvalidTransitionError once the idea has left DRAFT/NEEDS_INFORMATION", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "UNDER_REVIEW" }));
    const actor = actorWith("IDEA", "EDIT");
    await expect(updateIdea(actor, "idea-1", { title: "new title" })).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("allows an edit from DRAFT and only sets the provided fields", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "DRAFT" }))
      .mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "DRAFT", title: "new title" }));
    const actor = actorWith("IDEA", "EDIT");
    const updated = await updateIdea(actor, "idea-1", { title: "new title" });
    expect(updated.title).toBe("new title");
    const [sql, params] = vi.mocked(queryOne).mock.calls[1];
    expect(sql).toContain("title = $1");
    expect(sql).not.toContain("description =");
    expect(params).toEqual(["new title", "idea-1"]);
  });

  it("allows an edit from NEEDS_INFORMATION (the second editable status)", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "NEEDS_INFORMATION" }))
      .mockResolvedValueOnce(ideaRow({ submitter_id: "submitter-1", status: "NEEDS_INFORMATION" }));
    const actor = actorWith("IDEA", "EDIT");
    await expect(updateIdea(actor, "idea-1", { description: "d2" })).resolves.toBeDefined();
  });
});

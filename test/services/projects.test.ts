import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne, transaction } from "@/lib/server/db";
import { createProjectFromIdea, transitionProjectStatus, archiveProject, type ProjectRow } from "@/lib/server/services/projects";
import { ForbiddenError, ConflictError, InvalidTransitionError, NotFoundError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

const ORG = "org-1";
const OTHER_ORG = "org-2";

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
    status: "APPROVED",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "proj-1",
    organization_id: ORG,
    idea_id: "idea-1",
    challenge_id: null,
    opportunity_id: null,
    name: "New Project",
    description: "d",
    owner_id: "owner-1",
    status: "PROJECT_CREATED",
    previous_active_status: null,
    progress: 0,
    budget: null,
    baseline: null,
    actual_cost: null,
    start_date: "2026-01-01T00:00:00Z",
    expected_completion_date: "2026-06-01T00:00:00Z",
    actual_completion_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function actorWith(area: string, action: string, org = ORG): Actor {
  return {
    userId: "u1",
    email: "u1@x.com",
    memberships: [{ membershipId: "m1", organizationId: org, role: "INNOVATION_SPECIALIST", grants: [{ area: area as never, action: action as never }] }],
  };
}

const createInput = {
  organizationId: ORG,
  ideaId: "idea-1",
  name: "New Project",
  description: "d",
  ownerId: "owner-1",
  startDate: "2026-01-01T00:00:00Z",
  expectedCompletionDate: "2026-06-01T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("createProjectFromIdea — conversion precondition (idea must legally reach CONVERTED_TO_PROJECT)", () => {
  it("throws InvalidTransitionError when the idea's status can't legally convert (e.g. still DRAFT)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    await expect(createProjectFromIdea(actorWith("PROJECT", "CREATE"), createInput)).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it("succeeds from APPROVED, CONDITIONALLY_APPROVED, or IDEA_DEVELOPMENT", async () => {
    for (const status of ["APPROVED", "CONDITIONALLY_APPROVED", "IDEA_DEVELOPMENT"] as const) {
      vi.mocked(queryOne).mockReset();
      vi.mocked(transaction).mockReset();
      vi.mocked(queryOne)
        .mockResolvedValueOnce(ideaRow({ status })) // idea lookup
        .mockResolvedValueOnce(null); // no existing project for this idea
      vi.mocked(transaction)
        .mockResolvedValueOnce([[projectRow()]]) // project insert
        .mockResolvedValueOnce([[], [], [], []]); // idea-side updates
      const project = await createProjectFromIdea(actorWith("PROJECT", "CREATE"), createInput);
      expect(project.id).toBe("proj-1");
    }
  });
});

describe("createProjectFromIdea — cross-organization access", () => {
  it("throws NotFoundError (not ForbiddenError — avoids confirming existence) when the idea belongs to a different org", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ organization_id: OTHER_ORG, status: "APPROVED" }));
    await expect(
      createProjectFromIdea(actorWith("PROJECT", "CREATE", ORG), { ...createInput, organizationId: ORG })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("createProjectFromIdea — UNIQUE(idea_id) conflict", () => {
  it("throws ConflictError when the idea has already been converted", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "APPROVED" }))
      .mockResolvedValueOnce({ id: "existing-project" });
    await expect(createProjectFromIdea(actorWith("PROJECT", "CREATE"), createInput)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createProjectFromIdea — authorization", () => {
  it("throws ForbiddenError without PROJECT:CREATE", async () => {
    const noPerm: Actor = { userId: "u2", email: "u2@x.com", memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
    await expect(createProjectFromIdea(noPerm, createInput)).rejects.toBeInstanceOf(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("transitionProjectStatus — canonical graph + permission-per-destination", () => {
  it("throws InvalidTransitionError for an illegal step (skip-ahead)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "PROJECT_CREATED" }));
    await expect(
      transitionProjectStatus(actorWith("PROJECT", "EDIT"), "proj-1", "PLANNING")
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("applies a legal linear step and persists it", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "PROJECT_CREATED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ status: "DEVELOPMENT" })], [], [], []]);
    const updated = await transitionProjectStatus(actorWith("PROJECT", "EDIT"), "proj-1", "DEVELOPMENT");
    expect(updated.status).toBe("DEVELOPMENT");
  });

  it("entering BLOCKED persists previous_active_status", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "EXECUTION" }));
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ status: "BLOCKED", previous_active_status: "EXECUTION" })], [], [], []]);
    await transitionProjectStatus(actorWith("PROJECT", "EDIT"), "proj-1", "BLOCKED");
    const stmt = vi.mocked(transaction).mock.calls[0][0][0] as { sql: string; params: unknown[] };
    expect(stmt.sql).toContain("previous_active_status");
    expect(stmt.params).toContain("EXECUTION");
  });

  it("leaving BLOCKED requires matching the stored previous_active_status exactly", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "BLOCKED", previous_active_status: "EXECUTION" }));
    await expect(
      transitionProjectStatus(actorWith("PROJECT", "EDIT"), "proj-1", "TESTING")
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("requires PROJECT:ARCHIVE (not PROJECT:EDIT) specifically when the destination is ARCHIVED", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "CLOSED" }));
    const editOnly = actorWith("PROJECT", "EDIT");
    await expect(transitionProjectStatus(editOnly, "proj-1", "ARCHIVED")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("COMPLETED sets progress=100 and actual_completion_date", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "IN_PROGRESS" }));
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ status: "COMPLETED", progress: 100 })], [], [], []]);
    await transitionProjectStatus(actorWith("PROJECT", "EDIT"), "proj-1", "COMPLETED");
    const sql = (vi.mocked(transaction).mock.calls[0][0][0] as { sql: string }).sql;
    expect(sql).toContain("progress = 100");
    expect(sql).toContain("actual_completion_date");
  });
});

describe("archiveProject — deviates from the mock's unconditional archive; only legal from CLOSED", () => {
  it("rejects archiving from a non-CLOSED status", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "IN_PROGRESS" }));
    await expect(archiveProject(actorWith("PROJECT", "ARCHIVE"), "proj-1")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });

  it("archives successfully from CLOSED", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "CLOSED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ status: "ARCHIVED" })], [], [], []]);
    const result = await archiveProject(actorWith("PROJECT", "ARCHIVE"), "proj-1");
    expect(result.status).toBe("ARCHIVED");
  });
});

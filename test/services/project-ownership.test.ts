/**
 * Regression tests for the Final QA / Full Integration Audit's Critical
 * Issue 1 fix (`docs/architecture/manarah-final-integration-audit.md`
 * §16): INTERNAL_INNOVATOR/EXTERNAL_INNOVATOR previously held org-wide
 * PROJECT:CREATE/EDIT and TASK:CREATE/EDIT grants with no per-row
 * ownership/membership check, so they could mutate ANY project in their
 * organization, not just one connected to their own idea.
 *
 * Covers `lib/server/services/project-access.ts`'s shared
 * `requireProjectAccess`/`requireIdeaOwnershipForProjectCreation` helper
 * directly, plus one representative mutation in each of the six affected
 * services (projects.ts, tasks.ts, milestones.ts, requirements.ts,
 * project-members.ts, project-updates.ts), matrixed across:
 *   - an innovator associated via the idea they submitted -> succeeds
 *   - an innovator associated via a project_members row -> succeeds
 *   - an innovator with neither relationship -> ForbiddenError
 *   - ORG_ADMIN / PROJECT_MANAGER -> unaffected, still org-wide access
 *   - cross-organization access -> still ForbiddenError (unchanged
 *     org-membership boundary, re-verified after the refactor)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne, transaction } from "@/lib/server/db";
import { requireProjectAccess, requireIdeaOwnershipForProjectCreation } from "@/lib/server/services/project-access";
import { createProjectFromIdea, updateProjectDetails, type ProjectRow } from "@/lib/server/services/projects";
import { createTask } from "@/lib/server/services/tasks";
import { createMilestone } from "@/lib/server/services/milestones";
import { createRequirement } from "@/lib/server/services/requirements";
import { addProjectMember } from "@/lib/server/services/project-members";
import { addProjectUpdate } from "@/lib/server/services/project-updates";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor, ActorMembership } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

const ORG = "org-1";
const OTHER_ORG = "org-2";
const PROJECT_ID = "proj-1";
const IDEA_ID = "idea-1";
const SUBMITTER_ID = "submitter-1";
const OUTSIDER_ID = "outsider-1";

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    organization_id: ORG,
    idea_id: IDEA_ID,
    challenge_id: null,
    opportunity_id: null,
    name: "Project",
    description: "d",
    owner_id: "owner-1",
    status: "EXECUTION",
    previous_active_status: null,
    progress: 10,
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
    submitter_id: SUBMITTER_ID,
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

function actor(
  userId: string,
  role: ActorMembership["role"],
  area: string,
  action: string,
  organizationId = ORG
): Actor {
  return {
    userId,
    email: `${userId}@x.com`,
    memberships: [
      { membershipId: "m1", organizationId, role, grants: [{ area: area as never, action: action as never }] },
    ],
  };
}

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("requireProjectAccess — the shared ownership/membership boundary", () => {
  it("allows an innovator who submitted the project's originating idea, without a project_members lookup (short-circuits)", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne).mockResolvedValueOnce({ submitter_id: SUBMITTER_ID }); // idea lookup
    const membership = await requireProjectAccess(a, projectRow(), "PROJECT", "EDIT");
    expect(membership.role).toBe("INTERNAL_INNOVATOR");
    expect(queryOne).toHaveBeenCalledTimes(1); // never checked project_members — idea match was enough
  });

  it("allows an innovator who is a project_members row but did not submit the idea", async () => {
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID }) // idea lookup — not a match
      .mockResolvedValueOnce({ id: "member-row-1" }); // project_members lookup — is a member
    const membership = await requireProjectAccess(a, projectRow(), "PROJECT", "EDIT");
    expect(membership.role).toBe("EXTERNAL_INNOVATOR");
  });

  it("rejects an innovator with neither relationship to the project", async () => {
    const a = actor(OUTSIDER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID }) // not the submitter
      .mockResolvedValueOnce(null); // not a member either
    await expect(requireProjectAccess(a, projectRow(), "PROJECT", "EDIT")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("still rejects an innovator lacking the base (area, action) grant, before any ownership lookup", async () => {
    const a: Actor = {
      userId: OUTSIDER_ID,
      email: "x@x.com",
      memberships: [{ membershipId: "m1", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
    };
    await expect(requireProjectAccess(a, projectRow(), "PROJECT", "EDIT")).rejects.toBeInstanceOf(ForbiddenError);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("does not run any ownership lookup for ORG_ADMIN (unaffected, unchanged access)", async () => {
    const a: Actor = {
      userId: "admin-1",
      email: "admin@x.com",
      memberships: [{ membershipId: "m1", organizationId: ORG, role: "ORG_ADMIN", grants: [] }],
    };
    const membership = await requireProjectAccess(a, projectRow(), "PROJECT", "EDIT");
    expect(membership.role).toBe("ORG_ADMIN");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("does not run any ownership lookup for PROJECT_MANAGER (unaffected, unchanged org-wide access)", async () => {
    const a = actor("pm-1", "PROJECT_MANAGER", "PROJECT", "EDIT");
    const membership = await requireProjectAccess(a, projectRow(), "PROJECT", "EDIT");
    expect(membership.role).toBe("PROJECT_MANAGER");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("does not run any ownership lookup for INNOVATION_SPECIALIST (unaffected, unchanged org-wide access)", async () => {
    const a = actor("spec-1", "INNOVATION_SPECIALIST", "PROJECT", "EDIT");
    const membership = await requireProjectAccess(a, projectRow(), "PROJECT", "EDIT");
    expect(membership.role).toBe("INNOVATION_SPECIALIST");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("rejects cross-organization access before any ownership lookup (unchanged org-membership boundary)", async () => {
    const a = actor("pm-1", "PROJECT_MANAGER", "PROJECT", "EDIT", OTHER_ORG);
    await expect(requireProjectAccess(a, projectRow({ organization_id: ORG }), "PROJECT", "EDIT")).rejects.toBeInstanceOf(
      ForbiddenError
    );
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("requireIdeaOwnershipForProjectCreation — converting an idea into a project", () => {
  it("allows an innovator converting their own idea", () => {
    const membership: ActorMembership = { membershipId: "m1", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] };
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "CREATE");
    expect(() =>
      requireIdeaOwnershipForProjectCreation(membership, a, { submitter_id: SUBMITTER_ID })
    ).not.toThrow();
  });

  it("rejects an innovator converting someone else's idea", () => {
    const membership: ActorMembership = { membershipId: "m1", organizationId: ORG, role: "EXTERNAL_INNOVATOR", grants: [] };
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "PROJECT", "CREATE");
    expect(() =>
      requireIdeaOwnershipForProjectCreation(membership, a, { submitter_id: SUBMITTER_ID })
    ).toThrow(ForbiddenError);
  });

  it("does not restrict ORG_ADMIN/PROJECT_MANAGER/INNOVATION_SPECIALIST converting someone else's idea", () => {
    for (const role of ["ORG_ADMIN", "PROJECT_MANAGER", "INNOVATION_SPECIALIST"] as const) {
      const membership: ActorMembership = { membershipId: "m1", organizationId: ORG, role, grants: [] };
      const a = actor("staff-1", role, "PROJECT", "CREATE");
      expect(() =>
        requireIdeaOwnershipForProjectCreation(membership, a, { submitter_id: SUBMITTER_ID })
      ).not.toThrow();
    }
  });
});

describe("createProjectFromIdea — innovator may only convert their own idea", () => {
  const createInput = {
    organizationId: ORG,
    ideaId: IDEA_ID,
    name: "New Project",
    description: "d",
    ownerId: "owner-1",
    startDate: "2026-01-01T00:00:00Z",
    expectedCompletionDate: "2026-06-01T00:00:00Z",
  };

  it("succeeds when the innovator submitted the idea being converted", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "CREATE");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: SUBMITTER_ID, status: "APPROVED" }))
      .mockResolvedValueOnce(null); // no existing project for this idea
    vi.mocked(transaction)
      .mockResolvedValueOnce([[projectRow()]])
      .mockResolvedValueOnce([[], [], [], []]);
    const project = await createProjectFromIdea(a, createInput);
    expect(project.id).toBe(PROJECT_ID);
  });

  it("throws ForbiddenError when the innovator did not submit the idea being converted", async () => {
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "PROJECT", "CREATE");
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ submitter_id: SUBMITTER_ID, status: "APPROVED" }));
    await expect(createProjectFromIdea(a, createInput)).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ORG_ADMIN may still convert an idea submitted by someone else (unaffected)", async () => {
    const a: Actor = { userId: "admin-1", email: "a@x.com", memberships: [{ membershipId: "m1", organizationId: ORG, role: "ORG_ADMIN", grants: [] }] };
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ submitter_id: SUBMITTER_ID, status: "APPROVED" }))
      .mockResolvedValueOnce(null);
    vi.mocked(transaction)
      .mockResolvedValueOnce([[projectRow()]])
      .mockResolvedValueOnce([[], [], [], []]);
    const project = await createProjectFromIdea(a, createInput);
    expect(project.id).toBe(PROJECT_ID);
  });
});

describe("updateProjectDetails — ownership boundary", () => {
  it("succeeds for the innovator who submitted the project's idea", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID });
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ name: "Renamed" })], []]);
    const updated = await updateProjectDetails(a, PROJECT_ID, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("throws ForbiddenError for an innovator editing an unrelated project", async () => {
    const a = actor(OUTSIDER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(updateProjectDetails(a, PROJECT_ID, { name: "Hijacked" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ORG_ADMIN may still edit any project in the organization (unaffected)", async () => {
    const a: Actor = { userId: "admin-1", email: "a@x.com", memberships: [{ membershipId: "m1", organizationId: ORG, role: "ORG_ADMIN", grants: [] }] };
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ name: "Renamed" })], []]);
    const updated = await updateProjectDetails(a, PROJECT_ID, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("PROJECT_MANAGER may still edit any project in the organization (unaffected)", async () => {
    const a = actor("pm-1", "PROJECT_MANAGER", "PROJECT", "EDIT");
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ name: "Renamed" })], []]);
    const updated = await updateProjectDetails(a, PROJECT_ID, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("throws ForbiddenError for a cross-organization actor regardless of role", async () => {
    const a = actor("pm-1", "PROJECT_MANAGER", "PROJECT", "EDIT", OTHER_ORG);
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: ORG }));
    await expect(updateProjectDetails(a, PROJECT_ID, { name: "Hijacked" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createTask — ownership boundary", () => {
  const input = { projectId: PROJECT_ID, title: "Task" };

  it("succeeds for a project_members-associated innovator", async () => {
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "TASK", "CREATE");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce({ id: "member-row-1" });
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "task-1" }], []]);
    const result = await createTask(a, input);
    expect(result).toBeDefined();
  });

  it("throws ForbiddenError for an innovator unrelated to the project", async () => {
    const a = actor(OUTSIDER_ID, "INTERNAL_INNOVATOR", "TASK", "CREATE");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(createTask(a, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("INNOVATION_SPECIALIST may still create a task on any project (unaffected)", async () => {
    const a = actor("spec-1", "INNOVATION_SPECIALIST", "TASK", "CREATE");
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "task-1" }], []]);
    const result = await createTask(a, input);
    expect(result).toBeDefined();
  });
});

describe("createMilestone — ownership boundary", () => {
  it("succeeds for the idea-submitter innovator", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID });
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "milestone-1" }], []]);
    const result = await createMilestone(a, { projectId: PROJECT_ID, title: "M1", dueDate: "2026-03-01T00:00:00Z" });
    expect(result).toBeDefined();
  });

  it("throws ForbiddenError for an unrelated innovator", async () => {
    const a = actor(OUTSIDER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(
      createMilestone(a, { projectId: PROJECT_ID, title: "M1", dueDate: "2026-03-01T00:00:00Z" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createRequirement — ownership boundary", () => {
  it("succeeds for the idea-submitter innovator", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID });
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "req-1" }], []]);
    const result = await createRequirement(a, { projectId: PROJECT_ID, title: "R1", description: "d" });
    expect(result).toBeDefined();
  });

  it("throws ForbiddenError for an unrelated innovator", async () => {
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(createRequirement(a, { projectId: PROJECT_ID, title: "R1", description: "d" })).rejects.toBeInstanceOf(
      ForbiddenError
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("addProjectMember — ownership boundary", () => {
  it("succeeds for the idea-submitter innovator", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null); // not already a member
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "member-1" }], []]);
    const result = await addProjectMember(a, PROJECT_ID, "new-user-1", "Contributor");
    expect(result).toBeDefined();
  });

  it("throws ForbiddenError for an unrelated innovator", async () => {
    const a = actor(OUTSIDER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(addProjectMember(a, PROJECT_ID, "new-user-1", "Contributor")).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("addProjectUpdate — ownership boundary", () => {
  it("succeeds for the idea-submitter innovator", async () => {
    const a = actor(SUBMITTER_ID, "INTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID });
    vi.mocked(transaction).mockResolvedValueOnce([[{ id: "update-1" }], []]);
    const result = await addProjectUpdate(a, { projectId: PROJECT_ID, updateType: "NOTE", content: "note" });
    expect(result).toBeDefined();
  });

  it("throws ForbiddenError for an unrelated innovator", async () => {
    const a = actor(OUTSIDER_ID, "EXTERNAL_INNOVATOR", "PROJECT", "EDIT");
    vi.mocked(queryOne)
      .mockResolvedValueOnce(projectRow())
      .mockResolvedValueOnce({ submitter_id: SUBMITTER_ID })
      .mockResolvedValueOnce(null);
    await expect(
      addProjectUpdate(a, { projectId: PROJECT_ID, updateType: "NOTE", content: "note" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

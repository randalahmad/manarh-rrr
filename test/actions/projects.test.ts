/**
 * Action-layer tests for lib/server/actions/projects.ts (Phase 6, Group D).
 * See test/actions/ideas.test.ts for the pattern rationale — business-rule
 * edge cases (linear-graph enforcement, BLOCKED/ON_HOLD previous-status
 * restore, ARCHIVE-vs-EDIT permission split, UNIQUE(idea_id) conflict,
 * cross-org guard) are already exhaustively covered at the service layer in
 * test/services/projects.test.ts and are not re-derived here. This file
 * confirms: schema validation happens before any DB touch, the RBAC
 * boundary is enforced end-to-end through the action layer for the roles
 * the real seeded catalog (db/migrations/0010_rbac_seed.sql) actually
 * grants/withholds PROJECT permissions to, and the three new Group D read
 * actions (getProjectAction, listProjectsAction,
 * listProjectOwnerCandidatesAction) are wired correctly.
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
  createProjectFromIdeaAction,
  transitionProjectStatusAction,
  getProjectAction,
  listProjectsAction,
  listProjectOwnerCandidatesAction,
} from "@/lib/server/actions/projects";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const OWNER_ID = "44444444-4444-4444-8444-444444444444";

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
    submitter_id: "66666666-6666-4666-8666-666666666666",
    submitter_type: "INTERNAL",
    status: "APPROVED",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    organization_id: ORG,
    idea_id: IDEA_ID,
    challenge_id: null,
    opportunity_id: null,
    name: "مشروع تجريبي",
    description: "وصف",
    owner_id: OWNER_ID,
    status: "PROJECT_CREATED",
    previous_active_status: null,
    progress: 0,
    budget: null,
    baseline: null,
    actual_cost: null,
    start_date: "2026-01-01T00:00:00Z",
    expected_completion_date: "2026-04-01T00:00:00Z",
    actual_completion_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Full PROJECT:* grant — matches INNOVATION_SPECIALIST/PROJECT_MANAGER in the real seeded catalog. */
function projectManager(): Actor {
  return {
    userId: "pm-1",
    email: "pm@example.com",
    memberships: [
      {
        membershipId: "m1",
        organizationId: ORG,
        role: "PROJECT_MANAGER",
        grants: [
          { area: "PROJECT", action: "VIEW" },
          { area: "PROJECT", action: "CREATE" },
          { area: "PROJECT", action: "EDIT" },
          { area: "PROJECT", action: "ARCHIVE" },
        ],
      },
    ],
  };
}

/** No PROJECT:* grant at all — matches EVALUATOR in the real seeded catalog. */
function evaluator(): Actor {
  return {
    userId: "eval-1",
    email: "eval@example.com",
    memberships: [{ membershipId: "m2", organizationId: ORG, role: "EVALUATOR", grants: [] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(projectManager());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createProjectFromIdeaAction", () => {
  it("creates a project from an approved idea for an actor with PROJECT:CREATE", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(ideaRow({ status: "APPROVED" })) // idea lookup
      .mockResolvedValueOnce(null); // no existing project for this idea
    vi.mocked(transaction)
      .mockResolvedValueOnce([[projectRow()]]) // insert project
      .mockResolvedValueOnce([[], [], [], []]); // idea-side effects
    const result = await createProjectFromIdeaAction({
      organizationId: ORG,
      ideaId: IDEA_ID,
      name: "مشروع تجريبي",
      description: "وصف",
      ownerId: OWNER_ID,
      startDate: "2026-01-01T00:00:00Z",
      expectedCompletionDate: "2026-04-01T00:00:00Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("PROJECT_CREATED");
  });

  it("returns FORBIDDEN for an actor with no PROJECT:CREATE grant — no DB touch", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(evaluator());
    const result = await createProjectFromIdeaAction({
      organizationId: ORG,
      ideaId: IDEA_ID,
      name: "مشروع تجريبي",
      description: "وصف",
      ownerId: OWNER_ID,
      startDate: "2026-01-01T00:00:00Z",
      expectedCompletionDate: "2026-04-01T00:00:00Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(queryOne).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation for a missing required field before touching the database", async () => {
    const result = await createProjectFromIdeaAction({
      organizationId: ORG,
      ideaId: IDEA_ID,
      description: "وصف",
      ownerId: OWNER_ID,
      startDate: "2026-01-01T00:00:00Z",
      expectedCompletionDate: "2026-04-01T00:00:00Z",
    });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("transitionProjectStatusAction", () => {
  it("applies a legal linear step for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "PROJECT_CREATED" }));
    vi.mocked(transaction).mockResolvedValueOnce([[projectRow({ status: "DEVELOPMENT" })], [], [], []]);
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "DEVELOPMENT" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("DEVELOPMENT");
  });

  it("rejects an illegal skip-ahead transition", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "PROJECT_CREATED" }));
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "EXECUTION" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("entering BLOCKED persists previous_active_status", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "EXECUTION" }));
    vi.mocked(transaction).mockResolvedValueOnce([
      [projectRow({ status: "BLOCKED", previous_active_status: "EXECUTION" })],
      [],
      [],
      [],
    ]);
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "BLOCKED" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("BLOCKED");
      expect(result.data.previous_active_status).toBe("EXECUTION");
    }
    const [statements] = vi.mocked(transaction).mock.calls[0] as [{ sql: string; params?: unknown[] }[]];
    expect(statements[0].sql).toContain("previous_active_status");
  });

  it("leaving BLOCKED to anything other than the stored previous status is rejected", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(
      projectRow({ status: "BLOCKED", previous_active_status: "EXECUTION" })
    );
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "TESTING" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("leaving BLOCKED to the exact stored previous status restores it and clears the column", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(
      projectRow({ status: "BLOCKED", previous_active_status: "EXECUTION" })
    );
    vi.mocked(transaction).mockResolvedValueOnce([
      [projectRow({ status: "EXECUTION", previous_active_status: null })],
      [],
      [],
      [],
    ]);
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "EXECUTION" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("EXECUTION");
      expect(result.data.previous_active_status).toBeNull();
    }
  });

  it("transitioning to ARCHIVED requires PROJECT:ARCHIVE, not just PROJECT:EDIT", async () => {
    const editOnly: Actor = {
      userId: "editor-1",
      email: "editor@example.com",
      memberships: [
        {
          membershipId: "m3",
          organizationId: ORG,
          role: "PROJECT_MANAGER",
          grants: [{ area: "PROJECT", action: "EDIT" }],
        },
      ],
    };
    vi.mocked(getCurrentActor).mockResolvedValue(editOnly);
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "CLOSED" }));
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "ARCHIVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for an actor with no PROJECT grant at all", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(evaluator());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ status: "PROJECT_CREATED" }));
    const result = await transitionProjectStatusAction({ projectId: PROJECT_ID, toStatus: "DEVELOPMENT" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("getProjectAction", () => {
  it("returns the project for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await getProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(PROJECT_ID);
  });

  it("fails validation for a malformed projectId before touching the database", async () => {
    const result = await getProjectAction({ projectId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listProjectsAction", () => {
  it("returns every project in the organization", async () => {
    vi.mocked(query).mockResolvedValueOnce([projectRow()]);
    const result = await listProjectsAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for an organization the actor is not a member of", async () => {
    const result = await listProjectsAction({ organizationId: "22222222-2222-4222-8222-222222222222" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listProjectOwnerCandidatesAction", () => {
  it("returns candidate owners for an actor with PROJECT:CREATE", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: OWNER_ID, fullName: "خالد" }]);
    const result = await listProjectOwnerCandidatesAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([{ id: OWNER_ID, fullName: "خالد" }]);
  });

  it("returns FORBIDDEN for an actor without PROJECT:CREATE", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(evaluator());
    const result = await listProjectOwnerCandidatesAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

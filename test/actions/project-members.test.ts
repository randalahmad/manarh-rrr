/**
 * Action-layer tests for lib/server/actions/project-members.ts (Phase 6,
 * Group E). Gated on PROJECT:EDIT — no separate project-membership concept
 * is created; this is the same real project_members table Phase 5 built.
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
import { addProjectMemberAction, removeProjectMemberAction, listProjectMembersAction } from "@/lib/server/actions/project-members";
import type { ProjectMemberRow } from "@/lib/server/services/project-members";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const USER_ID = "99999999-9999-4999-8999-999999999999";
const MEMBER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    organization_id: ORG,
    idea_id: "idea-1",
    challenge_id: null,
    opportunity_id: null,
    name: "مشروع",
    description: "وصف",
    owner_id: "owner-1",
    status: "EXECUTION",
    previous_active_status: null,
    progress: 20,
    budget: null,
    baseline: null,
    actual_cost: null,
    start_date: "2026-01-01T00:00:00Z",
    expected_completion_date: "2026-04-01T00:00:00Z",
    actual_completion_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as ProjectRow;
}

function memberRow(overrides: Partial<ProjectMemberRow> = {}): ProjectMemberRow {
  return {
    id: MEMBER_ID,
    project_id: PROJECT_ID,
    user_id: USER_ID,
    role_in_project: "مطور",
    added_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function editorActor(): Actor {
  return {
    userId: "editor-1",
    email: "editor@example.com",
    memberships: [
      { membershipId: "m1", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "PROJECT", action: "EDIT" }] },
    ],
  };
}

function viewOnlyActor(): Actor {
  return {
    userId: "viewer-1",
    email: "viewer@example.com",
    memberships: [{ membershipId: "m2", organizationId: ORG, role: "EVALUATOR", grants: [{ area: "PROJECT", action: "VIEW" }] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(editorActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("addProjectMemberAction", () => {
  it("adds a member for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow()).mockResolvedValueOnce(null);
    vi.mocked(transaction).mockResolvedValueOnce([[memberRow()], []]);
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.user_id).toBe(USER_ID);
  });

  it("returns a CONFLICT business-rule violation when the user is already a member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow()).mockResolvedValueOnce({ id: MEMBER_ID });
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "مطور" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a missing roleInProject", async () => {
    const result = await addProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID, roleInProject: "" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("removeProjectMemberAction", () => {
  it("removes a member for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[], []]);
    const result = await removeProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID });
    expect(result.ok).toBe(true);
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await removeProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await removeProjectMemberAction({ projectId: PROJECT_ID, userId: USER_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("listProjectMembersAction", () => {
  it("returns members for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([memberRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listProjectMembersAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listProjectMembersAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listProjectMembersAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

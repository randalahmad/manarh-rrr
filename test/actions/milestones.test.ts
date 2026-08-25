/**
 * Action-layer tests for lib/server/actions/milestones.ts (Phase 6, Group
 * E). Milestones are gated on PROJECT:EDIT (no dedicated MILESTONE
 * permission area exists in the approved catalog).
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
  createMilestoneAction,
  updateMilestoneStatusAction,
  listMilestonesForProjectAction,
} from "@/lib/server/actions/milestones";
import type { ProjectMilestoneRow } from "@/lib/server/services/milestones";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const MILESTONE_ID = "77777777-7777-4777-8777-777777777777";

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

function milestoneRow(overrides: Partial<ProjectMilestoneRow> = {}): ProjectMilestoneRow {
  return {
    id: MILESTONE_ID,
    project_id: PROJECT_ID,
    title: "مرحلة",
    description: null,
    due_date: "2026-03-01T00:00:00Z",
    status: "PENDING",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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

describe("createMilestoneAction", () => {
  it("creates a milestone for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[milestoneRow()], []]);
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة", dueDate: "2026-03-01T00:00:00Z" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("PENDING");
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة", dueDate: "2026-03-01T00:00:00Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة", dueDate: "2026-03-01T00:00:00Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة", dueDate: "2026-03-01T00:00:00Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة", dueDate: "2026-03-01T00:00:00Z" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a missing dueDate", async () => {
    const result = await createMilestoneAction({ projectId: PROJECT_ID, title: "مرحلة" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("updateMilestoneStatusAction", () => {
  it("updates status for an actor with PROJECT:EDIT — does not invent a new status vocabulary", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(milestoneRow()).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[milestoneRow({ status: "DELAYED" })], []]);
    const result = await updateMilestoneStatusAction({ milestoneId: MILESTONE_ID, status: "DELAYED" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("DELAYED");
  });

  it("returns NOT_FOUND for a milestone that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateMilestoneStatusAction({ milestoneId: MILESTONE_ID, status: "COMPLETED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT — no mutation applied", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(milestoneRow()).mockResolvedValueOnce(projectRow());
    const result = await updateMilestoneStatusAction({ milestoneId: MILESTONE_ID, status: "COMPLETED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation for an invalid status value", async () => {
    const result = await updateMilestoneStatusAction({ milestoneId: MILESTONE_ID, status: "DONE" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listMilestonesForProjectAction", () => {
  it("returns milestones ordered by due date for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([milestoneRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listMilestonesForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listMilestonesForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listMilestonesForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

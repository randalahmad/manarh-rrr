/**
 * Action-layer tests for lib/server/actions/tasks.ts (Phase 6, Group E).
 * Tasks use real dedicated TASK:CREATE / TASK:EDIT / TASK:ASSIGN permission
 * areas (catalog p30-p33), unlike requirements/milestones/members/updates.
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
import { createTaskAction, updateTaskStatusAction, assignTaskAction, listTasksForProjectAction } from "@/lib/server/actions/tasks";
import type { ProjectTaskRow } from "@/lib/server/services/tasks";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const TASK_ID = "88888888-8888-4888-8888-888888888888";
const ASSIGNEE_ID = "99999999-9999-4999-8999-999999999999";

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

function taskRow(overrides: Partial<ProjectTaskRow> = {}): ProjectTaskRow {
  return {
    id: TASK_ID,
    project_id: PROJECT_ID,
    title: "مهمة",
    description: null,
    assignee_id: null,
    status: "TODO",
    priority: "MEDIUM",
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Full TASK:* grant. */
function taskManagerActor(): Actor {
  return {
    userId: "manager-1",
    email: "manager@example.com",
    memberships: [
      {
        membershipId: "m1",
        organizationId: ORG,
        role: "PROJECT_MANAGER",
        grants: [
          { area: "TASK", action: "CREATE" },
          { area: "TASK", action: "EDIT" },
          { area: "TASK", action: "ASSIGN" },
          { area: "PROJECT", action: "VIEW" },
        ],
      },
    ],
  };
}

/** No TASK:* grant at all. */
function noTaskGrantActor(): Actor {
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
  vi.mocked(getCurrentActor).mockResolvedValue(taskManagerActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createTaskAction", () => {
  it("creates a task for an actor with TASK:CREATE", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[taskRow()], []]);
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("TODO");
  });

  it("creates a task with an assignee and sends a notification statement", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[taskRow({ assignee_id: ASSIGNEE_ID })], [], []]);
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة", assigneeId: ASSIGNEE_ID });
    expect(result.ok).toBe(true);
    const [statements] = vi.mocked(transaction).mock.calls[0] as [{ sql: string }[]];
    expect(statements).toHaveLength(3); // insert + notification + audit
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without TASK:CREATE", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noTaskGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createTaskAction({ projectId: PROJECT_ID, title: "مهمة" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a missing title", async () => {
    const result = await createTaskAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("updateTaskStatusAction", () => {
  it("updates status for an actor with TASK:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(taskRow()).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[taskRow({ status: "IN_PROGRESS" })], []]);
    const result = await updateTaskStatusAction({ taskId: TASK_ID, status: "IN_PROGRESS" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("IN_PROGRESS");
  });

  it("returns NOT_FOUND for a task that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateTaskStatusAction({ taskId: TASK_ID, status: "DONE" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without TASK:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noTaskGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce(taskRow()).mockResolvedValueOnce(projectRow());
    const result = await updateTaskStatusAction({ taskId: TASK_ID, status: "DONE" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("assignTaskAction", () => {
  it("assigns a task for an actor with TASK:ASSIGN (distinct from TASK:EDIT)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(taskRow()).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[taskRow({ assignee_id: ASSIGNEE_ID })], [], []]);
    const result = await assignTaskAction({ taskId: TASK_ID, assigneeId: ASSIGNEE_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.assignee_id).toBe(ASSIGNEE_ID);
  });

  it("returns FORBIDDEN for an actor with TASK:EDIT but not TASK:ASSIGN", async () => {
    const editOnly: Actor = {
      userId: "editor-1",
      email: "editor@example.com",
      memberships: [{ membershipId: "m3", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "TASK", action: "EDIT" }] }],
    };
    vi.mocked(getCurrentActor).mockResolvedValue(editOnly);
    vi.mocked(queryOne).mockResolvedValueOnce(taskRow()).mockResolvedValueOnce(projectRow());
    const result = await assignTaskAction({ taskId: TASK_ID, assigneeId: ASSIGNEE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a task that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await assignTaskAction({ taskId: TASK_ID, assigneeId: ASSIGNEE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("listTasksForProjectAction", () => {
  it("returns tasks for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([taskRow()]);
    const result = await listTasksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listTasksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listTasksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

/**
 * Action-layer tests for lib/server/actions/project-updates.ts (Phase 6,
 * Group E). Gated on PROJECT:EDIT. Covers the business-rule violation this
 * action explicitly enforces: STATUS_CHANGE rows can only ever be written
 * by transitionProjectStatus's own transaction, never accepted as free-form
 * client input here — the audit trail could otherwise be forged.
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
import { addProjectUpdateAction, listProjectUpdatesAction } from "@/lib/server/actions/project-updates";
import type { ProjectUpdateRow } from "@/lib/server/services/project-updates";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";

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

function updateRow(overrides: Partial<ProjectUpdateRow> = {}): ProjectUpdateRow {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    project_id: PROJECT_ID,
    author_id: "editor-1",
    update_type: "NOTE",
    content: "تحديث",
    created_at: "2026-01-01T00:00:00Z",
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

describe("addProjectUpdateAction", () => {
  it("adds a NOTE update for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[updateRow()], []]);
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "تحديث" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.update_type).toBe("NOTE");
  });

  it("rejects a client-supplied STATUS_CHANGE update — business rule, not schema-level", async () => {
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "STATUS_CHANGE", content: "forged" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "تحديث" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "تحديث" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "تحديث" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "تحديث" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for empty content", async () => {
    const result = await addProjectUpdateAction({ projectId: PROJECT_ID, updateType: "NOTE", content: "" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listProjectUpdatesAction", () => {
  it("returns updates for an org member, including real STATUS_CHANGE rows written by the workflow", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([updateRow({ update_type: "STATUS_CHANGE", content: "EXECUTION" }), updateRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listProjectUpdatesAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(2);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listProjectUpdatesAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listProjectUpdatesAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

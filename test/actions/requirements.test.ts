/**
 * Action-layer tests for lib/server/actions/requirements.ts (Phase 6, Group
 * E). Requirements are gated on PROJECT:EDIT (no dedicated REQUIREMENT
 * permission area exists in the approved catalog — see the service file's
 * own header comment). Covers: success, unauthenticated, unauthorized role,
 * cross-organization access, invalid input, not found, and audit behavior.
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
  createRequirementAction,
  updateRequirementStatusAction,
  listRequirementsForProjectAction,
} from "@/lib/server/actions/requirements";
import type { ProjectRequirementRow } from "@/lib/server/services/requirements";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const REQUIREMENT_ID = "66666666-6666-4666-8666-666666666666";

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

function requirementRow(overrides: Partial<ProjectRequirementRow> = {}): ProjectRequirementRow {
  return {
    id: REQUIREMENT_ID,
    project_id: PROJECT_ID,
    title: "متطلب",
    description: "وصف المتطلب",
    status: "PENDING",
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** PROJECT:EDIT grant — matches PROJECT_MANAGER/INNOVATION_SPECIALIST in the real seeded catalog. */
function editorActor(): Actor {
  return {
    userId: "editor-1",
    email: "editor@example.com",
    memberships: [
      { membershipId: "m1", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "PROJECT", action: "EDIT" }] },
    ],
  };
}

/** No PROJECT:EDIT grant — matches EVALUATOR in the real seeded catalog. */
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

describe("createRequirementAction", () => {
  it("creates a requirement for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[requirementRow()], []]);
    const result = await createRequirementAction({ projectId: PROJECT_ID, title: "متطلب", description: "وصف المتطلب" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe("متطلب");
    const [statements] = vi.mocked(transaction).mock.calls[0] as [{ sql: string }[]];
    expect(statements[1].sql).toContain("audit_logs");
  });

  it("returns UNAUTHENTICATED with no active session — no DB touch", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createRequirementAction({ projectId: PROJECT_ID, title: "متطلب", description: "وصف" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await createRequirementAction({ projectId: PROJECT_ID, title: "متطلب", description: "وصف" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in an organization the actor is not a member of", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await createRequirementAction({ projectId: PROJECT_ID, title: "متطلب", description: "وصف" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createRequirementAction({ projectId: PROJECT_ID, title: "متطلب", description: "وصف" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a missing title before touching the database", async () => {
    const result = await createRequirementAction({ projectId: PROJECT_ID, description: "وصف" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("updateRequirementStatusAction", () => {
  it("updates status for an actor with PROJECT:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(requirementRow()).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[requirementRow({ status: "IN_PROGRESS" })], []]);
    const result = await updateRequirementStatusAction({ requirementId: REQUIREMENT_ID, status: "IN_PROGRESS" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("IN_PROGRESS");
  });

  it("returns NOT_FOUND for a requirement that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateRequirementStatusAction({ requirementId: REQUIREMENT_ID, status: "DONE" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without PROJECT:EDIT — no mutation applied", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(requirementRow()).mockResolvedValueOnce(projectRow());
    const result = await updateRequirementStatusAction({ requirementId: REQUIREMENT_ID, status: "DONE" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation for an invalid status value", async () => {
    const result = await updateRequirementStatusAction({ requirementId: REQUIREMENT_ID, status: "CANCELLED" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listRequirementsForProjectAction", () => {
  it("returns requirements for an org member (VIEW-level access suffices)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([requirementRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listRequirementsForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listRequirementsForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listRequirementsForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for a malformed projectId", async () => {
    const result = await listRequirementsForProjectAction({ projectId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

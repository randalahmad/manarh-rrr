/**
 * Action-layer tests for lib/server/actions/risks.ts (Phase 6, Group E).
 * Risks use real dedicated RISK:CREATE / RISK:EDIT permission areas
 * (catalog p36-p38), same posture as tasks.ts.
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
import { createRiskAction, updateRiskAction, listRisksForProjectAction } from "@/lib/server/actions/risks";
import type { ProjectRiskRow } from "@/lib/server/services/risks";
import type { ProjectRow } from "@/lib/server/services/projects";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const RISK_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function riskRow(overrides: Partial<ProjectRiskRow> = {}): ProjectRiskRow {
  return {
    id: RISK_ID,
    project_id: PROJECT_ID,
    title: "خطر",
    description: "وصف الخطر",
    level: "MEDIUM",
    status: "OPEN",
    owner_id: null,
    mitigation_plan: null,
    blocker: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function riskManagerActor(): Actor {
  return {
    userId: "manager-1",
    email: "manager@example.com",
    memberships: [
      {
        membershipId: "m1",
        organizationId: ORG,
        role: "PROJECT_MANAGER",
        grants: [
          { area: "RISK", action: "CREATE" },
          { area: "RISK", action: "EDIT" },
          { area: "PROJECT", action: "VIEW" },
        ],
      },
    ],
  };
}

function noRiskGrantActor(): Actor {
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
  vi.mocked(getCurrentActor).mockResolvedValue(riskManagerActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createRiskAction", () => {
  it("creates a risk for an actor with RISK:CREATE and notifies the project owner", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[riskRow()], [], []]);
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف الخطر", level: "MEDIUM" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.level).toBe("MEDIUM");
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف", level: "LOW" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without RISK:CREATE", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noRiskGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف", level: "LOW" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف", level: "LOW" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف", level: "LOW" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation for an invalid risk level", async () => {
    const result = await createRiskAction({ projectId: PROJECT_ID, title: "خطر", description: "وصف", level: "EXTREME" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("updateRiskAction", () => {
  it("updates a risk for an actor with RISK:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(riskRow()).mockResolvedValueOnce(projectRow());
    vi.mocked(transaction).mockResolvedValueOnce([[riskRow({ status: "MITIGATED" })], []]);
    const result = await updateRiskAction({ riskId: RISK_ID, status: "MITIGATED" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("MITIGATED");
  });

  it("returns NOT_FOUND for a risk that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateRiskAction({ riskId: RISK_ID, status: "CLOSED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without RISK:EDIT — no mutation applied", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(noRiskGrantActor());
    vi.mocked(queryOne).mockResolvedValueOnce(riskRow()).mockResolvedValueOnce(projectRow());
    const result = await updateRiskAction({ riskId: RISK_ID, status: "CLOSED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("listRisksForProjectAction", () => {
  it("returns risks for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow());
    vi.mocked(query).mockResolvedValueOnce([riskRow()]);
    const result = await listRisksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(projectRow({ organization_id: OTHER_ORG }));
    const result = await listRisksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listRisksForProjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

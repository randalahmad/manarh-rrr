/**
 * Action-layer tests for lib/server/actions/strategic-goals.ts (Phase 6,
 * Group F) — the first test coverage for this action file. Create/update
 * were built in Phase 5 but never tested at the action layer; `list` is a
 * brand-new Group F wrapper around the Phase 5 `listStrategicGoals`
 * service. Authorization: create/update require ORG:MANAGE (de facto
 * ORG_ADMIN-only — no other role has the ORG area in the RBAC seed); list
 * requires only org membership, matching the service's own gating.
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
  createStrategicGoalAction,
  updateStrategicGoalAction,
  listStrategicGoalsAction,
} from "@/lib/server/actions/strategic-goals";
import type { StrategicGoalRow } from "@/lib/server/services/strategic-goals";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const GOAL_ID = "99999999-9999-4999-8999-999999999999";

function goalRow(overrides: Partial<StrategicGoalRow> = {}): StrategicGoalRow {
  return {
    id: GOAL_ID,
    organization_id: ORG,
    name: "زيادة معدل الابتكار",
    description: "رفع عدد الأفكار المطبقة سنويًا",
    status: "ACTIVE",
    target_value: 100,
    current_value: 40,
    unit: "فكرة",
    measurement_period_start: null,
    measurement_period_end: null,
    owner_id: null,
    progress_percentage: 40,
    linked_ideas_count: 0,
    linked_projects_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function orgAdminActor(): Actor {
  return {
    userId: "admin-1",
    email: "admin@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "ORG_ADMIN", grants: [] }],
  };
}

function memberActor(): Actor {
  return {
    userId: "member-1",
    email: "member@example.com",
    memberships: [{ membershipId: "m2", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "PROJECT", action: "VIEW" }] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(orgAdminActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createStrategicGoalAction", () => {
  it("creates a strategic goal for an ORG_ADMIN", async () => {
    vi.mocked(transaction).mockResolvedValueOnce([[goalRow()], []]);
    const result = await createStrategicGoalAction({
      organizationId: ORG,
      name: "زيادة معدل الابتكار",
      description: "رفع عدد الأفكار المطبقة سنويًا",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(GOAL_ID);
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createStrategicGoalAction({ organizationId: ORG, name: "n", description: "d" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without ORG:MANAGE", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(memberActor());
    const result = await createStrategicGoalAction({ organizationId: ORG, name: "n", description: "d" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation for a missing name", async () => {
    const result = await createStrategicGoalAction({ organizationId: ORG, description: "d" });
    expect(result.ok).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("updateStrategicGoalAction", () => {
  it("updates a strategic goal for an ORG_ADMIN", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(goalRow());
    vi.mocked(transaction).mockResolvedValueOnce([[goalRow({ status: "ARCHIVED" })], []]);
    const result = await updateStrategicGoalAction({ goalId: GOAL_ID, status: "ARCHIVED" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("ARCHIVED");
  });

  it("returns NOT_FOUND for a strategic goal that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateStrategicGoalAction({ goalId: GOAL_ID, status: "ARCHIVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without ORG:MANAGE on the goal's organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(memberActor());
    vi.mocked(queryOne).mockResolvedValueOnce(goalRow());
    const result = await updateStrategicGoalAction({ goalId: GOAL_ID, status: "ARCHIVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a goal belonging to another organization the actor does not admin", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(goalRow({ organization_id: OTHER_ORG }));
    const result = await updateStrategicGoalAction({ goalId: GOAL_ID, status: "ARCHIVED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("listStrategicGoalsAction", () => {
  it("returns strategic goals for any org member", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(memberActor());
    vi.mocked(query).mockResolvedValueOnce([goalRow()]);
    const result = await listStrategicGoalsAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for an actor who is not a member of the organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(memberActor());
    const result = await listStrategicGoalsAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await listStrategicGoalsAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });
});

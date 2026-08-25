/**
 * Action-layer tests for lib/server/actions/measurements.ts (Phase 6, Group
 * E) — KPI and impact-measurement actions. KPI create/update are gated on
 * KPI:EDIT (no dedicated CREATE action exists in the approved catalog, only
 * VIEW/EDIT — p39-p40); KPI list is gated on KPI:VIEW. Impact measurements
 * use a real dedicated VIEW/CREATE/EDIT set (p41-p43). Both list actions
 * mirror the underlying "subject" service signature exactly
 * (projectId/ideaId/strategicGoalId) rather than a project-only convenience
 * shape, since the same service backs KPIs/impact on ideas too.
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
  createKpiAction,
  updateKpiValueAction,
  createImpactMeasurementAction,
  listKpisForSubjectAction,
  listImpactMeasurementsForSubjectAction,
} from "@/lib/server/actions/measurements";
import type { KpiRow, ImpactMeasurementRow } from "@/lib/server/services/measurements";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const KPI_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function kpiRow(overrides: Partial<KpiRow> = {}): KpiRow {
  return {
    id: KPI_ID,
    project_id: PROJECT_ID,
    idea_id: null,
    strategic_goal_id: null,
    name: "مؤشر",
    unit: "%",
    target_value: 100,
    current_value: 0,
    owner_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function impactRow(overrides: Partial<ImpactMeasurementRow> = {}): ImpactMeasurementRow {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    project_id: PROJECT_ID,
    idea_id: null,
    type: "OPERATIONAL",
    description: "أثر تشغيلي",
    baseline_value: null,
    target_value: null,
    actual_value: null,
    unit: null,
    measured_by: "editor-1",
    measured_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function kpiEditorActor(): Actor {
  return {
    userId: "editor-1",
    email: "editor@example.com",
    memberships: [
      {
        membershipId: "m1",
        organizationId: ORG,
        role: "PROJECT_MANAGER",
        grants: [
          { area: "KPI", action: "VIEW" },
          { area: "KPI", action: "EDIT" },
          { area: "IMPACT", action: "VIEW" },
          { area: "IMPACT", action: "CREATE" },
        ],
      },
    ],
  };
}

function viewOnlyActor(): Actor {
  return {
    userId: "viewer-1",
    email: "viewer@example.com",
    memberships: [
      { membershipId: "m2", organizationId: ORG, role: "EVALUATOR", grants: [{ area: "KPI", action: "VIEW" }, { area: "IMPACT", action: "VIEW" }] },
    ],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(kpiEditorActor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createKpiAction", () => {
  it("creates a project-scoped KPI for an actor with KPI:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[kpiRow()], []]);
    const result = await createKpiAction({ projectId: PROJECT_ID, name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.project_id).toBe(PROJECT_ID);
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await createKpiAction({ projectId: PROJECT_ID, name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an actor without KPI:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await createKpiAction({ projectId: PROJECT_ID, name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: OTHER_ORG });
    const result = await createKpiAction({ projectId: PROJECT_ID, name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a project that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await createKpiAction({ projectId: PROJECT_ID, name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("fails validation when no subject (project/idea/strategic goal) is given", async () => {
    const result = await createKpiAction({ name: "مؤشر", unit: "%", targetValue: 100 });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("updateKpiValueAction", () => {
  it("updates the current value for an actor with KPI:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(kpiRow()).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[kpiRow({ current_value: 40 })], []]);
    const result = await updateKpiValueAction({ kpiId: KPI_ID, currentValue: 40 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.current_value).toBe(40);
  });

  it("returns NOT_FOUND for a KPI that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await updateKpiValueAction({ kpiId: KPI_ID, currentValue: 40 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN for an actor without KPI:EDIT — no mutation applied", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce(kpiRow()).mockResolvedValueOnce({ organization_id: ORG });
    const result = await updateKpiValueAction({ kpiId: KPI_ID, currentValue: 40 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createImpactMeasurementAction", () => {
  it("creates an impact measurement for an actor with IMPACT:CREATE", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(transaction).mockResolvedValueOnce([[impactRow()], []]);
    const result = await createImpactMeasurementAction({ projectId: PROJECT_ID, type: "OPERATIONAL", description: "أثر تشغيلي" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.type).toBe("OPERATIONAL");
  });

  it("returns FORBIDDEN for an actor without IMPACT:CREATE", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    const result = await createImpactMeasurementAction({ projectId: PROJECT_ID, type: "OPERATIONAL", description: "أثر" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("fails validation when neither project nor idea is given", async () => {
    const result = await createImpactMeasurementAction({ type: "OPERATIONAL", description: "أثر" });
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listKpisForSubjectAction", () => {
  it("returns KPIs for a project subject with KPI:VIEW", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([kpiRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listKpisForSubjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: OTHER_ORG });
    const result = await listKpisForSubjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("fails validation when no subject is given", async () => {
    const result = await listKpisForSubjectAction({});
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe("listImpactMeasurementsForSubjectAction", () => {
  it("returns impact measurements for a project subject with IMPACT:VIEW", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: ORG });
    vi.mocked(query).mockResolvedValueOnce([impactRow()]);
    vi.mocked(getCurrentActor).mockResolvedValue(viewOnlyActor());
    const result = await listImpactMeasurementsForSubjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns FORBIDDEN for a project in another organization", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce({ organization_id: OTHER_ORG });
    const result = await listImpactMeasurementsForSubjectAction({ projectId: PROJECT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("fails validation when neither project nor idea is given", async () => {
    const result = await listImpactMeasurementsForSubjectAction({});
    expect(result.ok).toBe(false);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

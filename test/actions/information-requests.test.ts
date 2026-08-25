/**
 * Action-layer tests for lib/server/actions/information-requests.ts
 * (Phase 6, Group B). See test/actions/ideas.test.ts for the pattern
 * rationale.
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
  createInformationRequestAction,
  respondToInformationRequestAction,
  listInformationRequestsAction,
  listInformationRequestsForOrganizationAction,
} from "@/lib/server/actions/information-requests";
import type { IdeaRow } from "@/lib/server/services/ideas";
import type { InformationRequestRow } from "@/lib/server/services/information-requests";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "55555555-5555-4555-8555-555555555555";
const SUBMITTER_ID = "44444444-4444-4444-8444-444444444444";

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
    status: "UNDER_REVIEW",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function requestRow(overrides: Partial<InformationRequestRow> = {}): InformationRequestRow {
  return {
    id: REQUEST_ID,
    idea_id: IDEA_ID,
    requested_by: "specialist-1",
    request_text: "يرجى تزويدنا بعينة من البيانات.",
    status: "OPEN",
    response_text: null,
    responded_by: null,
    requested_at: "2026-01-02T00:00:00Z",
    responded_at: null,
    ...overrides,
  };
}

function specialistActor(): Actor {
  return {
    userId: "specialist-1",
    email: "specialist@example.com",
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [{ area: "IDEA", action: "EDIT" }] }],
  };
}

function submitterActor(): Actor {
  return {
    userId: SUBMITTER_ID,
    email: "submitter@example.com",
    memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("createInformationRequestAction", () => {
  it("creates a request and moves the idea to NEEDS_INFORMATION when a specialist has IDEA:EDIT", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_REVIEW" }));
    vi.mocked(transaction).mockResolvedValueOnce([[requestRow()], [], [], []]);
    const result = await createInformationRequestAction({ ideaId: IDEA_ID, requestText: "يرجى تزويدنا بعينة من البيانات." });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("OPEN");
  });

  it("returns FORBIDDEN for an actor without IDEA:EDIT in the idea's organization", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(submitterActor());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_REVIEW" }));
    const result = await createInformationRequestAction({ ideaId: IDEA_ID, requestText: "..." });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns INVALID_TRANSITION when the idea's current status cannot move to NEEDS_INFORMATION", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "APPROVED" }));
    const result = await createInformationRequestAction({ ideaId: IDEA_ID, requestText: "..." });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });
});

describe("respondToInformationRequestAction", () => {
  it("lets the idea's own submitter respond, moving the idea to RETURNED_FOR_REVIEW", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(submitterActor());
    vi.mocked(queryOne)
      .mockResolvedValueOnce(requestRow({ status: "OPEN" }))
      .mockResolvedValueOnce(ideaRow({ status: "NEEDS_INFORMATION" }));
    vi.mocked(transaction).mockResolvedValueOnce([[requestRow({ status: "RESPONDED", response_text: "تم الإرفاق." })], [], [], []]);
    const result = await respondToInformationRequestAction({ requestId: REQUEST_ID, responseText: "تم الإرفاق." });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("RESPONDED");
  });

  it("returns FORBIDDEN when a specialist (not the submitter) tries to respond on the innovator's behalf", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(queryOne)
      .mockResolvedValueOnce(requestRow({ status: "OPEN" }))
      .mockResolvedValueOnce(ideaRow({ status: "NEEDS_INFORMATION" }));
    const result = await respondToInformationRequestAction({ requestId: REQUEST_ID, responseText: "..." });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("listInformationRequestsAction", () => {
  it("returns the idea's information requests for an org member", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    vi.mocked(query).mockResolvedValueOnce([requestRow()]);
    const result = await listInformationRequestsAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([requestRow()]);
  });

  it("returns NOT_FOUND for a nonexistent idea", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await listInformationRequestsAction({ ideaId: IDEA_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

/**
 * Final QA audit fix (Critical Issue 3) — backs the rewritten standalone
 * Org Admin page (app/org/information-requests/page.tsx). Verifies the
 * new org-wide read action: real persisted data flows through, and
 * unauthorized / cross-org access is rejected server-side (not just
 * hidden in the UI).
 */
describe("listInformationRequestsForOrganizationAction", () => {
  it("returns every real, persisted information request across the organization for an org member", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(specialistActor());
    vi.mocked(query).mockResolvedValueOnce([
      requestRow(),
      requestRow({ id: "66666666-6666-4666-8666-666666666666", status: "RESPONDED", response_text: "تم الإرفاق." }),
    ]);
    const result = await listInformationRequestsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[1].response_text).toBe("تم الإرفاق.");
    }
  });

  it("returns FORBIDDEN for an actor with no membership in the requested organization (unauthorized access rejected)", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({
      userId: "outsider-1",
      email: "outsider@example.com",
      memberships: [],
    });
    const result = await listInformationRequestsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns FORBIDDEN for an actor whose membership is in a DIFFERENT organization (cross-org access rejected)", async () => {
    const OTHER_ORG = "77777777-7777-4777-8777-777777777777";
    vi.mocked(getCurrentActor).mockResolvedValue({
      userId: "specialist-2",
      email: "specialist2@example.com",
      memberships: [{ membershipId: "m3", organizationId: OTHER_ORG, role: "INNOVATION_SPECIALIST", grants: [] }],
    });
    const result = await listInformationRequestsForOrganizationAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });
});

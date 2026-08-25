import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query, queryOne, transaction } from "@/lib/server/db";
import {
  createInformationRequest,
  respondToInformationRequest,
  listInformationRequestsForIdea,
  listInformationRequestsForOrganization,
  type InformationRequestRow,
} from "@/lib/server/services/information-requests";
import { ForbiddenError, InvalidTransitionError, ConflictError, NotFoundError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { IdeaRow } from "@/lib/server/services/ideas";

const ORG = "org-1";

function ideaRow(overrides: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: "idea-1",
    organization_id: ORG,
    title: "t",
    description: "d",
    problem_statement: "p",
    proposed_solution: "s",
    expected_impact: "i",
    category_id: "cat-1",
    challenge_id: null,
    opportunity_id: null,
    submitter_id: "submitter-1",
    submitter_type: "INTERNAL",
    status: "UNDER_REVIEW",
    project_id: null,
    withdrawal_reason: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function requestRow(overrides: Partial<InformationRequestRow> = {}): InformationRequestRow {
  return {
    id: "req-1",
    idea_id: "idea-1",
    requested_by: "specialist-1",
    request_text: "please clarify",
    status: "OPEN",
    response_text: null,
    responded_by: null,
    requested_at: "2026-01-01T00:00:00Z",
    responded_at: null,
    ...overrides,
  };
}

function specialist(): Actor {
  return { userId: "specialist-1", email: "s@x.com", memberships: [{ membershipId: "m1", organizationId: ORG, role: "INNOVATION_SPECIALIST", grants: [{ area: "IDEA", action: "EDIT" }] }] };
}

function submitter(): Actor {
  return { userId: "submitter-1", email: "sub@x.com", memberships: [{ membershipId: "m2", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
}

beforeEach(() => {
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(transaction).mockReset();
});

describe("createInformationRequest", () => {
  it("throws ForbiddenError without IDEA:EDIT", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    const noPerm: Actor = { userId: "u2", email: "u2@x.com", memberships: [{ membershipId: "m3", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
    await expect(createInformationRequest(noPerm, "idea-1", "text")).rejects.toBeInstanceOf(ForbiddenError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("throws InvalidTransitionError when the idea's status can't legally reach NEEDS_INFORMATION", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "DRAFT" }));
    await expect(createInformationRequest(specialist(), "idea-1", "text")).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("creates the request and transitions the idea to NEEDS_INFORMATION atomically", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow({ status: "UNDER_REVIEW" }));
    vi.mocked(transaction).mockResolvedValueOnce([[requestRow()], [], [], []]);
    const result = await createInformationRequest(specialist(), "idea-1", "please clarify");
    expect(result.status).toBe("OPEN");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements.some((s) => s.sql.includes("NEEDS_INFORMATION"))).toBe(true);
    expect(statements.some((s) => s.sql.includes("audit_logs"))).toBe(true);
  });
});

describe("respondToInformationRequest", () => {
  it("throws NotFoundError for a missing request", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await expect(respondToInformationRequest(submitter(), "missing", "text")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when the caller is not the idea's submitter", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(requestRow())
      .mockResolvedValueOnce(ideaRow({ status: "NEEDS_INFORMATION", submitter_id: "someone-else" }));
    await expect(respondToInformationRequest(submitter(), "req-1", "text")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws ConflictError when the request is already RESPONDED", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(requestRow({ status: "RESPONDED" }))
      .mockResolvedValueOnce(ideaRow({ status: "NEEDS_INFORMATION" }));
    await expect(respondToInformationRequest(submitter(), "req-1", "text")).rejects.toBeInstanceOf(ConflictError);
  });

  it("responds and moves the idea to RETURNED_FOR_REVIEW (not UNDER_REVIEW)", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce(requestRow())
      .mockResolvedValueOnce(ideaRow({ status: "NEEDS_INFORMATION" }));
    vi.mocked(transaction).mockResolvedValueOnce([[requestRow({ status: "RESPONDED" })], [], [], []]);
    const result = await respondToInformationRequest(submitter(), "req-1", "here is the info");
    expect(result.status).toBe("RESPONDED");
    const statements = vi.mocked(transaction).mock.calls[0][0] as { sql: string }[];
    expect(statements.some((s) => s.sql.includes("RETURNED_FOR_REVIEW"))).toBe(true);
    expect(statements.some((s) => s.sql.includes("UNDER_REVIEW"))).toBe(false);
  });
});

describe("listInformationRequestsForIdea", () => {
  it("throws ForbiddenError for a non-member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    const outsider: Actor = { userId: "u9", email: "u9@x.com", memberships: [] };
    await expect(listInformationRequestsForIdea(outsider, "idea-1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lists requests for an org member", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(ideaRow());
    vi.mocked(query).mockResolvedValueOnce([requestRow()]);
    const result = await listInformationRequestsForIdea(specialist(), "idea-1");
    expect(result).toHaveLength(1);
  });
});

/**
 * Final QA audit fix (Critical Issue 3) — org-wide read backing the
 * standalone Org Admin page (app/org/information-requests/page.tsx),
 * which previously called the pure-mock `d.respondToInformationRequest`
 * with no persistence at all. This is the new real data source for that
 * page; the response flow itself (persist / correct-request-updated /
 * ownership) is already covered above by `respondToInformationRequest`'s
 * own tests, unchanged by this fix.
 */
describe("listInformationRequestsForOrganization", () => {
  it("throws ForbiddenError for a non-member (unauthorized access rejected)", async () => {
    const outsider: Actor = { userId: "u9", email: "u9@x.com", memberships: [] };
    await expect(listInformationRequestsForOrganization(outsider, ORG)).rejects.toBeInstanceOf(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError for a member of a DIFFERENT organization (cross-org access rejected)", async () => {
    const otherOrgMember: Actor = {
      userId: "u10",
      email: "u10@x.com",
      memberships: [{ membershipId: "m9", organizationId: "org-2", role: "INNOVATION_SPECIALIST", grants: [] }],
    };
    await expect(listInformationRequestsForOrganization(otherOrgMember, ORG)).rejects.toBeInstanceOf(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it("scopes the query to the target organization via a join to ideas, and returns the real (persisted) rows", async () => {
    vi.mocked(query).mockResolvedValueOnce([requestRow(), requestRow({ id: "req-2", status: "RESPONDED", response_text: "here" })]);
    const result = await listInformationRequestsForOrganization(specialist(), ORG);
    expect(result).toHaveLength(2);
    expect(result[1].response_text).toBe("here");
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("JOIN ideas");
    expect(sql).toContain("i.organization_id = $1");
    expect(params).toEqual([ORG]);
  });
});

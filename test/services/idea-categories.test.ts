import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query } from "@/lib/server/db";
import { listCategoriesForOrganization } from "@/lib/server/services/idea-categories";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "org-1";
const OTHER_ORG = "org-2";

function member(): Actor {
  return { userId: "u1", email: "u1@x.com", memberships: [{ membershipId: "m1", organizationId: ORG, role: "INTERNAL_INNOVATOR", grants: [] }] };
}

beforeEach(() => {
  vi.mocked(query).mockReset();
});

describe("listCategoriesForOrganization", () => {
  it("throws ForbiddenError for a non-member organization, without querying", async () => {
    await expect(listCategoriesForOrganization(member(), OTHER_ORG)).rejects.toBeInstanceOf(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it("defaults to ACTIVE-only categories", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listCategoriesForOrganization(member(), ORG);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("status = 'ACTIVE'");
  });

  it("includes inactive/archived categories when activeOnly is false", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listCategoriesForOrganization(member(), ORG, { activeOnly: false });
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("status = 'ACTIVE'");
  });
});

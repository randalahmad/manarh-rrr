import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query } from "@/lib/server/db";
import { listActiveOrganizations } from "@/lib/server/services/organizations";
import type { Actor } from "@/lib/server/rbac/permissions";

// An actor with zero memberships (e.g. an external innovator who hasn't
// registered with any organization yet) — the whole point of this service
// is that it must still work for them.
const noMemberships: Actor = { userId: "u1", email: "u1@x.com", memberships: [] };

beforeEach(() => {
  vi.mocked(query).mockReset();
});

describe("listActiveOrganizations", () => {
  it("returns organizations for an actor with no organization memberships at all", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: "org-1", name: "Org One", name_en: null, logo_url: null, sector: "gov" }]);
    const result = await listActiveOrganizations(noMemberships);
    expect(result).toHaveLength(1);
  });

  it("only selects display-safe columns — never contact_email/contact_phone", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listActiveOrganizations(noMemberships);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("contact_email");
    expect(sql).not.toContain("contact_phone");
    expect(sql).toContain("status = 'ACTIVE'");
  });
});

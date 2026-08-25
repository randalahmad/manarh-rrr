import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));

import { query } from "@/lib/server/db";
import { listPlatformAuditLogs } from "@/lib/server/services/platform-audit";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";

const platformAdmin: Actor = { userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true };
const noAuthority: Actor = { userId: "u1", email: "u1@example.com", memberships: [] };

beforeEach(() => {
  vi.mocked(query).mockReset();
});

describe("listPlatformAuditLogs", () => {
  it("throws ForbiddenError for a non-platform-admin, never querying the database", async () => {
    await expect(listPlatformAuditLogs(noAuthority)).rejects.toThrow(ForbiddenError);
    expect(query).not.toHaveBeenCalled();
  });

  it("filters to PLATFORM:-tagged rows only — never an organization's own IDEA/PROJECT/EVALUATION audit trail", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listPlatformAuditLogs(platformAdmin);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("PLATFORM:%");
  });

  it("never selects decision_details, sensitive_view, or attachment_ids — confidential entity-action columns", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listPlatformAuditLogs(platformAdmin);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toContain("decision_details");
    expect(sql).not.toContain("sensitive_view");
    expect(sql).not.toContain("attachment_ids");
  });

  it("clamps an out-of-range limit into [1, 500]", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listPlatformAuditLogs(platformAdmin, 10000);
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual([500]);
  });

  it("defaults to a limit of 100 when none is given", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await listPlatformAuditLogs(platformAdmin);
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual([100]);
  });
});

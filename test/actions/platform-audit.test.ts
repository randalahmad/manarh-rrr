import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({ getCurrentActor: vi.fn(), getCurrentUserProfile: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));

import { getCurrentActor, getCurrentUserProfile } from "@/lib/server/auth/session";
import { query } from "@/lib/server/db";
import { listPlatformAuditLogsAction } from "@/lib/server/actions/platform-audit";

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset().mockResolvedValue({ status: "ACTIVE" });
  vi.mocked(query).mockReset();
});

describe("listPlatformAuditLogsAction", () => {
  it("returns UNAUTHENTICATED with no session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await listPlatformAuditLogsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for a non-platform-admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    const result = await listPlatformAuditLogsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns the platform audit feed for a platform admin", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true });
    vi.mocked(query).mockResolvedValueOnce([]);
    const result = await listPlatformAuditLogsAction();
    expect(result.ok).toBe(true);
  });

  it("rejects an out-of-range limit before checking the session", async () => {
    const result = await listPlatformAuditLogsAction({ limit: 0 });
    expect(result.ok).toBe(false);
    expect(getCurrentActor).not.toHaveBeenCalled();
  });
});

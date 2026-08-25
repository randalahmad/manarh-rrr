import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/auth/session", () => ({
  getCurrentActor: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  getCurrentSessionIdentity: vi.fn(),
}));

import { getCurrentActor, getCurrentUserProfile, getCurrentSessionIdentity } from "@/lib/server/auth/session";
import { getPlatformAdminProfileAction } from "@/lib/server/actions/platform-admin";

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset().mockResolvedValue({ status: "ACTIVE" });
  vi.mocked(getCurrentSessionIdentity).mockReset();
});

describe("getPlatformAdminProfileAction", () => {
  it("returns UNAUTHENTICATED with no session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await getPlatformAdminProfileAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN for an authenticated non-platform-admin, without reading their session identity", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "u1", email: "u1@example.com", memberships: [] });
    const result = await getPlatformAdminProfileAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(getCurrentSessionIdentity).not.toHaveBeenCalled();
  });

  it("returns the platform admin's own identity", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ userId: "pa1", email: "pa1@example.com", memberships: [], isPlatformAdmin: true });
    vi.mocked(getCurrentSessionIdentity).mockResolvedValue({
      userId: "pa1",
      email: "pa1@example.com",
      name: "Platform Admin",
      image: null,
    });
    const result = await getPlatformAdminProfileAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ id: "pa1", email: "pa1@example.com", name: "Platform Admin", avatarUrl: null });
    }
  });
});

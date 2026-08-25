/**
 * Action-layer tests for lib/server/actions/notifications.ts (Phase 6,
 * Group F) — the first test coverage for this action file.
 * `markNotificationReadAction` was built in Phase 5 but never tested;
 * `listMyNotificationsAction` and `markAllNotificationsReadAction` are new
 * Group F wrappers/capability. All three are scoped to the authenticated
 * actor's own `recipient_id` — a notification belonging to another user
 * must never be readable or mutable by this actor.
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
import { query, queryOne } from "@/lib/server/db";
import {
  markNotificationReadAction,
  listMyNotificationsAction,
  markAllNotificationsReadAction,
} from "@/lib/server/actions/notifications";
import type { NotificationRow } from "@/lib/server/services/notifications";
import type { Actor } from "@/lib/server/rbac/permissions";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const NOTIF_ID = "88888888-8888-4888-8888-888888888888";

function notificationRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: NOTIF_ID,
    organization_id: ORG,
    recipient_id: "user-1",
    title: "تم تعيينك كمقيّم",
    message: "تم تعيينك لتقييم فكرة جديدة",
    entity_type: "EVALUATION",
    entity_id: "eval-1",
    is_read: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function actor(userId = "user-1"): Actor {
  return {
    userId,
    email: `${userId}@example.com`,
    memberships: [{ membershipId: "m1", organizationId: ORG, role: "PROJECT_MANAGER", grants: [{ area: "PROJECT", action: "VIEW" }] }],
  };
}

beforeEach(() => {
  vi.mocked(getCurrentActor).mockReset();
  vi.mocked(getCurrentUserProfile).mockReset();
  vi.mocked(query).mockReset();
  vi.mocked(queryOne).mockReset();
  vi.mocked(getCurrentActor).mockResolvedValue(actor());
  vi.mocked(getCurrentUserProfile).mockResolvedValue({ status: "ACTIVE" });
});

describe("markNotificationReadAction", () => {
  it("marks the actor's own notification as read", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(notificationRow()).mockResolvedValueOnce(notificationRow({ is_read: true }));
    const result = await markNotificationReadAction({ notificationId: NOTIF_ID });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.is_read).toBe(true);
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await markNotificationReadAction({ notificationId: NOTIF_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });

  it("returns FORBIDDEN when marking another user's notification as read", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(notificationRow({ recipient_id: "someone-else" }));
    const result = await markNotificationReadAction({ notificationId: NOTIF_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND for a notification that does not exist", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await markNotificationReadAction({ notificationId: NOTIF_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("listMyNotificationsAction", () => {
  it("returns the actor's own notifications for an organization they belong to", async () => {
    vi.mocked(query).mockResolvedValueOnce([notificationRow()]);
    const result = await listMyNotificationsAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("filters to unread only when onlyUnread is true", async () => {
    vi.mocked(query).mockResolvedValueOnce([notificationRow({ is_read: false })]);
    const result = await listMyNotificationsAction({ organizationId: ORG, onlyUnread: true });
    expect(result.ok).toBe(true);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("is_read = false");
  });

  it("returns FORBIDDEN for an actor who is not a member of the organization", async () => {
    const result = await listMyNotificationsAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await listMyNotificationsAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });
});

describe("markAllNotificationsReadAction", () => {
  it("marks all of the actor's own unread notifications as read and returns the count", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: "n1" }, { id: "n2" }]);
    const result = await markAllNotificationsReadAction({ organizationId: ORG });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.updatedCount).toBe(2);
  });

  it("scopes the UPDATE to the actor's own recipient_id, never another user's", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    await markAllNotificationsReadAction({ organizationId: ORG });
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("recipient_id = $2");
    expect(params).toEqual([ORG, "user-1"]);
  });

  it("returns FORBIDDEN for an actor who is not a member of the organization", async () => {
    const result = await markAllNotificationsReadAction({ organizationId: OTHER_ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED with no active session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue(null);
    const result = await markAllNotificationsReadAction({ organizationId: ORG });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNAUTHENTICATED");
  });
});

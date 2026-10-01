/**
 * Client-side data layer for the Org Admin Notifications page
 * (`app/org/notifications/page.tsx`) and the shared `NotificationBell`
 * (`components/layout/notification-panel.tsx`, rendered by both the Org
 * Admin and Innovation Specialist layouts via `AppShell`) — Phase 6,
 * Group F.
 *
 * Mirrors `lib/client/org-projects.ts`'s pattern: a narrow, additive data
 * source backed by real Server Actions.
 */
import type { Notification } from "@/lib/types";
import {
  listMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/mock-server/actions/notifications";
import type { NotificationRow } from "@/lib/server/services/notifications";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function fetchMyNotifications(organizationId: string): Promise<Notification[]> {
  const rows = unwrap(await listMyNotificationsAction({ organizationId }));
  return rows.map(mapNotificationRow);
}

export async function markMyNotificationRead(notificationId: string): Promise<Notification> {
  return mapNotificationRow(unwrap(await markNotificationReadAction({ notificationId })));
}

export async function markAllMyNotificationsRead(organizationId: string): Promise<number> {
  const { updatedCount } = unwrap(await markAllNotificationsReadAction({ organizationId }));
  return updatedCount;
}

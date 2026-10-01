import type { Notification } from '../types';
import { listMyOrganizationsAction } from '@/lib/mock-server/actions/organizations';
import {
  listMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/mock-server/actions/notifications';
import type { NotificationRow } from '@/lib/server/services/notifications';
import type { ActionResult } from '@/lib/server/errors';

export interface NotificationService {
  list(): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(): Promise<void>;
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

async function getCurrentOrganizationId(): Promise<string> {
  const orgs = unwrap(await listMyOrganizationsAction());
  const org = orgs[0];
  if (!org) throw new Error('No active organization membership.');
  return org.id;
}

/**
 * This interface's local `Notification.relatedEntityType` only models 2 of
 * the real `entity_type`'s 10 values (`idea` | `project`) — a pre-existing
 * type, not something Group F introduced. The other 8 real entity types
 * (CHALLENGE, OPPORTUNITY, EVALUATION, TASK, IMPACT, DECISION, USER,
 * ORGANIZATION) collapse to `undefined`, which
 * `notificationNavigationService` already handles safely (falls back to a
 * non-navigable notification, same as `NotificationItem`'s `general` icon
 * fallback) — no new field/status invented, just a narrower presentation
 * mapping of the real, unaltered `entity_type`.
 */
function toRelatedEntityType(entityType: NotificationRow['entity_type']): Notification['relatedEntityType'] {
  if (entityType === 'IDEA') return 'idea';
  if (entityType === 'PROJECT') return 'project';
  return undefined;
}

function mapNotificationRow(row: NotificationRow): Notification {
  const relatedEntityType = toRelatedEntityType(row.entity_type);
  return {
    id: row.id,
    userId: row.recipient_id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    relatedEntityType,
    relatedEntityId: relatedEntityType ? row.entity_id : undefined,
  };
}

/**
 * `NeonNotificationService` (Phase 6, Group F) — the real implementation,
 * mirroring `NeonProjectService`/`NeonIdeaService`'s pattern. Replaces
 * `MockNotificationService` for every method — no consuming
 * hook/component/page changes (`notificationFeedService`,
 * `useNotificationFeed`, `NotificationsPage`, `NotificationItem` all stay
 * as-is).
 */
class NeonNotificationService implements NotificationService {
  async list(): Promise<Notification[]> {
    const organizationId = await getCurrentOrganizationId();
    const rows = unwrap(await listMyNotificationsAction({ organizationId }));
    return rows.map(mapNotificationRow);
  }

  async markAsRead(id: string): Promise<Notification> {
    return mapNotificationRow(unwrap(await markNotificationReadAction({ notificationId: id })));
  }

  async markAllAsRead(): Promise<void> {
    const organizationId = await getCurrentOrganizationId();
    unwrap(await markAllNotificationsReadAction({ organizationId }));
  }
}

export const notificationService: NotificationService = new NeonNotificationService();

import type { Notification } from '../types';
import type { ActionModel } from '@innovator/types/actions';

/**
 * notificationNavigationService abstraction.
 *
 * The single place that knows how a notification's `relatedEntityType` /
 * `relatedEntityId` translate into a navigable route. Callers (NotificationItem,
 * dashboardService's activity feed) only ever ask for an `ActionModel` — they
 * never construct `/innovator/ideas/${id}` or `/innovator/projects/${id}`
 * themselves. If the routing scheme changes, or a new related-entity type is
 * introduced, only this file changes.
 */
export interface NotificationNavigationService {
  getNavigationAction(notification: Notification): ActionModel | undefined;
}

class DefaultNotificationNavigationService implements NotificationNavigationService {
  getNavigationAction(notification: Notification): ActionModel | undefined {
    if (notification.relatedEntityType === 'idea' && notification.relatedEntityId) {
      return { enabled: true, label: 'عرض الفكرة', route: `/innovator/ideas/${notification.relatedEntityId}` };
    }
    if (notification.relatedEntityType === 'project' && notification.relatedEntityId) {
      return { enabled: true, label: 'عرض المشروع', route: `/innovator/projects/${notification.relatedEntityId}` };
    }
    return undefined;
  }
}

export const notificationNavigationService: NotificationNavigationService = new DefaultNotificationNavigationService();

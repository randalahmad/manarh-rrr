import { notificationService } from './notificationService';
import { mapNotificationToViewModel, type NotificationViewModel } from '../viewModels';

/**
 * notificationFeedService abstraction.
 *
 * NotificationsPage calls only this — never `notificationService` directly,
 * and never `mapNotificationToViewModel` itself. This is the aggregation
 * layer that turns "load my notifications" into an already-mapped,
 * ready-to-render feed, plus the actions (mark as read / mark all as read)
 * and the unread count derived from it — mirroring `ideaDetailsService` /
 * `projectDetailsService`'s role for their respective pages.
 */
export interface NotificationFeedService {
  getFeed(): Promise<NotificationViewModel[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  /** Pure derivation over an already-loaded feed — not a separate fetch, since the full list is already in hand once `getFeed()` resolves. */
  getUnreadCount(items: NotificationViewModel[]): number;
}

class DefaultNotificationFeedService implements NotificationFeedService {
  async getFeed(): Promise<NotificationViewModel[]> {
    const notifications = await notificationService.list();
    return notifications.map(mapNotificationToViewModel);
  }

  async markAsRead(id: string): Promise<void> {
    await notificationService.markAsRead(id);
  }

  async markAllAsRead(): Promise<void> {
    await notificationService.markAllAsRead();
  }

  getUnreadCount(items: NotificationViewModel[]): number {
    return items.filter((item) => !item.isRead).length;
  }
}

export const notificationFeedService: NotificationFeedService = new DefaultNotificationFeedService();

import type { Notification } from './types';
import type { ActionModel } from '@innovator/types/actions';
import type { TimelineEventSeverity } from '@innovator/types/timeline';
import { notificationNavigationService } from './services/notificationNavigationService';
import { formatRelativeTime } from '@innovator/utils/formatRelativeTime';

export interface NotificationViewModel {
  id: string;
  title: string;
  message: string;
  relativeTime: string;
  /** String key, not a component reference — resolved to an actual icon inside NotificationItem. */
  icon: string;
  severity: TimelineEventSeverity;
  /** Needed for the unread indicator and to gate the mark-as-read behavior — not itself a "presentation" field but required for the component to function. */
  isRead: boolean;
  action?: ActionModel;
}

function toIcon(type?: Notification['relatedEntityType']): string {
  if (type === 'idea') return 'idea';
  if (type === 'project') return 'project';
  return 'general';
}

/**
 * ASSUMPTION: notifications have no confirmed "severity" concept from the
 * backend yet (only title/message/read-state). Defaulting every
 * notification to 'info' until a real category (success/warning/danger)
 * is confirmed — safer than inventing keyword-based inference that could
 * misclassify a message.
 */
function toSeverity(): TimelineEventSeverity {
  return 'info';
}

export function mapNotificationToViewModel(notification: Notification): NotificationViewModel {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    relativeTime: formatRelativeTime(notification.createdAt),
    icon: toIcon(notification.relatedEntityType),
    severity: toSeverity(),
    isRead: notification.isRead,
    action: notificationNavigationService.getNavigationAction(notification),
  };
}

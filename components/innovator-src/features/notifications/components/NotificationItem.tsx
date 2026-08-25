import { Link } from '@innovator/_compat/react-router-shim';
import type { LucideIcon } from 'lucide-react';
import { Lightbulb, FolderKanban, Bell } from 'lucide-react';
import type { NotificationViewModel } from '../viewModels';
import { cn } from '@innovator/utils/cn';

export interface NotificationItemProps {
  notification: NotificationViewModel;
  onMarkAsRead?: (id: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  idea: Lightbulb,
  project: FolderKanban,
  general: Bell,
};

const SEVERITY_BG_CLASS: Record<NotificationViewModel['severity'], string> = {
  info: 'bg-inv-status-info-bg text-inv-status-info-fg',
  success: 'bg-inv-status-success-bg text-inv-status-success-fg',
  warning: 'bg-inv-status-warning-bg text-inv-status-warning-fg',
  danger: 'bg-inv-status-danger-bg text-inv-status-danger-fg',
};

/**
 * Presentation-only: renders a `NotificationViewModel`. Never builds a
 * route itself — `notification.action` (an `ActionModel` already resolved
 * by `notificationNavigationService`, via the view-model mapper) is the
 * only thing that decides whether this renders as a `<Link>` or a plain
 * button, and where it points.
 */
export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = ICON_MAP[notification.icon] ?? Bell;

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-inv-card border px-4 py-3 transition-colors',
        notification.isRead ? 'border-inv-ink-100 bg-inv-surface' : 'border-inv-brand-100 bg-inv-brand-50',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          notification.isRead ? 'bg-inv-ink-50 text-inv-ink-500' : SEVERITY_BG_CLASS[notification.severity],
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', notification.isRead ? 'text-inv-ink-700' : 'font-medium text-inv-ink-900')}>
            {notification.title}
          </p>
          {!notification.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-inv-beacon-500" aria-hidden="true" />}
        </div>
        <p className="mt-0.5 text-sm text-inv-ink-500">{notification.message}</p>
        <p className="mt-1 text-xs text-inv-ink-300">{notification.relativeTime}</p>
      </div>
    </div>
  );

  const handleClick = () => {
    if (!notification.isRead) onMarkAsRead?.(notification.id);
  };

  if (notification.action?.enabled && notification.action.route) {
    return (
      <Link
        to={notification.action.route}
        onClick={handleClick}
        className="block rounded-inv-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full text-start rounded-inv-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700">
      {content}
    </button>
  );
}

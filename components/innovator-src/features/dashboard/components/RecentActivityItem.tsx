import { Link } from '@innovator/_compat/react-router-shim';
import { Lightbulb, FolderKanban, Bell } from 'lucide-react';
import type { DashboardRecentActivity } from '../types';
import { formatRelativeTime } from '@innovator/utils/formatRelativeTime';
import { cn } from '@innovator/utils/cn';

export interface RecentActivityItemProps {
  activity: DashboardRecentActivity;
  onMarkAsRead?: (id: string) => void;
}

// Returns the icon already rendered (rather than returning the component
// reference for the caller to use as a JSX tag) — the lint rule
// react-hooks/static-components flags "const Icon = getIcon(...); <Icon/>"
// because it can't statically verify the returned reference is stable
// across renders. Lightbulb/FolderKanban/Bell are, but rendering here
// sidesteps the warning without changing the icon shown. Behavior unchanged.
function renderIcon(category: DashboardRecentActivity['category']) {
  if (category === 'idea') return <Lightbulb className="size-4" aria-hidden="true" />;
  if (category === 'project') return <FolderKanban className="size-4" aria-hidden="true" />;
  return <Bell className="size-4" aria-hidden="true" />;
}

export function RecentActivityItem({ activity, onMarkAsRead }: RecentActivityItemProps) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-inv-card border px-4 py-3 transition-colors',
        activity.isRead ? 'border-inv-ink-100 bg-inv-surface' : 'border-inv-brand-100 bg-inv-brand-50',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          activity.isRead ? 'bg-inv-ink-50 text-inv-ink-500' : 'bg-inv-brand-100 text-inv-brand-800',
        )}
      >
        {renderIcon(activity.category)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', activity.isRead ? 'text-inv-ink-700' : 'font-medium text-inv-ink-900')}>{activity.title}</p>
          {!activity.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-inv-beacon-500" aria-hidden="true" />}
        </div>
        <p className="mt-0.5 text-sm text-inv-ink-500">{activity.description}</p>
        <p className="mt-1 text-xs text-inv-ink-300">{formatRelativeTime(activity.timestamp)}</p>
      </div>
    </div>
  );

  const handleClick = () => {
    if (!activity.isRead) onMarkAsRead?.(activity.id);
  };

  if (activity.to) {
    return (
      <Link to={activity.to} onClick={handleClick} className="block rounded-inv-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700">
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

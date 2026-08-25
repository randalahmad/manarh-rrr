import type { DashboardRecentActivity } from '../types';
import { RecentActivityItem } from './RecentActivityItem';

export interface RecentActivityListProps {
  activities: DashboardRecentActivity[];
  onMarkAsRead?: (id: string) => void;
}

export function RecentActivityList({ activities, onMarkAsRead }: RecentActivityListProps) {
  return (
    <div className="flex flex-col gap-2">
      {activities.map((activity) => (
        <RecentActivityItem key={activity.id} activity={activity} onMarkAsRead={onMarkAsRead} />
      ))}
    </div>
  );
}

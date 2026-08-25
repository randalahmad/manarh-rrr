import { BellOff, CheckCheck } from 'lucide-react';
import { useNotificationFeed } from '@innovator/features/notifications/hooks/useNotificationFeed';
import { NotificationItem } from '@innovator/features/notifications/components/NotificationItem';
import { PageHeader } from '@innovator/components/shared/PageHeader';
import { EmptyState } from '@innovator/components/shared/EmptyState';
import { SkeletonBlock } from '@innovator/components/shared/LoadingState';
import { ErrorState } from '@innovator/components/shared/ErrorState';
import { Button } from '@innovator/components/ui/Button';

export function NotificationsPage() {
  const feed = useNotificationFeed();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الإشعارات"
        description="كل التحديثات المتعلقة بأفكارك ومشاريعك."
        actions={
          feed.unreadCount > 0 ? (
            <Button
              variant="outline"
              size="md"
              onClick={feed.markAllAsRead}
              isLoading={feed.isMarkingAllAsRead}
              disabled={feed.isMarkingAllAsRead}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              تعليم الكل كمقروء
            </Button>
          ) : undefined
        }
      />

      {feed.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span role="status" className="sr-only">
            جاري تحميل الإشعارات...
          </span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-inv-card border border-inv-ink-100 bg-inv-surface p-4">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : feed.isError ? (
        <ErrorState onRetry={() => feed.refetch()} />
      ) : feed.items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="لا توجد إشعارات"
          description="ستظهر هنا آخر التحديثات المتعلقة بأفكارك ومشاريعك."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {feed.items.map((item) => (
            <NotificationItem key={item.id} notification={item} onMarkAsRead={feed.markAsRead} />
          ))}
        </div>
      )}
    </div>
  );
}

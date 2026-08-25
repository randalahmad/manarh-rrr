import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationFeedService } from '../services/notificationFeedService';
import { queryKeys } from '@innovator/constants/queryKeys';

/**
 * The only hook NotificationsPage needs. Composes exactly one service
 * (`notificationFeedService`) — no direct `notificationService` calls, no
 * separate view-model mapping, no ad hoc mutation hooks assembled in the
 * page itself.
 */
export function useNotificationFeed() {
  const queryClient = useQueryClient();

  const feedQuery = useQuery({
    queryKey: queryKeys.notifications.feed(),
    queryFn: () => notificationFeedService.getFeed(),
  });

  const invalidateFeed = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.feed() });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationFeedService.markAsRead(id),
    onSuccess: invalidateFeed,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationFeedService.markAllAsRead(),
    onSuccess: invalidateFeed,
  });

  const items = feedQuery.data ?? [];

  return {
    items,
    isLoading: feedQuery.isLoading,
    isError: feedQuery.isError,
    refetch: feedQuery.refetch,
    unreadCount: notificationFeedService.getUnreadCount(items),
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    isMarkingAsRead: markAsReadMutation.isPending,
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

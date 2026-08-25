import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { queryKeys } from '@innovator/constants/queryKeys';

/**
 * DashboardPage's only data dependency. Each section is backed by its own
 * `useQuery` (so one failing/loading section doesn't block the rest), but
 * every query goes through `dashboardService` — never `ideaService` /
 * `projectService` / `notificationService` directly. That keeps the
 * Dashboard swappable to a real `/dashboard` backend endpoint later without
 * touching this hook's call sites.
 */
export function useDashboard() {
  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardService.getSummary(),
  });

  const quickActions = useQuery({
    queryKey: queryKeys.dashboard.quickActions(),
    queryFn: () => dashboardService.getQuickActions(),
  });

  const requiredActions = useQuery({
    queryKey: queryKeys.dashboard.requiredActions(),
    queryFn: () => dashboardService.getRequiredActions(),
  });

  const recentIdeas = useQuery({
    queryKey: queryKeys.dashboard.recentIdeas(5),
    queryFn: () => dashboardService.getRecentIdeas(5),
  });

  const projects = useQuery({
    queryKey: queryKeys.dashboard.projects(),
    queryFn: () => dashboardService.getProjects(),
  });

  const recentActivity = useQuery({
    queryKey: queryKeys.dashboard.recentActivity(4),
    queryFn: () => dashboardService.getRecentActivity(4),
  });

  const statusDistribution = useQuery({
    queryKey: queryKeys.dashboard.statusDistribution(),
    queryFn: () => dashboardService.getStatusDistribution(),
  });

  return { summary, quickActions, requiredActions, recentIdeas, projects, recentActivity, statusDistribution };
}

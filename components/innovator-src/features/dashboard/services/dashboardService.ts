import { ideaService } from '@innovator/features/ideas/services/ideaService';
import { projectService } from '@innovator/features/projects/services/projectService';
import { notificationService } from '@innovator/features/notifications/services/notificationService';
import { computeIdeaStats, getIdeasRequiringAction, getRecentIdeas, getActiveInformationRequest } from '@innovator/features/ideas/selectors';
import { IDEA_STATUS_CONFIG } from '@innovator/features/ideas/status.config';
import { mapIdeaToCardViewModel, type IdeaCardViewModel } from '@innovator/features/ideas/viewModels';
import { notificationNavigationService } from '@innovator/features/notifications/services/notificationNavigationService';
import type { Project } from '@innovator/features/projects/types';
import type { IdeaStatus } from '@innovator/features/ideas/types';
import type {
  DashboardSummary,
  DashboardQuickAction,
  DashboardRequiredAction,
  DashboardRecentActivity,
  DashboardActivityCategory,
  DashboardStatusDistributionItem,
} from '../types';

/**
 * dashboardService abstraction.
 *
 * DashboardPage never talks to ideaService/projectService/notificationService
 * directly — it only calls this service (via `useDashboard`). Today this
 * implementation aggregates data client-side from the existing feature
 * services. If a dedicated backend `/dashboard` endpoint is introduced later,
 * only this file changes — the hook and the page stay identical.
 */
export interface DashboardService {
  getSummary(): Promise<DashboardSummary>;
  getQuickActions(): Promise<DashboardQuickAction[]>;
  getRequiredActions(): Promise<DashboardRequiredAction[]>;
  getRecentIdeas(limit?: number): Promise<IdeaCardViewModel[]>;
  getProjects(): Promise<Project[]>;
  getRecentActivity(limit?: number): Promise<DashboardRecentActivity[]>;
  getStatusDistribution(): Promise<DashboardStatusDistributionItem[]>;
}

function mapActivityCategory(type?: 'idea' | 'project'): DashboardActivityCategory {
  if (type === 'idea') return 'idea';
  if (type === 'project') return 'project';
  return 'general';
}

class AggregatingDashboardService implements DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const [ideas, projects] = await Promise.all([ideaService.list(), projectService.list()]);
    const ideaStats = computeIdeaStats(ideas);
    return {
      totalIdeas: ideaStats.total,
      underReview: ideaStats.underReview,
      needsInformation: ideaStats.needsInformation,
      approved: ideaStats.approved,
      projectsCount: projects.length,
    };
  }

  async getQuickActions(): Promise<DashboardQuickAction[]> {
    return [
      { id: 'submit-idea', label: 'تقديم فكرة', to: '/innovator/ideas/new', icon: 'submit' },
      { id: 'my-drafts', label: 'مسوداتي', to: '/innovator/ideas?status=DRAFT', icon: 'draft' },
      { id: 'complete-information', label: 'استكمال المعلومات', to: '/innovator/ideas?status=NEEDS_INFORMATION', icon: 'complete' },
      { id: 'my-ideas', label: 'أفكاري', to: '/innovator/ideas', icon: 'ideas' },
      { id: 'my-projects', label: 'مشاريعي', to: '/innovator/projects', icon: 'projects' },
      { id: 'notifications', label: 'الإشعارات', to: '/innovator/notifications', icon: 'notifications' },
    ];
  }

  async getRequiredActions(): Promise<DashboardRequiredAction[]> {
    const ideas = await ideaService.list();
    return getIdeasRequiringAction(ideas).map((idea) => {
      const statusConfig = IDEA_STATUS_CONFIG[idea.status];
      const activeRequest = getActiveInformationRequest(idea);
      return {
        id: idea.id,
        title: idea.title,
        description: activeRequest?.message ?? 'مطلوب استكمال معلومات إضافية لهذه الفكرة.',
        status: { label: statusConfig.label, tone: statusConfig.tone },
        metadata: idea.organizationName,
        primaryAction: { label: 'استكمال المعلومات', to: `/innovator/ideas/${idea.id}` },
      };
    });
  }

  async getRecentIdeas(limit = 5): Promise<IdeaCardViewModel[]> {
    const ideas = await ideaService.list();
    return getRecentIdeas(ideas, limit).map(mapIdeaToCardViewModel);
  }

  async getProjects(): Promise<Project[]> {
    return projectService.list();
  }

  async getRecentActivity(limit = 4): Promise<DashboardRecentActivity[]> {
    const notifications = await notificationService.list();
    return notifications.slice(0, limit).map((notification) => ({
      id: notification.id,
      category: mapActivityCategory(notification.relatedEntityType),
      title: notification.title,
      description: notification.message,
      timestamp: notification.createdAt,
      isRead: notification.isRead,
      to: notificationNavigationService.getNavigationAction(notification)?.route,
    }));
  }

  async getStatusDistribution(): Promise<DashboardStatusDistributionItem[]> {
    const ideas = await ideaService.list();
    const total = ideas.length;

    const counts = new Map<IdeaStatus, number>();
    for (const idea of ideas) {
      counts.set(idea.status, (counts.get(idea.status) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([status, count]) => {
        const config = IDEA_STATUS_CONFIG[status];
        return {
          status,
          label: config.label,
          tone: config.tone,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }
}

export const dashboardService: DashboardService = new AggregatingDashboardService();

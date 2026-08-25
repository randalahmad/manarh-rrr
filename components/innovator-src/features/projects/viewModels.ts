import type {
  Project,
  ProjectStatus,
  ProjectRequirement,
  ProjectAttachment,
  ProjectStakeholder,
  ProjectDeliveryMilestone,
} from './types';
import { PROJECT_STATUS_CONFIG, PROJECT_REQUIREMENT_STATUS_CONFIG, PROJECT_MILESTONE_STATUS_CONFIG } from './status.config';
import type { StatusTone } from '@innovator/types/status';
import type { ActionModel } from '@innovator/types/actions';
import type { TimelineEventViewModel } from '@innovator/types/timeline';
import { formatDate } from '@innovator/utils/formatDate';

export interface ProjectRequirementViewModel {
  id: string;
  title: string;
  status: { label: string; tone: StatusTone };
}

export function mapRequirementToViewModel(requirement: ProjectRequirement): ProjectRequirementViewModel {
  const config = PROJECT_REQUIREMENT_STATUS_CONFIG[requirement.status];
  return {
    id: requirement.id,
    title: requirement.title,
    status: { label: config.label, tone: config.tone },
  };
}

/**
 * Deliberately a SEPARATE model from `TimelineEventViewModel` (the Activity
 * Timeline's model) even though both end up rendered via the same generic
 * `Timeline` UI component. A delivery milestone is a scheduled, org-set
 * plan item with a due date and a mutable status; a timeline event is a
 * historical record of something that already happened. Conflating them
 * would lose that distinction (e.g. "overdue" only makes sense for a
 * milestone, never for a past event).
 */
export interface ProjectDeliveryMilestoneViewModel {
  id: string;
  title: string;
  description?: string;
  dueDateLabel: string;
  status: { label: string; tone: StatusTone };
  /** Derived from `dueDate` vs. now at mapping time — never stored on the entity itself. */
  isOverdue: boolean;
}

function mapDeliveryMilestoneToViewModel(milestone: ProjectDeliveryMilestone): ProjectDeliveryMilestoneViewModel {
  const config = PROJECT_MILESTONE_STATUS_CONFIG[milestone.status];
  const isOverdue = milestone.status !== 'DONE' && new Date(milestone.dueDate).getTime() < Date.now();

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    dueDateLabel: formatDate(milestone.dueDate),
    status: isOverdue ? { label: 'متأخر عن الموعد', tone: 'danger' } : { label: config.label, tone: config.tone },
    isOverdue,
  };
}

export interface ProjectDetailsViewModel {
  id: string;
  /** Raw enum value, in case a future workflow (e.g. project-side actions) needs it — mirrors IdeaDetailsViewModel.statusValue. */
  statusValue: ProjectStatus;
  name: string;
  status: { label: string; tone: StatusTone };
  /**
   * The related idea, represented as an action rather than a raw
   * {id, title} pair — the component renders a link without constructing
   * the route itself.
   */
  relatedIdeaAction: ActionModel;
  progressPercent?: number;
  startDateLabel?: string;
  endDateLabel?: string;
  requirements: ProjectRequirementViewModel[];
  timeline: TimelineEventViewModel[];
  /** The organization's delivery/milestone plan for this project — empty when the organization hasn't scheduled any yet (never populated with sample data). */
  deliveryMilestones: ProjectDeliveryMilestoneViewModel[];
  attachments: ProjectAttachment[];
  stakeholders: ProjectStakeholder[];
}

/**
 * The synchronous half of assembling Project Details — mirrors
 * `mapIdeaToDetailsViewModel`. `activity` is passed in already produced by
 * `projectActivityService`. Called only by `projectDetailsService`.
 */
export function mapProjectToDetailsViewModel(
  project: Project,
  activity: TimelineEventViewModel[],
): ProjectDetailsViewModel {
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  return {
    id: project.id,
    statusValue: project.status,
    name: project.name,
    status: { label: statusConfig.label, tone: statusConfig.tone },
    relatedIdeaAction: {
      enabled: true,
      label: project.relatedIdeaTitle,
      route: `/innovator/ideas/${project.relatedIdeaId}`,
    },
    progressPercent: project.progressPercent,
    startDateLabel: project.startDate ? formatDate(project.startDate) : undefined,
    endDateLabel: project.endDate ? formatDate(project.endDate) : undefined,
    requirements: project.requirements.map(mapRequirementToViewModel),
    timeline: activity,
    deliveryMilestones: (project.deliveryMilestones ?? [])
      .slice()
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
      .map(mapDeliveryMilestoneToViewModel),
    attachments: project.attachments ?? [],
    stakeholders: project.stakeholders ?? [],
  };
}

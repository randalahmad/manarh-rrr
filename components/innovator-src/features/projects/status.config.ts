import type { ProjectStatus, ProjectRequirement, ProjectDeliveryMilestone } from './types';
import type { StatusTone } from '@innovator/types/status';

interface ProjectStatusConfigEntry {
  label: string;
  tone: StatusTone;
}

/** Single source of truth for project status → Arabic label / visual tone. */
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, ProjectStatusConfigEntry> = {
  CREATED: { label: 'تم إنشاء المشروع', tone: 'info' },
  PLANNING: { label: 'التخطيط', tone: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'success' },
  BLOCKED: { label: 'متعثر', tone: 'danger' },
  ON_HOLD: { label: 'متوقف مؤقتًا', tone: 'warning' },
  RESUMED: { label: 'تم استئنافه', tone: 'info' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  CLOSED: { label: 'مغلق', tone: 'neutral' },
  ARCHIVED: { label: 'مؤرشف', tone: 'neutral' },
};

export function getProjectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_CONFIG[status].label;
}

export function getProjectStatusTone(status: ProjectStatus): StatusTone {
  return PROJECT_STATUS_CONFIG[status].tone;
}

/** Single source of truth for a project requirement's status → Arabic label / tone. */
export const PROJECT_REQUIREMENT_STATUS_CONFIG: Record<ProjectRequirement['status'], ProjectStatusConfigEntry> = {
  PENDING: { label: 'لم يبدأ', tone: 'neutral' },
  IN_PROGRESS: { label: 'قيد التنفيذ', tone: 'info' },
  DONE: { label: 'مكتمل', tone: 'success' },
};

/**
 * Delivery-milestone status config — Phase 6, Group E. Reuses
 * PROJECT_REQUIREMENT_STATUS_CONFIG's three entries (the real backend's
 * COMPLETED is mapped to 'DONE' before reaching this type) and adds its
 * own distinct entry for 'DELAYED', presentation-only, never persisted as
 * a new backend status.
 */
export const PROJECT_MILESTONE_STATUS_CONFIG: Record<ProjectDeliveryMilestone['status'], ProjectStatusConfigEntry> = {
  ...PROJECT_REQUIREMENT_STATUS_CONFIG,
  DELAYED: { label: 'متأخر', tone: 'warning' },
};

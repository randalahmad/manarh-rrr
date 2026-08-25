export const PROJECT_STATUSES = [
  'CREATED',
  'PLANNING',
  'IN_PROGRESS',
  'BLOCKED',
  'ON_HOLD',
  'RESUMED',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectRequirement {
  id: string;
  projectId: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  message: string;
  createdAt: string;
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ProjectStakeholder {
  id: string;
  name: string;
  role: string;
}

/**
 * A single delivery/milestone set BY THE ORGANIZATION after a project is
 * accepted — the innovator can only view these, never create or edit them
 * (no mutation method exists on `projectService` for this, by design).
 *
 * Phase 6, Group E: the real backend's `project_milestones.status` has 4
 * values (PENDING/IN_PROGRESS/COMPLETED/DELAYED), not the 3-value
 * `ProjectRequirement['status']` this type previously reused. Rather than
 * silently collapsing COMPLETED/DELAYED into the 3-value vocabulary, this
 * type now maps COMPLETED -> 'DONE' (same PROJECT_REQUIREMENT_STATUS_CONFIG
 * entry as a requirement) and keeps 'DELAYED' as its own distinct,
 * presentation-only value with its own label/tone (see status.config.ts) —
 * the real database value is never altered, and no new backend status is
 * created; this widening only affects how NeonProjectService maps a real
 * row to this local display type. "Overdue" is separately, and still,
 * derived from `dueDate` vs. the current date at view-model mapping time
 * (see `mapDeliveryMilestoneToViewModel`) — distinct from the
 * organization-set 'DELAYED' status.
 */
export interface ProjectDeliveryMilestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  /** Set by the organization, not the innovator. */
  dueDate: string;
  status: ProjectRequirement['status'] | 'DELAYED';
}

export interface Project {
  id: string;
  name: string;
  relatedIdeaId: string;
  relatedIdeaTitle: string;
  status: ProjectStatus;
  progressPercent?: number;
  startDate?: string;
  endDate?: string;
  requirements: ProjectRequirement[];
  updates: ProjectUpdate[];
  attachments?: ProjectAttachment[];
  stakeholders?: ProjectStakeholder[];
  /** Set by the organization once the project is accepted — absent until the organization actually schedules deliveries. Never populated with sample data. */
  deliveryMilestones?: ProjectDeliveryMilestone[];
  createdAt: string;
  updatedAt: string;
}

import type { Idea, IdeaAttachment, IdeaFormValues, IdeaStatus, InformationRequest } from './types';
import type { Project } from '@innovator/features/projects/types';
import { IDEA_STATUS_CONFIG } from './status.config';
import type { StatusTone } from '@innovator/types/status';
import type { ActionModel } from '@innovator/types/actions';
import type { TimelineEventViewModel } from '@innovator/types/timeline';
import { canEditIdea, canWithdrawIdea, canRespondToInformationRequest, canViewProject } from './policies';
import { getActiveInformationRequest } from './selectors';
import { formatDate } from '@innovator/utils/formatDate';

/** Everything IdeaCard needs to render — nothing more. Card markup can't accidentally couple to fields the backend might rename/remove later. */
export interface IdeaCardViewModel {
  id: string;
  href: string;
  title: string;
  organizationName: string;
  category: string;
  status: { label: string; tone: StatusTone };
  createdAtLabel: string;
  updatedAtLabel: string;
  /** Undefined for drafts that haven't been submitted yet — not "0" or a placeholder, genuinely absent. */
  submittedAtLabel?: string;
  attachmentsCount: number;
}

export function mapIdeaToCardViewModel(idea: Idea): IdeaCardViewModel {
  const statusConfig = IDEA_STATUS_CONFIG[idea.status];
  return {
    id: idea.id,
    href: `/innovator/ideas/${idea.id}`,
    title: idea.title,
    organizationName: idea.organizationName,
    category: idea.category || 'بدون تصنيف',
    status: { label: statusConfig.label, tone: statusConfig.tone },
    createdAtLabel: formatDate(idea.createdAt),
    updatedAtLabel: formatDate(idea.updatedAt),
    submittedAtLabel: idea.submittedAt ? formatDate(idea.submittedAt) : undefined,
    attachmentsCount: idea.attachments.length,
  };
}

/** Initializes the Submit Idea form when editing an existing draft. */
export function mapIdeaToFormValues(idea: Idea): IdeaFormValues {
  return {
    title: idea.title,
    organizationId: idea.organizationId,
    // The Select is keyed by category id, not display name — see Idea.categoryId's doc comment.
    category: idea.categoryId,
    description: idea.description,
    problem: idea.problem,
    proposedSolution: idea.proposedSolution,
    expectedImpact: idea.expectedImpact,
    ideaStage: idea.ideaStage ?? '',
    supportType: idea.supportType ?? '',
    additionalNotes: idea.additionalNotes ?? '',
  };
}

/* ============================================================
 * Idea Details view models (Phase 4C)
 * ============================================================ */

/**
 * A single renderable action. The page/components never ask "is this
 * allowed?" themselves — they just check whether the key is present.
 * Adding a future action (resubmit, print...) is a new optional field here,
 * not a new prop threaded through every consumer. `ActionModel` itself is
 * shared (@/types/actions) since Projects needs the exact same shape.
 */
export interface IdeaDetailsAvailableActions {
  edit?: ActionModel;
  withdraw?: ActionModel;
  completeInformation?: ActionModel;
  viewProject?: ActionModel;
}

/**
 * NOTE: producing `TimelineEventViewModel[]` for an idea is
 * `ideaActivityService`'s job (see `services/ideaActivityService.ts`), not
 * a pure mapper in this file — because future event sources (comments,
 * attachments, decisions...) may need their own async fetches, not just a
 * synchronous read of `idea.statusHistory`. This file only imports the
 * shared shape; `mapIdeaToDetailsViewModel` below receives the
 * already-produced array as a parameter.
 */

export interface InformationRequestViewModel {
  id: string;
  message: string;
  requestedAtLabel: string;
  /** True when this request has no response yet. */
  isActive: boolean;
  response?: string;
  respondedAtLabel?: string;
}

export function mapInformationRequestToViewModel(request: InformationRequest): InformationRequestViewModel {
  return {
    id: request.id,
    message: request.message,
    requestedAtLabel: formatDate(request.requestedAt),
    isActive: !request.respondedAt,
    response: request.response,
    respondedAtLabel: request.respondedAt ? formatDate(request.respondedAt) : undefined,
  };
}

export interface IdeaDetailsViewModel {
  id: string;
  /** Raw enum value — the page needs this to call ideaWorkflow (which speaks IdeaStatus), without importing Idea itself. */
  statusValue: IdeaStatus;
  title: string;
  status: { label: string; tone: StatusTone };
  organizationName: string;
  category: string;
  submittedAtLabel?: string;
  createdAtLabel: string;
  updatedAtLabel: string;

  description: string;
  problem: string;
  proposedSolution: string;
  expectedImpact: string;
  /** Undefined when not provided — no approved value list exists yet, so these stay free text (see Idea.ideaStage/supportType). */
  ideaStage?: string;
  supportType?: string;
  additionalNotes?: string;

  attachments: IdeaAttachment[];

  timeline: TimelineEventViewModel[];
  activeInformationRequest?: InformationRequestViewModel;
  informationRequestHistory: InformationRequestViewModel[];

  decision?: {
    outcomeLabel: string;
    tone: StatusTone;
    decidedAtLabel: string;
    reason?: string;
  };

  /** The actual project entity (already fetched by ideaDetailsService) — Project doesn't have its own view-model layer yet (see ProjectCard, used as-is throughout the app since Phase 3). */
  relatedProject?: Project;

  availableActions: IdeaDetailsAvailableActions;
}

const DECISION_OUTCOME_LABELS: Record<string, string> = {
  APPROVED: 'معتمدة',
  DEFERRED: 'مؤجلة',
  NOT_PURSUED: 'لن تتم متابعتها حاليًا',
  RETURNED_FOR_REVIEW: 'معادة للمراجعة',
};

const DECISION_OUTCOME_TONE: Record<string, StatusTone> = {
  APPROVED: 'success',
  DEFERRED: 'neutral',
  NOT_PURSUED: 'danger',
  RETURNED_FOR_REVIEW: 'warning',
};

/**
 * The synchronous half of assembling Idea Details: everything derivable
 * directly from the `Idea` entity itself (labels, permissions, information
 * requests, decision). The two inputs that require their own fetches —
 * `activity` (from `ideaActivityService`) and `relatedProject` (from
 * `projectService`, via `ideaDetailsService`) — are passed in already
 * resolved. Called only by `ideaDetailsService`, never directly by pages.
 */
export function mapIdeaToDetailsViewModel(
  idea: Idea,
  activity: TimelineEventViewModel[],
  relatedProject: Project | undefined,
): IdeaDetailsViewModel {
  const statusConfig = IDEA_STATUS_CONFIG[idea.status];
  const activeRequest = getActiveInformationRequest(idea);

  const availableActions: IdeaDetailsAvailableActions = {};

  if (canEditIdea(idea.status)) {
    availableActions.edit = {
      enabled: true,
      label: 'متابعة التعديل',
      route: `/innovator/ideas/${idea.id}/edit`,
    };
  }
  if (canWithdrawIdea(idea.status)) {
    availableActions.withdraw = { enabled: true, label: 'سحب الفكرة' };
  }
  if (canRespondToInformationRequest(idea.status)) {
    availableActions.completeInformation = {
      enabled: true,
      label: 'استكمال المعلومات',
      route: '#complete-information',
    };
  }
  if (canViewProject(idea)) {
    availableActions.viewProject = {
      enabled: true,
      label: 'عرض المشروع',
      route: `/innovator/projects/${idea.relatedProjectId}`,
    };
  }

  return {
    id: idea.id,
    statusValue: idea.status,
    title: idea.title,
    status: { label: statusConfig.label, tone: statusConfig.tone },
    organizationName: idea.organizationName,
    category: idea.category || 'بدون تصنيف',
    submittedAtLabel: idea.submittedAt ? formatDate(idea.submittedAt) : undefined,
    createdAtLabel: formatDate(idea.createdAt),
    updatedAtLabel: formatDate(idea.updatedAt),

    description: idea.description,
    problem: idea.problem,
    proposedSolution: idea.proposedSolution,
    expectedImpact: idea.expectedImpact,
    ideaStage: idea.ideaStage,
    supportType: idea.supportType,
    additionalNotes: idea.additionalNotes,

    attachments: idea.attachments,

    timeline: activity,
    activeInformationRequest: activeRequest ? mapInformationRequestToViewModel(activeRequest) : undefined,
    informationRequestHistory: idea.informationRequests.map(mapInformationRequestToViewModel),

    decision: idea.decision
      ? {
          outcomeLabel: DECISION_OUTCOME_LABELS[idea.decision.outcome],
          tone: DECISION_OUTCOME_TONE[idea.decision.outcome],
          decidedAtLabel: formatDate(idea.decision.decidedAt),
          reason: idea.decision.reason,
        }
      : undefined,

    relatedProject,

    availableActions,
  };
}

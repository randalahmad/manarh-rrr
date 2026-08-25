import type { Project } from '../types';
import { toTimelineSeverity, type TimelineEventViewModel } from '@innovator/types/timeline';
import { formatDate } from '@innovator/utils/formatDate';

/**
 * projectActivityService abstraction.
 *
 * Mirrors `ideaActivityService`'s role for projects, but structured
 * explicitly around one method per event source (`getProgressEvents`,
 * `getRequirementEvents`, `getUpdateEvents`, `getMilestoneEvents`) rather
 * than a single monolithic pass. Some return an empty array today because
 * the underlying data model has no timestamped history for that source yet
 * (see notes on each method) — the pipeline is ready for them regardless of
 * when that data becomes available.
 */
export interface ProjectActivityService {
  getActivity(project: Project): Promise<TimelineEventViewModel[]>;
}

class DefaultProjectActivityService implements ProjectActivityService {
  async getActivity(project: Project): Promise<TimelineEventViewModel[]> {
    const events = [
      ...this.getProgressEvents(),
      ...this.getRequirementEvents(),
      ...this.getUpdateEvents(project),
      ...this.getMilestoneEvents(),
    ];

    return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  }

  /**
   * EMPTY FOR NOW: `Project` has no progress-history data model — only the
   * current `progressPercent` snapshot, not a timestamped series of past
   * values. Once the backend tracks progress-over-time, this method reads
   * that series and emits one 'progress' event per milestone/checkpoint.
   */
  private getProgressEvents(): TimelineEventViewModel[] {
    return [];
  }

  /**
   * EMPTY FOR NOW: `ProjectRequirement` has no `changedAt`/timestamp field
   * yet — only a current status snapshot. Once requirement status changes
   * are timestamped, this method emits one 'requirement' event per
   * transition (e.g. "بدأ العمل على: تحديد نطاق الأسئلة الشائعة").
   */
  private getRequirementEvents(): TimelineEventViewModel[] {
    return [];
  }

  /** `ProjectUpdate[]` already carries a message + timestamp — the only event source with real data today. */
  private getUpdateEvents(project: Project): TimelineEventViewModel[] {
    return (project.updates ?? []).map((update) => ({
      id: update.id,
      type: 'UPDATE_POSTED',
      title: 'تحديث على المشروع',
      description: update.message,
      timestamp: update.createdAt,
      timestampLabel: formatDate(update.createdAt),
      icon: 'update',
      severity: toTimelineSeverity('info'),
    }));
  }

  /**
   * EMPTY FOR NOW: no milestone concept exists in the current `Project`
   * model (only free-text `requirements`/`updates`). Once milestones are
   * modeled explicitly, this method emits one 'milestone' event each.
   */
  private getMilestoneEvents(): TimelineEventViewModel[] {
    return [];
  }
}

export const projectActivityService: ProjectActivityService = new DefaultProjectActivityService();

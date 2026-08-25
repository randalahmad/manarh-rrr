import type { Idea } from '../types';
import { IDEA_STATUS_CONFIG } from '../status.config';
import { toTimelineSeverity, type TimelineEventViewModel } from '@innovator/types/timeline';
import { formatDate } from '@innovator/utils/formatDate';

/**
 * ideaActivityService abstraction.
 *
 * The single place responsible for producing an idea's unified activity
 * timeline (`TimelineEventViewModel[]`). Today it only reads
 * `idea.statusHistory` (synchronously, wrapped in a Promise for interface
 * stability), but is the intended landing spot for every future event
 * source: comments, attachment uploads, information requests,
 * decisions — each becomes its own private method here, merged and sorted
 * before returning. No caller outside this service needs to change when
 * that happens; `ideaDetailsService` (and anything else that wants an
 * idea's timeline) always gets back one sorted array.
 */
export interface IdeaActivityService {
  getActivity(idea: Idea): Promise<TimelineEventViewModel[]>;
}

class DefaultIdeaActivityService implements IdeaActivityService {
  async getActivity(idea: Idea): Promise<TimelineEventViewModel[]> {
    const events = [
      ...this.getStatusChangeEvents(idea),
      // Future sources, merged into the same array once implemented:
      // ...this.getInformationRequestEvents(idea),
      // ...this.getDecisionEvents(idea),
      // ...await this.getCommentEvents(idea),
    ];

    return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  }

  private getStatusChangeEvents(idea: Idea): TimelineEventViewModel[] {
    return idea.statusHistory.map((entry) => {
      const statusConfig = IDEA_STATUS_CONFIG[entry.status];
      return {
        id: entry.id,
        type: 'STATUS_CHANGE',
        title: statusConfig.label,
        description: entry.note,
        timestamp: entry.changedAt,
        timestampLabel: formatDate(entry.changedAt),
        icon: 'status-change',
        severity: toTimelineSeverity(statusConfig.tone),
      };
    });
  }
}

export const ideaActivityService: IdeaActivityService = new DefaultIdeaActivityService();

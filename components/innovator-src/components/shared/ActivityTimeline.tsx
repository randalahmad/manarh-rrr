import type { LucideIcon } from 'lucide-react';
import { GitCommitVertical, HelpCircle, CheckCircle2, Gavel, TrendingUp, ListChecks, MessageSquare, Flag, Circle } from 'lucide-react';
import type { TimelineEventViewModel, TimelineEventSeverity } from '@innovator/types/timeline';
import { Timeline, type TimelineEntry } from '@innovator/components/shared/Timeline';
import { EmptyState } from '@innovator/components/shared/EmptyState';

export interface ActivityTimelineProps {
  events: TimelineEventViewModel[];
  emptyTitle?: string;
}

/**
 * Resolves a TimelineEventViewModel's string `icon` key to an actual Lucide
 * component and its `severity` to a dot color. Domain-agnostic — both
 * ideaActivityService and projectActivityService emit events using these
 * same icon keys (or fall back to a generic dot), so this one component
 * renders either domain's activity feed.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  'status-change': GitCommitVertical,
  'information-requested': HelpCircle,
  'information-responded': CheckCircle2,
  decision: Gavel,
  progress: TrendingUp,
  requirement: ListChecks,
  update: MessageSquare,
  milestone: Flag,
};

const SEVERITY_DOT_CLASS: Record<TimelineEventSeverity, string> = {
  info: 'bg-inv-status-info-fg ring-1 ring-inv-status-info-fg',
  success: 'bg-inv-status-success-fg ring-1 ring-inv-status-success-fg',
  warning: 'bg-inv-status-warning-fg ring-1 ring-inv-status-warning-fg',
  danger: 'bg-inv-status-danger-fg ring-1 ring-inv-status-danger-fg',
};

export function ActivityTimeline({ events, emptyTitle = 'لا يوجد نشاط بعد' }: ActivityTimelineProps) {
  if (events.length === 0) {
    return <EmptyState icon={Circle} title={emptyTitle} />;
  }

  const entries: TimelineEntry[] = events.map((event) => {
    const Icon = ICON_MAP[event.icon] ?? Circle;
    return {
      id: event.id,
      title: (
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-inv-ink-500" aria-hidden="true" />
          {event.title}
        </span>
      ),
      timestamp: event.timestampLabel,
      description: event.description,
      toneClassName: SEVERITY_DOT_CLASS[event.severity],
    };
  });

  return <Timeline entries={entries} />;
}

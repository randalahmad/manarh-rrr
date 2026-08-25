import { CalendarClock } from 'lucide-react';
import type { ProjectDeliveryMilestoneViewModel } from '../../viewModels';
import type { StatusTone } from '@innovator/types/status';
import { Card, CardBody, CardHeader } from '@innovator/components/ui/Card';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';
import { Timeline, type TimelineEntry } from '@innovator/components/shared/Timeline';
import { EmptyState } from '@innovator/components/shared/EmptyState';

export interface ProjectDeliveryTimelineProps {
  milestones: ProjectDeliveryMilestoneViewModel[];
}

/** Same tone→dot-color mapping used elsewhere (ActivityTimeline/IdeaStatusDistributionChart), extended with neutral for PENDING milestones. */
const TONE_DOT_CLASS: Record<StatusTone, string> = {
  info: 'bg-inv-status-info-fg ring-1 ring-inv-status-info-fg',
  success: 'bg-inv-status-success-fg ring-1 ring-inv-status-success-fg',
  warning: 'bg-inv-status-warning-fg ring-1 ring-inv-status-warning-fg',
  danger: 'bg-inv-status-danger-fg ring-1 ring-inv-status-danger-fg',
  neutral: 'bg-inv-ink-300 ring-1 ring-inv-ink-300',
};

/**
 * The organization sets these after accepting the project — the innovator
 * can only view them here (no form, no edit action, no create button
 * anywhere in this component). Data comes exclusively from
 * `ProjectDetailsViewModel.deliveryMilestones`, already assembled by
 * `projectDetailsService` — this component never calls any service itself.
 */
export function ProjectDeliveryTimeline({ milestones }: ProjectDeliveryTimelineProps) {
  const entries: TimelineEntry[] = milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    timestamp: milestone.dueDateLabel,
    toneClassName: TONE_DOT_CLASS[milestone.status.tone],
    description: (
      <span className="flex flex-col gap-1.5">
        {milestone.description && <span>{milestone.description}</span>}
        <StatusBadge label={milestone.status.label} tone={milestone.status.tone} />
      </span>
    ),
  }));

  return (
    <Card>
      <CardHeader>
        <h2 className="font-inv-display font-bold text-inv-ink-900">خط زمني للتسليمات</h2>
      </CardHeader>
      <CardBody>
        {milestones.length === 0 ? (
          <EmptyState icon={CalendarClock} title="لا توجد تسليمات مجدولة حاليًا." />
        ) : (
          <Timeline entries={entries} />
        )}
      </CardBody>
    </Card>
  );
}

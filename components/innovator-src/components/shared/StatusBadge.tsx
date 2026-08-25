import { Badge } from '@innovator/components/ui/Badge';
import type { StatusTone } from '@innovator/types/status';

export interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

/**
 * Generic status badge. Callers pass the already-resolved label/tone from
 * `features/ideas/status.config.ts` or `features/projects/status.config.ts`
 * — this component holds no status-specific logic itself, so idea and
 * project statuses share one rendering path.
 */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <Badge tone={tone}>{label}</Badge>;
}

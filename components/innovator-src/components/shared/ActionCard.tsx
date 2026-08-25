import { Link } from '@innovator/_compat/react-router-shim';
import { Button } from '@innovator/components/ui/Button';
import { StatusBadge } from './StatusBadge';
import type { StatusTone } from '@innovator/types/status';

export interface ActionCardStatus {
  label: string;
  tone: StatusTone;
}

export interface ActionCardAction {
  label: string;
  to: string;
}

export interface ActionCardProps {
  title: string;
  description: string;
  /** Optional status badge — generic tone-based, not tied to any single domain's status enum. */
  status?: ActionCardStatus;
  /** Optional freeform context line (e.g. organization name, due date). */
  metadata?: string;
  primaryAction: ActionCardAction;
  /** Reserved for future use (e.g. "تجاهل" / "تفاصيل إضافية"). */
  secondaryAction?: ActionCardAction;
}

/**
 * Generic "something needs your attention" row. Deliberately has no
 * knowledge of Idea, Project, or any other domain model — callers map their
 * own entities into these props. Reusable anywhere a required action needs
 * to be surfaced (idea information requests today; project requirements or
 * anything else later).
 */
export function ActionCard({ title, description, status, metadata, primaryAction, secondaryAction }: ActionCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-inv-card border border-inv-status-warning-bg bg-inv-status-warning-bg/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-inv-ink-900">{title}</p>
          {status && <StatusBadge label={status.label} tone={status.tone} />}
        </div>
        <p className="mt-1 text-sm text-inv-ink-700">{description}</p>
        {metadata && <p className="mt-1 text-xs text-inv-ink-500">{metadata}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
        {secondaryAction && (
          <Link to={secondaryAction.to}>
            <Button variant="ghost" size="sm">
              {secondaryAction.label}
            </Button>
          </Link>
        )}
        <Link to={primaryAction.to}>
          <Button variant="secondary" size="sm">
            {primaryAction.label}
          </Button>
        </Link>
      </div>
    </div>
  );
}

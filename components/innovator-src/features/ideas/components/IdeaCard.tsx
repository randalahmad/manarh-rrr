import type { ReactNode } from 'react';
import { Link } from '@innovator/_compat/react-router-shim';
import { Building2, Tag, CalendarPlus, CalendarClock } from 'lucide-react';
import type { IdeaCardViewModel } from '../viewModels';
import { Card } from '@innovator/components/ui/Card';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';
import { AttachmentCountBadge } from '@innovator/components/shared/AttachmentUploader';

export interface IdeaCardProps {
  item: IdeaCardViewModel;
  /** Extra badges rendered next to the status badge (e.g. "خارجي"). Optional — doesn't change layout when absent. */
  badges?: ReactNode;
  /** Rendered below the card's main content, outside the clickable link area (e.g. a progress bar). */
  footer?: ReactNode;
  /** Action buttons (e.g. "سحب الفكرة"). Rendered outside the link so nested interactive controls stay valid HTML. */
  actions?: ReactNode;
}

/**
 * Presentation-only: renders an `IdeaCardViewModel`, nothing else. It has no
 * idea what an `Idea` entity looks like, so backend/schema changes never
 * require touching this file — only the view-model mapper does.
 *
 * Only the informational area is wrapped in the navigable `<Link>`; `footer`
 * and `actions` are siblings outside it, so buttons passed via those props
 * are never nested inside an anchor (invalid HTML / broken keyboard nav).
 */
export function IdeaCard({ item, badges, footer, actions }: IdeaCardProps) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-sm hover:border-inv-ink-200">
      <Link to={item.href} className="block rounded-inv-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-inv-display font-bold text-inv-ink-900">{item.title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadge label={item.status.label} tone={item.status.tone} />
            {badges}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-inv-ink-500">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden="true" />
            {item.organizationName}
          </span>
          <span className="flex items-center gap-1.5">
            <Tag className="size-3.5" aria-hidden="true" />
            {item.category}
          </span>
          <AttachmentCountBadge count={item.attachmentsCount} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-inv-ink-300">
          <span className="flex items-center gap-1">
            <CalendarPlus className="size-3.5" aria-hidden="true" />
            تاريخ الإنشاء: {item.createdAtLabel}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            آخر تحديث: {item.updatedAtLabel}
          </span>
        </div>
      </Link>

      {footer && <div className="mt-3 border-t border-inv-ink-100 pt-3">{footer}</div>}
      {actions && <div className="mt-3 flex items-center gap-2">{actions}</div>}
    </Card>
  );
}

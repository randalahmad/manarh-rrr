import { Building2, Tag, Calendar } from 'lucide-react';
import type { IdeaDetailsViewModel } from '../../viewModels';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';

export interface IdeaDetailsHeaderProps {
  idea: IdeaDetailsViewModel;
}

export function IdeaDetailsHeader({ idea }: IdeaDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-inv-display text-xl font-bold text-inv-ink-900 sm:text-2xl">{idea.title}</h2>
        <StatusBadge label={idea.status.label} tone={idea.status.tone} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-inv-ink-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="size-4" aria-hidden="true" />
          {idea.organizationName}
        </span>
        <span className="flex items-center gap-1.5">
          <Tag className="size-4" aria-hidden="true" />
          {idea.category}
        </span>
        {idea.submittedAtLabel && (
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden="true" />
            تاريخ التقديم: {idea.submittedAtLabel}
          </span>
        )}
      </div>
    </div>
  );
}

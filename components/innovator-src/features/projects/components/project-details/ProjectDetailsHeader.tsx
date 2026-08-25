import { Link } from '@innovator/_compat/react-router-shim';
import { Lightbulb, Calendar } from 'lucide-react';
import type { ProjectDetailsViewModel } from '../../viewModels';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';

export interface ProjectDetailsHeaderProps {
  project: ProjectDetailsViewModel;
}

export function ProjectDetailsHeader({ project }: ProjectDetailsHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-inv-display text-xl font-bold text-inv-ink-900 sm:text-2xl">{project.name}</h2>
        <StatusBadge label={project.status.label} tone={project.status.tone} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-inv-ink-500">
        {project.relatedIdeaAction.enabled && (
          <Link
            to={project.relatedIdeaAction.route!}
            className="flex items-center gap-1.5 text-inv-brand-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700 rounded-inv-control"
          >
            <Lightbulb className="size-4" aria-hidden="true" />
            مبني على فكرة: {project.relatedIdeaAction.label}
          </Link>
        )}
        {project.startDateLabel && (
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden="true" />
            بدأ في: {project.startDateLabel}
          </span>
        )}
      </div>
    </div>
  );
}

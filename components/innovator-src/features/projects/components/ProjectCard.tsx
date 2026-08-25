import { Link } from '@innovator/_compat/react-router-shim';
import { Lightbulb, Clock } from 'lucide-react';
import type { Project } from '../types';
import { PROJECT_STATUS_CONFIG } from '../status.config';
import { Card } from '@innovator/components/ui/Card';
import { StatusBadge } from '@innovator/components/shared/StatusBadge';
import { formatDate } from '@innovator/utils/formatDate';

export interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  return (
    <Link
      to={`/innovator/projects/${project.id}`}
      className="block rounded-inv-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-brand-700"
    >
      <Card className="p-4 transition-shadow hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-inv-display font-bold text-inv-ink-900">{project.name}</h3>
          <StatusBadge label={statusConfig.label} tone={statusConfig.tone} />
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-inv-ink-500">
          <Lightbulb className="size-3.5" aria-hidden="true" />
          مبني على فكرة: {project.relatedIdeaTitle}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-inv-ink-300">
          <Clock className="size-3.5" aria-hidden="true" />
          آخر تحديث: {formatDate(project.updatedAt)}
        </p>

        {typeof project.progressPercent === 'number' && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-inv-ink-100">
              <div
                className="h-full rounded-full bg-inv-brand-700"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-inv-ink-500">نسبة الإنجاز: {project.progressPercent}٪</p>
          </div>
        )}
      </Card>
    </Link>
  );
}

import type { Project } from '@innovator/features/projects/types';
import { ProjectCard } from '@innovator/features/projects/components/ProjectCard';

export interface IdeaRelatedProjectCardProps {
  project: Project;
}

/**
 * Purely presentational — ideaDetailsService already fetched the project,
 * so this component has no data-fetching of its own (unlike its Phase 4C
 * version, which called useProject() itself; that responsibility moved to
 * the aggregation service).
 */
export function IdeaRelatedProjectCard({ project }: IdeaRelatedProjectCardProps) {
  return (
    <div>
      <h2 className="mb-4 font-inv-display font-bold text-inv-ink-900">المشروع المرتبط</h2>
      <ProjectCard project={project} />
    </div>
  );
}

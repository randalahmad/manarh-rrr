import type { Project } from '../types';
import { ProjectCard } from './ProjectCard';

export interface ProjectsListProps {
  projects: Project[];
}

/** Renders a collection of projects as cards. Isolated for the same reason as `IdeasList`. */
export function ProjectsList({ projects }: ProjectsListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

import type { Project, ProjectStatus } from './types';

/**
 * ASSUMPTION (UI grouping, not a confirmed backend concept): a project is
 * "active" if it hasn't reached a terminal state yet. Centralized here so
 * the rule can change in one place once confirmed, instead of being
 * reimplemented per screen — same pattern as features/ideas/selectors.ts.
 */
const TERMINAL_PROJECT_STATUSES: ProjectStatus[] = ['COMPLETED', 'CLOSED', 'ARCHIVED'];

export function isProjectActive(status: ProjectStatus): boolean {
  return !TERMINAL_PROJECT_STATUSES.includes(status);
}

export function countActiveProjects(projects: Project[]): number {
  return projects.filter((project) => isProjectActive(project.status)).length;
}

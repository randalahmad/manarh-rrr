import { projectService } from './projectService';
import { projectActivityService } from './projectActivityService';
import { mapProjectToDetailsViewModel, type ProjectDetailsViewModel } from '../viewModels';

/**
 * projectDetailsService abstraction.
 *
 * ProjectDetailsPage calls only this — never `projectService` or
 * `projectActivityService` directly. Mirrors `ideaDetailsService` exactly.
 *
 *   ProjectDetailsPage → useProjectDetails(id) → projectDetailsService.getDetails(id)
 *                                                    → projectService.getById(id)
 *                                                    → projectActivityService.getActivity(project)
 */
export interface ProjectDetailsService {
  getDetails(id: string): Promise<ProjectDetailsViewModel>;
}

class DefaultProjectDetailsService implements ProjectDetailsService {
  async getDetails(id: string): Promise<ProjectDetailsViewModel> {
    const project = await projectService.getById(id);
    const activity = await projectActivityService.getActivity(project);
    return mapProjectToDetailsViewModel(project, activity);
  }
}

export const projectDetailsService: ProjectDetailsService = new DefaultProjectDetailsService();

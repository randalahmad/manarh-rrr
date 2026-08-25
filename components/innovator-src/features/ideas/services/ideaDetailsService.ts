import { ideaService } from './ideaService';
import { ideaActivityService } from './ideaActivityService';
import { projectService } from '@innovator/features/projects/services/projectService';
import { canViewProject } from '../policies';
import { mapIdeaToDetailsViewModel, type IdeaDetailsViewModel } from '../viewModels';

/**
 * ideaDetailsService abstraction.
 *
 * IdeaDetailsPage calls only this — never `ideaService`, `projectService`,
 * or `ideaActivityService` directly. This is the aggregation layer that
 * turns "an idea id" into everything the page needs to render, already
 * composed into one `IdeaDetailsViewModel`.
 *
 *   IdeaDetailsPage → useIdeaDetails(id) → ideaDetailsService.getDetails(id)
 *                                              → ideaService.getById(id)
 *                                              → ideaActivityService.getActivity(idea)
 *                                              → projectService.getById(...)  (only if a project is viewable)
 */
export interface IdeaDetailsService {
  getDetails(id: string): Promise<IdeaDetailsViewModel>;
}

class DefaultIdeaDetailsService implements IdeaDetailsService {
  async getDetails(id: string): Promise<IdeaDetailsViewModel> {
    const idea = await ideaService.getById(id);
    const activity = await ideaActivityService.getActivity(idea);

    // A missing/broken related project shouldn't take down the whole
    // details view — the innovator can still see everything else about
    // their idea, just without the project card.
    const relatedProject =
      canViewProject(idea) && idea.relatedProjectId
        ? await projectService.getById(idea.relatedProjectId).catch(() => undefined)
        : undefined;

    return mapIdeaToDetailsViewModel(idea, activity, relatedProject);
  }
}

export const ideaDetailsService: IdeaDetailsService = new DefaultIdeaDetailsService();

import type { Project, ProjectStatus, ProjectRequirement, ProjectUpdate, ProjectAttachment, ProjectStakeholder, ProjectDeliveryMilestone } from '../types';
import { getSessionUserAction } from '@/lib/mock-server/actions/auth';
import { listMyOrganizationsAction } from '@/lib/mock-server/actions/organizations';
import { listIdeasAction, getIdeaAction } from '@/lib/mock-server/actions/ideas';
import { getProjectAction } from '@/lib/mock-server/actions/projects';
import { listRequirementsForProjectAction } from '@/lib/mock-server/actions/requirements';
import { listProjectUpdatesAction } from '@/lib/mock-server/actions/project-updates';
import { listAttachmentsForEntityAction } from '@/lib/mock-server/actions/attachments';
import { listProjectMembersAction } from '@/lib/mock-server/actions/project-members';
import { listMilestonesForProjectAction } from '@/lib/mock-server/actions/milestones';
import { getUsersDisplayInfoAction } from '@/lib/mock-server/actions/user-directory';
import type { ProjectRow } from '@/lib/server/services/projects';
import type { IdeaRow } from '@/lib/server/services/ideas';
import type { ProjectStatus as RealProjectStatus } from '@/lib/types';
import type { ActionResult } from '@/lib/server/errors';

/**
 * projectService abstraction — the innovator only ever sees projects tied
 * to their own approved ideas (enforced server-side: an idea's `project_id`
 * is only set once that specific idea's owner idea gets converted — see
 * `createProjectFromIdea`).
 *
 * `NeonProjectService` (Phase 6, Group D) is the real implementation,
 * following the exact pattern `NeonIdeaService` (../../ideas/services/ideaService.ts)
 * established in Group B. It replaces `MockProjectService` for every
 * method — no consuming hook/page changes.
 *
 * Phase 6, Group E addition: `requirements`, `updates`, `attachments`,
 * `stakeholders`, and `deliveryMilestones` are now real, fetched alongside
 * the project core in `getById`. This also means the Activity Timeline
 * (projectActivityService.getUpdateEvents, which reads `project.updates`)
 * now shows real status-change history for real, since
 * `transitionProjectStatus` (Group D) already inserts real STATUS_CHANGE
 * rows into `project_updates` on every status change — no extra wiring was
 * needed there, only populating `updates` for real here.
 *
 * KNOWN GAPS (reported to the user, not silently invented around):
 *  - `attachments[].fileUrl` is always `''` — attachments are metadata-only
 *    (no object storage wired — see lib/server/services/attachments.ts's
 *    header). `AttachmentsList` disables its download control when
 *    `fileUrl` is falsy rather than linking to a fabricated URL.
 *  - `requirements[].status` only ever takes the 3 real requirement values
 *    (PENDING/IN_PROGRESS/DONE) — no mismatch here, the real column and this
 *    type already agree.
 *  - `deliveryMilestones[].status`: the real column has 4 values
 *    (PENDING/IN_PROGRESS/COMPLETED/DELAYED); COMPLETED maps to this type's
 *    'DONE' and DELAYED is kept as its own distinct presentation value (see
 *    types.ts's updated `ProjectDeliveryMilestone` comment and
 *    status.config.ts's `PROJECT_MILESTONE_STATUS_CONFIG`) — presentation
 *    only, the real value is never altered.
 *  - `status`: the real 15-status canonical workflow is mapped DOWN into
 *    this interface's pre-existing local status type
 *    (CREATED/PLANNING/IN_PROGRESS/BLOCKED/ON_HOLD/RESUMED/COMPLETED/
 *    CLOSED/ARCHIVED) for PRESENTATION ONLY — see `toLocalStatus` below.
 *    `RESUMED` is never produced: leaving BLOCKED/ON_HOLD always restores
 *    the exact real previous status (previous_active_status), which this
 *    mapping resolves to its own local bucket like any other status —
 *    matching the approved decision not to invent/persist a RESUMED status.
 */
export interface ProjectService {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project>;
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

async function getCurrentUserId(): Promise<string> {
  const result = await getSessionUserAction();
  if (!result.ok || !result.data) {
    throw new Error('No active session.');
  }
  return result.data.id;
}

/** Presentational grouping only — mirrors lib/client/specialist-projects.ts's mapToSpecialistStatus, adapted to this interface's own local status vocabulary. Never invents/persists RESUMED. */
function toLocalStatus(status: RealProjectStatus): ProjectStatus {
  switch (status) {
    case 'PROJECT_CREATED':
      return 'CREATED';
    case 'DEVELOPMENT':
    case 'PLANNING':
    case 'ASSIGN_STAKEHOLDERS':
    case 'DEFINE_REQUIREMENTS':
    case 'DEFINE_TIMELINE':
      return 'PLANNING';
    case 'EXECUTION':
    case 'TESTING':
    case 'LAUNCH':
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'ON_HOLD':
      return 'ON_HOLD';
    case 'COMPLETED':
    case 'CLOSED':
    case 'ARCHIVED':
      return status;
  }
}

function toLocalMilestoneStatus(status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'): ProjectDeliveryMilestone['status'] {
  return status === 'COMPLETED' ? 'DONE' : status;
}

async function fetchSubResources(projectId: string): Promise<{
  requirements: ProjectRequirement[];
  updates: ProjectUpdate[];
  attachments: ProjectAttachment[];
  stakeholders: ProjectStakeholder[];
  deliveryMilestones: ProjectDeliveryMilestone[];
}> {
  const [reqResult, updateResult, attachmentResult, memberResult, milestoneResult] = await Promise.all([
    listRequirementsForProjectAction({ projectId }),
    listProjectUpdatesAction({ projectId }),
    listAttachmentsForEntityAction({ entityType: 'PROJECT', entityId: projectId }),
    listProjectMembersAction({ projectId }),
    listMilestonesForProjectAction({ projectId }),
  ]);

  const requirements: ProjectRequirement[] = unwrap(reqResult).map((r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    status: r.status,
  }));

  const updates: ProjectUpdate[] = unwrap(updateResult).map((u) => ({
    id: u.id,
    projectId: u.project_id,
    message: u.content,
    createdAt: u.created_at,
  }));

  // Metadata-only — fileUrl is always '' (no object storage wired). See
  // this file's header and AttachmentsList's own handling of a falsy fileUrl.
  const attachments: ProjectAttachment[] = unwrap(attachmentResult).map((a) => ({
    id: a.id,
    projectId: a.entity_id,
    fileName: a.file_name,
    fileUrl: '',
    fileSize: a.size_kb * 1024,
    mimeType: a.file_type,
    uploadedAt: a.uploaded_at,
  }));

  const memberRows = unwrap(memberResult);
  const memberNames = memberRows.length
    ? unwrap(await getUsersDisplayInfoAction({ userIds: Array.from(new Set(memberRows.map((m) => m.user_id))) }))
    : {};
  const stakeholders: ProjectStakeholder[] = memberRows.map((m) => ({
    id: m.id,
    name: memberNames[m.user_id]?.fullName ?? '—',
    role: m.role_in_project,
  }));

  const deliveryMilestones: ProjectDeliveryMilestone[] = unwrap(milestoneResult).map((m) => ({
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    description: m.description ?? undefined,
    dueDate: m.due_date,
    status: toLocalMilestoneStatus(m.status),
  }));

  return { requirements, updates, attachments, stakeholders, deliveryMilestones };
}

function toProject(
  row: ProjectRow,
  idea: IdeaRow,
  sub: { requirements: ProjectRequirement[]; updates: ProjectUpdate[]; attachments: ProjectAttachment[]; stakeholders: ProjectStakeholder[]; deliveryMilestones: ProjectDeliveryMilestone[] }
): Project {
  return {
    id: row.id,
    name: row.name,
    relatedIdeaId: row.idea_id,
    relatedIdeaTitle: idea.title,
    status: toLocalStatus(row.status),
    progressPercent: row.progress,
    startDate: row.start_date,
    endDate: row.expected_completion_date,
    requirements: sub.requirements,
    updates: sub.updates,
    attachments: sub.attachments,
    stakeholders: sub.stakeholders,
    deliveryMilestones: sub.deliveryMilestones,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class NeonProjectService implements ProjectService {
  async list(): Promise<Project[]> {
    const orgs = unwrap(await listMyOrganizationsAction());
    const organizationIds = orgs.map((org) => org.id);
    if (organizationIds.length === 0) return [];

    const currentUserId = await getCurrentUserId();

    // "My projects" = projects whose originating idea I submitted (the
    // ideas table's own project_id link — the only real, non-fabricated
    // notion of project ownership this interface has).
    const ideaLists = await Promise.all(
      organizationIds.map((organizationId) =>
        listIdeasAction({ organizationId, submitterId: currentUserId }).then(unwrap)
      )
    );
    const projectIds = ideaLists
      .flat()
      .map((idea) => idea.project_id)
      .filter((id): id is string => Boolean(id));

    return Promise.all(projectIds.map((id) => this.getById(id)));
  }

  async getById(id: string): Promise<Project> {
    const row = unwrap(await getProjectAction({ projectId: id }));
    const [idea, sub] = await Promise.all([
      getIdeaAction({ ideaId: row.idea_id }).then(unwrap),
      fetchSubResources(id),
    ]);
    return toProject(row, idea, sub);
  }
}

export const projectService: ProjectService = new NeonProjectService();

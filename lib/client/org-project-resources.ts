/**
 * Client-side data layer for the Org Admin Project detail page's
 * sub-resource tabs (`app/org/projects/[id]/page.tsx`) — Phase 6, Group E.
 *
 * Mirrors `lib/client/org-projects.ts`'s pattern (Group D): a narrow,
 * additive data source backed by real Server Actions. Kept in a separate
 * file so `org-projects.ts` (Project Core) stays untouched.
 *
 * SCOPE (per the user-approved Group E decisions):
 *  - Requirements, Team (project members), Docs (attachments metadata),
 *    Updates: REAL READS ONLY. The current Org Admin UI has no create
 *    affordance for any of these four tabs today — per "do not redesign the
 *    UI, do not add new create buttons," only their reads are wired.
 *  - Tasks, Risks, KPI, Impact: real reads AND the existing create
 *    controls (the only tabs whose UI already has an "add" modal).
 *  - Milestones: no Org Admin tab exists for this sub-resource at all —
 *    nothing to wire here (see the Group E plan's decision D4).
 *  - Attachments stay metadata-only: no storage vendor, no download/open —
 *    `AttachmentRow` has no `fileUrl` field to map, matching the real
 *    backend's own limitation (see attachments.ts's header comment).
 */
import type { ProjectRequirement, ProjectMember, ProjectDocument, ProjectUpdate, ProjectTask, ProjectRisk, KPI, ImpactMeasurement } from "@/lib/types";
import { listRequirementsForProjectAction } from "@/lib/server/actions/requirements";
import { listProjectMembersAction } from "@/lib/server/actions/project-members";
import { listAttachmentsForEntityAction, createAttachmentAction } from "@/lib/server/actions/attachments";
import { listProjectUpdatesAction } from "@/lib/server/actions/project-updates";
import { createTaskAction, listTasksForProjectAction } from "@/lib/server/actions/tasks";
import { createRiskAction, listRisksForProjectAction } from "@/lib/server/actions/risks";
import {
  createKpiAction,
  listKpisForSubjectAction,
  createImpactMeasurementAction,
  listImpactMeasurementsForSubjectAction,
} from "@/lib/server/actions/measurements";
import type { ProjectRequirementRow } from "@/lib/server/services/requirements";
import type { ProjectMemberRow } from "@/lib/server/services/project-members";
import type { AttachmentRow } from "@/lib/server/services/attachments";
import type { ProjectUpdateRow } from "@/lib/server/services/project-updates";
import type { ProjectTaskRow, CreateTaskInput } from "@/lib/server/services/tasks";
import type { ProjectRiskRow, CreateRiskInput } from "@/lib/server/services/risks";
import type { KpiRow, CreateKpiInput, ImpactMeasurementRow, CreateImpactMeasurementInput } from "@/lib/server/services/measurements";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

function mapRequirementRow(row: ProjectRequirementRow): ProjectRequirement {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date ?? undefined,
  };
}

function mapMemberRow(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    roleInProject: row.role_in_project,
    addedAt: row.added_at,
  };
}

/** No `fileUrl` field — metadata-only, no storage vendor wired (see this file's header). */
function mapAttachmentRow(row: AttachmentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.entity_id,
    fileName: row.file_name,
    fileType: row.file_type,
    sizeKb: row.size_kb,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
  };
}

function mapUpdateRow(row: ProjectUpdateRow): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    updateType: row.update_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapTaskRow(row: ProjectTaskRow): ProjectTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRiskRow(row: ProjectRiskRow): ProjectRisk {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    level: row.level,
    status: row.status,
    ownerId: row.owner_id ?? undefined,
    mitigationPlan: row.mitigation_plan ?? undefined,
    blocker: row.blocker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapKpiRow(row: KpiRow): KPI {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    ideaId: row.idea_id ?? undefined,
    strategicGoalId: row.strategic_goal_id ?? undefined,
    name: row.name,
    unit: row.unit,
    targetValue: row.target_value,
    currentValue: row.current_value,
    ownerId: row.owner_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapImpactRow(row: ImpactMeasurementRow): ImpactMeasurement {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    ideaId: row.idea_id ?? undefined,
    type: row.type,
    description: row.description,
    baselineValue: row.baseline_value ?? undefined,
    targetValue: row.target_value ?? undefined,
    actualValue: row.actual_value ?? undefined,
    unit: row.unit ?? undefined,
    measuredAt: row.measured_at,
    measuredBy: row.measured_by,
  };
}

export async function fetchProjectRequirements(projectId: string): Promise<ProjectRequirement[]> {
  return unwrap(await listRequirementsForProjectAction({ projectId })).map(mapRequirementRow);
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return unwrap(await listProjectMembersAction({ projectId })).map(mapMemberRow);
}

export async function fetchProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const rows = unwrap(await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: projectId }));
  return rows.map(mapAttachmentRow);
}

export async function fetchProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  return unwrap(await listProjectUpdatesAction({ projectId })).map(mapUpdateRow);
}

export async function fetchProjectTasks(projectId: string): Promise<ProjectTask[]> {
  return unwrap(await listTasksForProjectAction({ projectId })).map(mapTaskRow);
}

export async function createProjectTask(input: CreateTaskInput): Promise<ProjectTask> {
  return mapTaskRow(unwrap(await createTaskAction(input)));
}

export async function fetchProjectRisks(projectId: string): Promise<ProjectRisk[]> {
  return unwrap(await listRisksForProjectAction({ projectId })).map(mapRiskRow);
}

export async function createProjectRisk(input: CreateRiskInput): Promise<ProjectRisk> {
  return mapRiskRow(unwrap(await createRiskAction(input)));
}

export async function fetchProjectKpis(projectId: string): Promise<KPI[]> {
  return unwrap(await listKpisForSubjectAction({ projectId })).map(mapKpiRow);
}

export async function createProjectKpi(input: CreateKpiInput): Promise<KPI> {
  return mapKpiRow(unwrap(await createKpiAction(input)));
}

export async function fetchProjectImpactMeasurements(projectId: string): Promise<ImpactMeasurement[]> {
  return unwrap(await listImpactMeasurementsForSubjectAction({ projectId })).map(mapImpactRow);
}

export async function createProjectImpactMeasurement(input: CreateImpactMeasurementInput): Promise<ImpactMeasurement> {
  return mapImpactRow(unwrap(await createImpactMeasurementAction(input)));
}

/** Exposed for the Org Admin "docs" tab if it ever gains an upload affordance — not called by the current read-only tab. */
export const createProjectAttachment = createAttachmentAction;

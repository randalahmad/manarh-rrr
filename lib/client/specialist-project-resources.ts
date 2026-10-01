/**
 * Client-side data layer for the Innovation Specialist Project detail
 * page's sub-resource tabs
 * (`app/innovation-specialist/(dashboard)/projects/[id]/project-details-client.tsx`)
 * — Phase 6, Group E.
 *
 * Mirrors `lib/client/org-project-resources.ts`'s pattern but maps onto
 * THIS interface's own pre-existing local view types (Requirement/
 * Milestone/Update/Attachment, all with a local Arabic-facing status
 * vocabulary), not the shared `lib/types.ts` shapes Org Admin uses.
 *
 * KNOWN GAPS / DECISIONS (reported in the Group E completion report, not
 * silently invented around):
 *  - Requirement `priority` and `assignee` have NO backend column
 *    (project_requirements has only title/description/status/due_date).
 *    They stay as empty, never-fabricated local-only fields on read; the
 *    create form still collects them for now but they are NOT sent to the
 *    server and NOT persisted anywhere (no duplicate frontend-only
 *    persistence).
 *  - The requirements service has no "edit full fields" endpoint — only
 *    `createRequirement` and `updateRequirementStatus`. Editing an
 *    existing requirement's title/description therefore only persists a
 *    status change (via the same modal, mapped to the closest real
 *    status); this is a real, reported backend-capability gap.
 *  - Requirement status has 3 real values (PENDING/IN_PROGRESS/DONE); the
 *    local UI's 4th option ("متعثر") has no real equivalent and is
 *    rejected (no-op, explained to the user) rather than silently
 *    persisting a fabricated status.
 *  - Milestone status is a clean 1:1 map (PENDING/IN_PROGRESS/COMPLETED/
 *    DELAYED <-> لم يبدأ/قيد التنفيذ/مكتمل/متأخر) — presentation-only,
 *    never persists a new value.
 *  - Project update `attachment` (free-text filename) has no backend
 *    column either — never sent, never persisted.
 *  - Attachments stay metadata-only: list/delete are real; upload has no
 *    real object-storage path (createAttachment requires a pre-existing
 *    storage pointer this UI cannot produce), so the upload affordance is
 *    disabled here rather than faking local-only persistence. Preview/open
 *    is disabled for the same reason (approved decision).
 *  - "سجل النشاط" (Activity Timeline) stays on local mock state: the real
 *    backing (audit_logs, via listAuditLogsAction) requires AUDIT:VIEW,
 *    which INNOVATION_SPECIALIST does NOT have in the approved seeded
 *    catalog (db/migrations/0010_rbac_seed.sql grants it to no role except
 *    the ORG_ADMIN special case). Wiring this tab would require a new
 *    permission grant, which this phase's rules explicitly forbid
 *    inventing. The real per-status-change history is still visible for
 *    real, though, via the Updates tab (STATUS_CHANGE rows written by
 *    transitionProjectStatus).
 */
import { listRequirementsForProjectAction, createRequirementAction, updateRequirementStatusAction } from "@/lib/mock-server/actions/requirements";
import { listMilestonesForProjectAction, updateMilestoneStatusAction } from "@/lib/mock-server/actions/milestones";
import { listProjectUpdatesAction, addProjectUpdateAction } from "@/lib/mock-server/actions/project-updates";
import { listAttachmentsForEntityAction, deleteAttachmentAction } from "@/lib/mock-server/actions/attachments";
import { getUsersDisplayInfoAction } from "@/lib/mock-server/actions/user-directory";
import type { ProjectRequirementRow } from "@/lib/server/services/requirements";
import type { ProjectMilestoneRow } from "@/lib/server/services/milestones";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export interface RequirementView {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignee: string;
}

export interface MilestoneView {
  id: string;
  title: string;
  date: string;
  status: string;
}

export interface UpdateView {
  id: string;
  date: string;
  author: string;
  text: string;
  attachment: string | null;
}

export interface AttachmentView {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  date: string;
}

const REQUIREMENT_STATUS_TO_LOCAL: Record<ProjectRequirementRow["status"], string> = {
  PENDING: "مفتوح",
  IN_PROGRESS: "قيد التنفيذ",
  DONE: "مكتمل",
};
const REQUIREMENT_STATUS_TO_REAL: Record<string, ProjectRequirementRow["status"]> = {
  "مفتوح": "PENDING",
  "قيد التنفيذ": "IN_PROGRESS",
  "مكتمل": "DONE",
};

const MILESTONE_STATUS_TO_LOCAL: Record<ProjectMilestoneRow["status"], string> = {
  PENDING: "لم يبدأ",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  DELAYED: "متأخر",
};
const MILESTONE_STATUS_TO_REAL: Record<string, ProjectMilestoneRow["status"]> = {
  "لم يبدأ": "PENDING",
  "قيد التنفيذ": "IN_PROGRESS",
  "مكتمل": "COMPLETED",
  "متأخر": "DELAYED",
};

function mapRequirementRow(row: ProjectRequirementRow): RequirementView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: "",
    status: REQUIREMENT_STATUS_TO_LOCAL[row.status],
    dueDate: row.due_date ? new Date(row.due_date).toLocaleDateString("ar-SA") : "",
    assignee: "",
  };
}

function mapMilestoneRow(row: ProjectMilestoneRow): MilestoneView {
  return {
    id: row.id,
    title: row.title,
    date: new Date(row.due_date).toLocaleDateString("ar-SA"),
    status: MILESTONE_STATUS_TO_LOCAL[row.status],
  };
}

export async function fetchSpecialistRequirements(projectId: string): Promise<RequirementView[]> {
  const rows = unwrap(await listRequirementsForProjectAction({ projectId }));
  return rows.map(mapRequirementRow);
}

export async function createSpecialistRequirement(projectId: string, title: string, description: string, dueDate?: string): Promise<void> {
  unwrap(await createRequirementAction({ projectId, title, description, dueDate }));
}

/** Returns false (no-op) when the local status has no real equivalent, so the caller can explain rather than fabricate. */
export async function updateSpecialistRequirementStatus(requirementId: string, localStatus: string): Promise<boolean> {
  const status = REQUIREMENT_STATUS_TO_REAL[localStatus];
  if (!status) return false;
  unwrap(await updateRequirementStatusAction({ requirementId, status }));
  return true;
}

export async function fetchSpecialistMilestones(projectId: string): Promise<MilestoneView[]> {
  const rows = unwrap(await listMilestonesForProjectAction({ projectId }));
  return rows.map(mapMilestoneRow);
}

export async function updateSpecialistMilestoneStatus(milestoneId: string, localStatus: string): Promise<boolean> {
  const status = MILESTONE_STATUS_TO_REAL[localStatus];
  if (!status) return false;
  unwrap(await updateMilestoneStatusAction({ milestoneId, status }));
  return true;
}

export async function fetchSpecialistUpdates(projectId: string): Promise<UpdateView[]> {
  const rows = unwrap(await listProjectUpdatesAction({ projectId }));
  if (rows.length === 0) return [];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const namesResult = await getUsersDisplayInfoAction({ userIds: authorIds });
  const names = namesResult.ok ? namesResult.data : {};
  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.created_at).toLocaleString("ar-SA"),
    author: names[row.author_id]?.fullName ?? "—",
    text: row.content,
    attachment: null,
  }));
}

export async function addSpecialistUpdate(projectId: string, text: string): Promise<void> {
  unwrap(await addProjectUpdateAction({ projectId, updateType: "NOTE", content: text }));
}

export async function fetchSpecialistAttachments(projectId: string): Promise<AttachmentView[]> {
  const rows = unwrap(await listAttachmentsForEntityAction({ entityType: "PROJECT", entityId: projectId }));
  if (rows.length === 0) return [];
  const uploaderIds = Array.from(new Set(rows.map((r) => r.uploaded_by)));
  const namesResult = await getUsersDisplayInfoAction({ userIds: uploaderIds });
  const names = namesResult.ok ? namesResult.data : {};
  return rows.map((row) => ({
    id: row.id,
    name: row.file_name,
    type: row.file_type,
    size: `${row.size_kb} KB`,
    uploadedBy: names[row.uploaded_by]?.fullName ?? "—",
    date: new Date(row.uploaded_at).toLocaleDateString("ar-SA"),
  }));
}

export async function deleteSpecialistAttachment(attachmentId: string): Promise<void> {
  unwrap(await deleteAttachmentAction({ attachmentId }));
}

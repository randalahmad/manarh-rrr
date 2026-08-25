/**
 * Client-side data layer for the Innovation Specialist Notifications page
 * (`app/innovation-specialist/(dashboard)/notifications/notifications-client.tsx`)
 * — Phase 6, Group F.
 *
 * The pre-existing Specialist notifications UI was entirely local mock
 * data with no relationship to the real backend at all — a different,
 * non-overlapping `type` vocabulary (ideas/evaluations/recommendations/
 * projects/system) from the real `entityType` (10 values), plus
 * `priority`/`actionRequired`/`related`/delete fields the real
 * `notifications` table has no equivalent for (approved Group F decision:
 * remove/simplify rather than invent).
 *
 * `bucket` below is a presentation-only grouping of the real, unaltered
 * `entity_type` into the pre-existing local vocabulary — never a new
 * status/field on the entity itself:
 *  - IDEA -> "ideas", EVALUATION -> "evaluations", DECISION ->
 *    "recommendations" (a decision is the recommendation-adjacent
 *    workflow step from the Specialist's perspective), PROJECT/TASK ->
 *    "projects".
 *  - USER/ORGANIZATION/CHALLENGE/OPPORTUNITY/IMPACT collapse into
 *    "system" — the Specialist interface has no dedicated view for any of
 *    these, mirroring the old mock's own "system" catch-all.
 *
 * `href` is derived from the real trigger points in
 * lib/server/services/{evaluator-assignments,decisions,tasks}.ts
 * (verified, not guessed): EVALUATION/DECISION notifications carry the
 * idea's id as entity_id, TASK notifications carry the project's id.
 * USER/ORGANIZATION/CHALLENGE/OPPORTUNITY/IMPACT have no Specialist-side
 * detail route, so they link back to the notifications page itself.
 */
import {
  listMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/server/actions/notifications";
import type { NotificationRow } from "@/lib/server/services/notifications";
import type { NotificationEntityType } from "@/lib/types";
import type { ActionResult } from "@/lib/server/errors";

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}

export type SpecialistNotificationBucket = "ideas" | "evaluations" | "recommendations" | "projects" | "system";

export interface SpecialistNotificationView {
  id: string;
  title: string;
  message: string;
  bucket: SpecialistNotificationBucket;
  isRead: boolean;
  createdAt: string;
  href: string;
}

const BUCKET_BY_ENTITY_TYPE: Record<NotificationEntityType, SpecialistNotificationBucket> = {
  IDEA: "ideas",
  EVALUATION: "evaluations",
  DECISION: "recommendations",
  PROJECT: "projects",
  TASK: "projects",
  USER: "system",
  ORGANIZATION: "system",
  CHALLENGE: "system",
  OPPORTUNITY: "system",
  IMPACT: "system",
};

function hrefFor(row: NotificationRow): string {
  switch (row.entity_type) {
    case "IDEA":
    case "EVALUATION":
    case "DECISION":
      return `/innovation-specialist/ideas/${row.entity_id}`;
    case "PROJECT":
    case "TASK":
      return `/innovation-specialist/projects/${row.entity_id}`;
    default:
      return `/innovation-specialist/notifications`;
  }
}

function mapNotificationRow(row: NotificationRow): SpecialistNotificationView {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    bucket: BUCKET_BY_ENTITY_TYPE[row.entity_type],
    isRead: row.is_read,
    createdAt: row.created_at,
    href: hrefFor(row),
  };
}

export async function fetchSpecialistNotifications(organizationId: string): Promise<SpecialistNotificationView[]> {
  const rows = unwrap(await listMyNotificationsAction({ organizationId }));
  return rows.map(mapNotificationRow);
}

export async function markSpecialistNotificationRead(notificationId: string): Promise<void> {
  unwrap(await markNotificationReadAction({ notificationId }));
}

export async function markAllSpecialistNotificationsRead(organizationId: string): Promise<number> {
  const { updatedCount } = unwrap(await markAllNotificationsReadAction({ organizationId }));
  return updatedCount;
}

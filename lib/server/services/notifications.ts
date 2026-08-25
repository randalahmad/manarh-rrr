/**
 * Notifications domain service.
 *
 * `createNotificationStatement` is used by OTHER services (evaluator
 * assignment, decisions, project status changes) to fire a notification
 * as part of the SAME transaction as the action that triggers it — copied
 * from the exact trigger points already implemented in lib/store.tsx's
 * `notify()` call sites (assignEvaluator, makeDecision, convertToProject,
 * updateProjectStatus, addProjectTask, addRisk, addUser, resendInvitation).
 * No new trigger points are invented beyond that list.
 */
import { query, queryOne } from "@/lib/server/db";
import { requireOrgMembership } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/rbac/permissions";
import type { NotificationEntityType } from "@/lib/types";

export interface NotificationRow {
  id: string;
  organization_id: string;
  recipient_id: string;
  title: string;
  message: string;
  entity_type: NotificationEntityType;
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

export function createNotificationStatement(input: {
  organizationId: string;
  recipientId: string;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
}): { sql: string; params: unknown[] } {
  return {
    sql: `
      INSERT INTO notifications (organization_id, recipient_id, title, message, entity_type, entity_id)
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
    params: [
      input.organizationId,
      input.recipientId,
      input.title,
      input.message,
      input.entityType,
      input.entityId,
    ],
  };
}

export async function listMyNotifications(
  actor: Actor,
  organizationId: string,
  onlyUnread = false
): Promise<NotificationRow[]> {
  requireOrgMembership(actor, organizationId);
  const conditions = ["organization_id = $1", "recipient_id = $2"];
  const params: unknown[] = [organizationId, actor.userId];
  if (onlyUnread) conditions.push("is_read = false");
  return query<NotificationRow>(
    `SELECT * FROM notifications WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
}

/** A notification may only be marked read by its own recipient. */
export async function markNotificationRead(actor: Actor, notificationId: string): Promise<NotificationRow> {
  const notif = await queryOne<NotificationRow>(`SELECT * FROM notifications WHERE id = $1`, [notificationId]);
  if (!notif) throw new NotFoundError("Notification", notificationId);
  if (notif.recipient_id !== actor.userId) {
    throw new ForbiddenError("You can only mark your own notifications as read.");
  }
  const updated = await queryOne<NotificationRow>(
    `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
    [notificationId]
  );
  if (!updated) throw new NotFoundError("Notification", notificationId);
  return updated;
}

/**
 * Phase 6, Group F addition — the mock's `markAllNotificationsRead` had no
 * real backend equivalent (genuinely missing capability, not just a
 * missing wrapper). Scoped identically to `listMyNotifications`: only the
 * authenticated actor's own unread notifications within this organization
 * are updated — never another recipient's rows. Returns the count updated
 * so the caller can report it without a second read.
 */
export async function markAllNotificationsRead(actor: Actor, organizationId: string): Promise<number> {
  requireOrgMembership(actor, organizationId);
  const updated = await query<{ id: string }>(
    `UPDATE notifications SET is_read = true
     WHERE organization_id = $1 AND recipient_id = $2 AND is_read = false
     RETURNING id`,
    [organizationId, actor.userId]
  );
  return updated.length;
}

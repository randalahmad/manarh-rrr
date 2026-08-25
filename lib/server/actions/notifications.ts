"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  markNotificationReadSchema,
  listMyNotificationsSchema,
  markAllNotificationsReadSchema,
} from "@/lib/server/validation/schemas";
import {
  markNotificationRead,
  listMyNotifications,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/server/services/notifications";

export async function markNotificationReadAction(input: unknown): Promise<ActionResult<NotificationRow>> {
  return runAction(async () => {
    const parsed = markNotificationReadSchema.parse(input);
    const actor = await requireActiveUser();
    return markNotificationRead(actor, parsed.notificationId);
  });
}

export async function listMyNotificationsAction(input: unknown): Promise<ActionResult<NotificationRow[]>> {
  return runAction(async () => {
    const parsed = listMyNotificationsSchema.parse(input);
    const actor = await requireActiveUser();
    return listMyNotifications(actor, parsed.organizationId, parsed.onlyUnread ?? false);
  });
}

export async function markAllNotificationsReadAction(input: unknown): Promise<ActionResult<{ updatedCount: number }>> {
  return runAction(async () => {
    const parsed = markAllNotificationsReadSchema.parse(input);
    const actor = await requireActiveUser();
    const updatedCount = await markAllNotificationsRead(actor, parsed.organizationId);
    return { updatedCount };
  });
}

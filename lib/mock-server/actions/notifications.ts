"use server";
import { ok } from "@/lib/mock-server/result";
import { notificationRows } from "@/lib/mock-server/fixtures";

export async function markNotificationReadAction(input: unknown) {
  const { notificationId, id } = (input ?? {}) as { notificationId?: string; id?: string };
  const found = notificationRows.find((n) => n.id === (notificationId ?? id)) ?? notificationRows[0];
  return ok({ ...found, is_read: true });
}

export async function listMyNotificationsAction(_input: unknown) {
  return ok(notificationRows);
}

export async function markAllNotificationsReadAction(_input: unknown) {
  return ok({ updatedCount: notificationRows.filter((n) => !n.is_read).length });
}

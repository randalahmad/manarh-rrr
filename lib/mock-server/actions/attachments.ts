"use server";
import { ok } from "@/lib/mock-server/result";
import { attachmentRows } from "@/lib/mock-server/fixtures";

export async function createAttachmentAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...attachmentRows[0], ...i, id: `att-mock-${Date.now()}` });
}

export async function deleteAttachmentAction(_input: unknown) {
  return ok(null);
}

export async function listAttachmentsForEntityAction(input: unknown) {
  const { entityId } = (input ?? {}) as { entityId?: string };
  return ok(attachmentRows.filter((a) => !entityId || a.entity_id === entityId));
}

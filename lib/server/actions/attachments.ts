"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import {
  createAttachmentSchema,
  deleteAttachmentSchema,
  listAttachmentsForEntitySchema,
} from "@/lib/server/validation/schemas";
import {
  createAttachment,
  deleteAttachment,
  listAttachmentsForEntity,
  type AttachmentRow,
} from "@/lib/server/services/attachments";
import type { AttachmentEntityType } from "@/lib/server/services/entity-resolver";

export async function createAttachmentAction(input: unknown): Promise<ActionResult<AttachmentRow>> {
  return runAction(async () => {
    const parsed = createAttachmentSchema.parse(input);
    const actor = await requireActiveUser();
    return createAttachment(actor, parsed);
  });
}

export async function deleteAttachmentAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(async () => {
    const parsed = deleteAttachmentSchema.parse(input);
    const actor = await requireActiveUser();
    await deleteAttachment(actor, parsed.attachmentId);
    return null;
  });
}

/** Phase 6, Group E addition — Phase 5 built listAttachmentsForEntity as a service only; no UI consumed it yet. */
export async function listAttachmentsForEntityAction(input: unknown): Promise<ActionResult<AttachmentRow[]>> {
  return runAction(async () => {
    const parsed = listAttachmentsForEntitySchema.parse(input);
    const actor = await requireActiveUser();
    return listAttachmentsForEntity(actor, parsed.entityType as AttachmentEntityType, parsed.entityId);
  });
}

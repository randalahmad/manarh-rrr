"use server";

import { runAction, type ActionResult } from "@/lib/server/errors";
import { requireActiveUser } from "@/lib/server/auth/guards";
import { addCommentSchema, updateCommentSchema, listCommentsSchema } from "@/lib/server/validation/schemas";
import {
  addComment,
  updateComment,
  listCommentsForEntity,
  type CommentRow,
} from "@/lib/server/services/comments";
import type { CommentEntityType } from "@/lib/server/services/entity-resolver";

export async function addCommentAction(input: unknown): Promise<ActionResult<CommentRow>> {
  return runAction(async () => {
    const parsed = addCommentSchema.parse(input);
    if (parsed.entityType === "TASK" || parsed.entityType === "IDEA" || parsed.entityType === "PROJECT" ||
        parsed.entityType === "CHALLENGE" || parsed.entityType === "OPPORTUNITY") {
      const actor = await requireActiveUser();
      return addComment(actor, {
        entityType: parsed.entityType as CommentEntityType,
        entityId: parsed.entityId,
        content: parsed.content,
      });
    }
    throw new Error("Unsupported comment entity type.");
  });
}

export async function updateCommentAction(input: unknown): Promise<ActionResult<CommentRow>> {
  return runAction(async () => {
    const parsed = updateCommentSchema.parse(input);
    const actor = await requireActiveUser();
    return updateComment(actor, parsed.commentId, parsed.content);
  });
}

/** Phase 6, Group B addition — needed to render existing comments on the idea details page (Org Admin). */
export async function listCommentsForEntityAction(input: unknown): Promise<ActionResult<CommentRow[]>> {
  return runAction(async () => {
    const parsed = listCommentsSchema.parse(input);
    if (parsed.entityType === "TASK" || parsed.entityType === "IDEA" || parsed.entityType === "PROJECT" ||
        parsed.entityType === "CHALLENGE" || parsed.entityType === "OPPORTUNITY") {
      const actor = await requireActiveUser();
      return listCommentsForEntity(actor, parsed.entityType as CommentEntityType, parsed.entityId);
    }
    throw new Error("Unsupported comment entity type.");
  });
}

"use server";
import { ok } from "@/lib/mock-server/result";
import { commentRows } from "@/lib/mock-server/fixtures";

export async function addCommentAction(input: unknown) {
  const i = (input ?? {}) as Record<string, unknown>;
  return ok({ ...commentRows[0], ...i, id: `cm-mock-${Date.now()}` });
}

export async function updateCommentAction(input: unknown) {
  const { commentId, id, ...rest } = (input ?? {}) as Record<string, unknown> & { commentId?: string; id?: string };
  const found = commentRows.find((c) => c.id === (commentId ?? id)) ?? commentRows[0];
  return ok({ ...found, ...rest });
}

export async function listCommentsForEntityAction(input: unknown) {
  const { entityId } = (input ?? {}) as { entityId?: string };
  return ok(commentRows.filter((c) => !entityId || c.entity_id === entityId));
}

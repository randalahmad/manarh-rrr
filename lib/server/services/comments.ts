/**
 * Comments domain service — generic, polymorphic across IDEA / PROJECT /
 * CHALLENGE / OPPORTUNITY / TASK (comment_entity_type enum).
 *
 * Authorization (approved Phase 5 decision — the mock has NO permission
 * check at all on its one live comment call site, see Phase 5 research
 * notes): creating a comment requires VIEW permission on the underlying
 * entity, resolved via lib/server/services/entity-resolver.ts. This is
 * necessarily a per-entity-type check rather than a single COMMENT:CREATE
 * permission, since no such area exists in the approved catalog and the
 * user chose "require VIEW on the underlying entity" over inventing one.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership, requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { resolveCommentTarget, type CommentEntityType } from "@/lib/server/services/entity-resolver";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface CommentRow {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface AddCommentInput {
  entityType: CommentEntityType;
  entityId: string;
  content: string;
}

export async function addComment(actor: Actor, input: AddCommentInput): Promise<CommentRow> {
  const target = await resolveCommentTarget(input.entityType, input.entityId);
  requirePermission(actor, target.organizationId, target.viewArea, "VIEW");

  const [rows] = await transaction<[CommentRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO comments (entity_type, entity_id, author_id, content)
        VALUES ($1,$2,$3,$4)
        RETURNING *
      `,
      params: [input.entityType, input.entityId, actor.userId, input.content],
    },
    auditLogStatement({
      organizationId: target.organizationId,
      actor,
      action: "Comment Added",
      actionAr: "إضافة تعليق",
      entityType: input.entityType,
      entityId: input.entityId,
      permissionSnapshot: `${target.viewArea}:VIEW`,
    }),
  ]);

  const comment = rows[0];
  if (!comment) throw new NotFoundError("Comment target", input.entityId);
  return comment;
}

export async function listCommentsForEntity(
  actor: Actor,
  entityType: CommentEntityType,
  entityId: string
): Promise<CommentRow[]> {
  const target = await resolveCommentTarget(entityType, entityId);
  requirePermission(actor, target.organizationId, target.viewArea, "VIEW");
  return query<CommentRow>(
    `SELECT * FROM comments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at ASC`,
    [entityType, entityId]
  );
}

/** Only the comment's own author may edit its content. */
export async function updateComment(actor: Actor, commentId: string, content: string): Promise<CommentRow> {
  const comment = await queryOne<CommentRow>(`SELECT * FROM comments WHERE id = $1`, [commentId]);
  if (!comment) throw new NotFoundError("Comment", commentId);
  const target = await resolveCommentTarget(comment.entity_type, comment.entity_id);
  requireOrgMembership(actor, target.organizationId);
  if (comment.author_id !== actor.userId) {
    throw new ForbiddenError("You can only edit your own comments.");
  }

  const updated = await queryOne<CommentRow>(
    `UPDATE comments SET content = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [content, commentId]
  );
  if (!updated) throw new NotFoundError("Comment", commentId);
  return updated;
}

/**
 * Attachments domain service — metadata-only, per the approved attachment
 * abstraction (db/migrations/0003_innovation_intake.sql:161-176): no file
 * bytes in Postgres, no permanent public URL stored, just object-storage
 * pointers (provider/bucket/key). Actual upload/download goes through the
 * storage provider directly (pre-signed URLs, generated on demand — not
 * implemented in Phase 5, which is backend-only and not wiring storage
 * infrastructure; `getDownloadRef` below is the seam a later phase fills
 * in with a real signed-URL call).
 *
 * Authorization mirrors comments.ts: creating an attachment requires VIEW
 * permission on the underlying entity (approved Phase 5 decision), resolved
 * via lib/server/services/entity-resolver.ts.
 */
import { query, queryOne, transaction } from "@/lib/server/db";
import { requireOrgMembership, requirePermission } from "@/lib/server/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/server/errors";
import { auditLogStatement } from "@/lib/server/audit";
import { resolveAttachmentTarget, type AttachmentEntityType } from "@/lib/server/services/entity-resolver";
import type { Actor } from "@/lib/server/rbac/permissions";

export interface AttachmentRow {
  id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_name: string;
  file_type: string;
  size_kb: number;
  storage_provider: string;
  storage_bucket: string;
  storage_key: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface CreateAttachmentInput {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  fileType: string;
  sizeKb: number;
  storageBucket: string;
  storageKey: string;
  storageProvider?: string;
}

/**
 * Records metadata for a file the caller has ALREADY uploaded directly to
 * object storage (client obtains a pre-signed upload URL out-of-band; this
 * call just persists the pointer). Never accepts raw bytes.
 */
export async function createAttachment(actor: Actor, input: CreateAttachmentInput): Promise<AttachmentRow> {
  const target = await resolveAttachmentTarget(input.entityType, input.entityId);
  requirePermission(actor, target.organizationId, target.viewArea, "VIEW");

  const [rows] = await transaction<[AttachmentRow[], unknown[]]>([
    {
      sql: `
        INSERT INTO attachments (
          entity_type, entity_id, file_name, file_type, size_kb,
          storage_provider, storage_bucket, storage_key, uploaded_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `,
      params: [
        input.entityType,
        input.entityId,
        input.fileName,
        input.fileType,
        input.sizeKb,
        input.storageProvider ?? "s3",
        input.storageBucket,
        input.storageKey,
        actor.userId,
      ],
    },
    auditLogStatement({
      organizationId: target.organizationId,
      actor,
      action: "Attachment Added",
      actionAr: "إضافة مرفق",
      entityType: input.entityType,
      entityId: input.entityId,
      permissionSnapshot: `${target.viewArea}:VIEW`,
    }),
  ]);

  const attachment = rows[0];
  if (!attachment) throw new NotFoundError("Attachment target", input.entityId);
  return attachment;
}

export async function listAttachmentsForEntity(
  actor: Actor,
  entityType: AttachmentEntityType,
  entityId: string
): Promise<AttachmentRow[]> {
  const target = await resolveAttachmentTarget(entityType, entityId);
  requirePermission(actor, target.organizationId, target.viewArea, "VIEW");
  return query<AttachmentRow>(
    `SELECT * FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY uploaded_at DESC`,
    [entityType, entityId]
  );
}

/**
 * Deletion: only the uploader or an org admin may remove an attachment's
 * metadata row. (No existing rule in the mock defines this either — there
 * is no delete affordance at all in the mock's UI — but unlike create/view
 * this doesn't need a new permission decision: it's the same
 * "own-resource-or-admin" shape already used elsewhere, e.g. comments, and
 * is the minimum needed so `DELETE` isn't left completely unauthorized.)
 */
export async function deleteAttachment(actor: Actor, attachmentId: string): Promise<void> {
  const attachment = await queryOne<AttachmentRow>(`SELECT * FROM attachments WHERE id = $1`, [attachmentId]);
  if (!attachment) throw new NotFoundError("Attachment", attachmentId);
  const target = await resolveAttachmentTarget(attachment.entity_type, attachment.entity_id);
  const membership = requireOrgMembership(actor, target.organizationId);

  if (attachment.uploaded_by !== actor.userId && membership.role !== "ORG_ADMIN") {
    throw new ForbiddenError("You can only remove your own attachments.");
  }

  await transaction([
    { sql: `DELETE FROM attachments WHERE id = $1`, params: [attachmentId] },
    auditLogStatement({
      organizationId: target.organizationId,
      actor,
      action: "Attachment Removed",
      actionAr: "حذف مرفق",
      entityType: attachment.entity_type,
      entityId: attachment.entity_id,
    }),
  ]);
}

/**
 * Resolves a polymorphic (entityType, entityId) pair — as used by the
 * `comments` and `attachments` tables (both intentionally have NO DB-level
 * FK to their target; integrity is enforced in the service layer per the
 * approved architecture, see db/migrations/0003_innovation_intake.sql:148
 * and :161) — to the target row's organization and the permission area
 * that gates viewing it.
 *
 * Approved Phase 5 decision (comments/attachments authorization): creating
 * a comment or attachment on an entity requires VIEW permission on that
 * underlying entity (e.g. IDEA:VIEW to comment on an idea). This module is
 * the single place that maps an entity type to "which table has its
 * organization_id, and which permission area governs viewing it" so both
 * services apply the same rule instead of duplicating per-type logic.
 */
import { queryOne } from "@/lib/server/db";
import { NotFoundError } from "@/lib/server/errors";
import type { PermissionArea } from "@/lib/server/rbac/permissions";

export interface ResolvedEntity {
  organizationId: string;
  /** The permission area whose VIEW action gates access to this entity. */
  viewArea: PermissionArea;
}

/** Entity types the `comments` table accepts (comment_entity_type enum). */
export type CommentEntityType = "IDEA" | "PROJECT" | "CHALLENGE" | "OPPORTUNITY" | "TASK";

/** Entity types the `attachments` table accepts (see migration 0003 comment on the column). */
export type AttachmentEntityType =
  | "IDEA"
  | "PROJECT"
  | "EVALUATION"
  | "PROJECT_DOCUMENT"
  | "INFORMATION_REQUEST"
  | "COMMENT";

async function resolveIdea(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM ideas WHERE id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Idea", entityId);
  return { organizationId: row.organization_id, viewArea: "IDEA" };
}

async function resolveProject(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM projects WHERE id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Project", entityId);
  return { organizationId: row.organization_id, viewArea: "PROJECT" };
}

async function resolveChallenge(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM innovation_challenges WHERE id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Challenge", entityId);
  return { organizationId: row.organization_id, viewArea: "CHALLENGE" };
}

async function resolveOpportunity(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM innovation_opportunities WHERE id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Opportunity", entityId);
  return { organizationId: row.organization_id, viewArea: "OPPORTUNITY" };
}

async function resolveTask(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT p.organization_id AS organization_id
     FROM project_tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Task", entityId);
  return { organizationId: row.organization_id, viewArea: "TASK" };
}

async function resolveEvaluation(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT i.organization_id AS organization_id
     FROM evaluations e JOIN ideas i ON i.id = e.idea_id
     WHERE e.id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Evaluation", entityId);
  return { organizationId: row.organization_id, viewArea: "EVALUATION" };
}

async function resolveInformationRequest(entityId: string): Promise<ResolvedEntity> {
  const row = await queryOne<{ organization_id: string }>(
    `SELECT i.organization_id AS organization_id
     FROM information_requests ir JOIN ideas i ON i.id = ir.idea_id
     WHERE ir.id = $1`,
    [entityId]
  );
  if (!row) throw new NotFoundError("Information request", entityId);
  // No dedicated INFORMATION_REQUEST permission area exists in the catalog;
  // it's part of the idea's own information-exchange flow, so IDEA:VIEW gates it.
  return { organizationId: row.organization_id, viewArea: "IDEA" };
}

/**
 * Comments only ever target IDEA/PROJECT/CHALLENGE/OPPORTUNITY/TASK
 * directly (comment_entity_type enum) — never another comment.
 */
export async function resolveCommentTarget(
  entityType: CommentEntityType,
  entityId: string
): Promise<ResolvedEntity> {
  switch (entityType) {
    case "IDEA":
      return resolveIdea(entityId);
    case "PROJECT":
      return resolveProject(entityId);
    case "CHALLENGE":
      return resolveChallenge(entityId);
    case "OPPORTUNITY":
      return resolveOpportunity(entityId);
    case "TASK":
      return resolveTask(entityId);
  }
}

/**
 * Attachments can additionally target EVALUATION, PROJECT_DOCUMENT
 * (treated as an alias for PROJECT — no separate `project_documents` table
 * exists in the approved schema; migration 0003's own column comment lists
 * it only as a value of the polymorphic entity_type, not a distinct table),
 * INFORMATION_REQUEST, or COMMENT (resolved one level deeper, since a
 * comment itself always targets one of the five base entity types above —
 * comments never nest).
 */
export async function resolveAttachmentTarget(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<ResolvedEntity> {
  switch (entityType) {
    case "IDEA":
      return resolveIdea(entityId);
    case "PROJECT":
    case "PROJECT_DOCUMENT":
      return resolveProject(entityId);
    case "EVALUATION":
      return resolveEvaluation(entityId);
    case "INFORMATION_REQUEST":
      return resolveInformationRequest(entityId);
    case "COMMENT": {
      const comment = await queryOne<{ entity_type: CommentEntityType; entity_id: string }>(
        `SELECT entity_type, entity_id FROM comments WHERE id = $1`,
        [entityId]
      );
      if (!comment) throw new NotFoundError("Comment", entityId);
      return resolveCommentTarget(comment.entity_type, comment.entity_id);
    }
  }
}
